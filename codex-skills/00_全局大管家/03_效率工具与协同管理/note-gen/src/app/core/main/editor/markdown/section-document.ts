import MarkdownIt from 'markdown-it'

export const DEFAULT_SECTION_TARGET_CHARACTERS = 24_000
export const DEFAULT_SECTION_MAX_CHARACTERS = 64_000

export type MarkdownSectionKind = 'frontmatter' | 'preamble' | 'heading' | 'block'

export interface MarkdownSectionHeading {
  level: 1 | 2
  text: string
  ancestorPath: string[]
  /** UTF-16 offset relative to the start of the section. */
  offset: number
}

export interface MarkdownSection {
  id: string
  kind: MarkdownSectionKind
  /** Half-open UTF-16 range in MarkdownSectionDocument.source. */
  from: number
  to: number
  heading?: MarkdownSectionHeading
  contentHash: string
  fingerprint: string
  /** True when a single indivisible Markdown block exceeds maxSectionCharacters. */
  oversized: boolean
}

export interface MarkdownSectionDocument {
  source: string
  sections: MarkdownSection[]
  targetSectionCharacters?: number
  maxSectionCharacters?: number
}

export interface MarkdownSectionChange {
  /** Half-open range in the previous document. */
  from: number
  to: number
  insertedLength: number
}

export interface ReplaceMarkdownSectionSourceResult {
  document: MarkdownSectionDocument
  change: MarkdownSectionChange
}

export interface MarkdownSectionReconcileOptions {
  /** Preserve this section ID for the section containing anchorOffset when possible. */
  activeSectionId?: string
  /** UTF-16 offset in the new document. */
  anchorOffset?: number
  /** Optional single source replacement used to map old ranges onto the new source. */
  change?: MarkdownSectionChange
}

export interface SplitMarkdownDocumentOptions {
  targetSectionCharacters?: number
  maxSectionCharacters?: number
  previousDocument?: MarkdownSectionDocument
  reconcile?: MarkdownSectionReconcileOptions
}

interface SourceRange {
  from: number
  to: number
}

interface HeadingBoundary extends SourceRange {
  level: 1 | 2
  text: string
  ancestorPath: string[]
}

interface SectionDraft {
  kind: MarkdownSectionKind
  from: number
  to: number
  heading?: MarkdownSectionHeading
  contentHash: string
  fingerprint: string
  oversized: boolean
}

interface PrimarySpan {
  kind: MarkdownSectionKind
  from: number
  to: number
  heading?: Omit<MarkdownSectionHeading, 'offset'> & { sourceFrom: number }
}

const blockParser = new MarkdownIt({
  html: true,
  linkify: false,
  typographer: false,
})

/**
 * Splits Markdown without changing a single source character. H1/H2 headings are
 * preferred boundaries. Oversized chapters are split only at complete top-level
 * block boundaries reported by markdown-it. Fenced code, HTML blocks, lists,
 * tables, and block quotes therefore remain indivisible. Frontmatter and block
 * math are additionally protected because the base markdown-it parser does not
 * model them as opaque blocks.
 */
export function splitMarkdownDocument(
  source: string,
  options: SplitMarkdownDocumentOptions = {},
): MarkdownSectionDocument {
  const targetSectionCharacters = normalizePositiveInteger(
    options.targetSectionCharacters,
    DEFAULT_SECTION_TARGET_CHARACTERS,
  )
  const maxSectionCharacters = Math.max(
    targetSectionCharacters,
    normalizePositiveInteger(
      options.maxSectionCharacters,
      DEFAULT_SECTION_MAX_CHARACTERS,
    ),
  )

  const lineStarts = buildLineStarts(source)
  const frontmatter = findFrontmatterRange(source, lineStarts)
  const mathRanges = findBlockMathRanges(source, lineStarts, frontmatter)
  const protectedRanges = mergeOverlappingRanges([
    ...(frontmatter ? [frontmatter] : []),
    ...mathRanges,
  ])
  const { atomicRanges, headings } = parseTopLevelStructure(
    source,
    lineStarts,
    protectedRanges,
  )

  const primarySpans = buildPrimarySpans(source, frontmatter, headings)
  const safeBoundaries = uniqueSortedNumbers(
    mergeOverlappingRanges([...atomicRanges, ...protectedRanges])
      .map(range => range.from),
  )

  const drafts = primarySpans.flatMap(span => {
    if (span.kind === 'frontmatter') {
      return [createSectionDraft(source, span, maxSectionCharacters)]
    }

    return splitPrimarySpan(
      source,
      span,
      safeBoundaries,
      targetSectionCharacters,
      maxSectionCharacters,
    )
  })

  if (drafts.length === 0) {
    drafts.push(createSectionDraft(source, {
      kind: 'preamble',
      from: 0,
      to: 0,
    }, maxSectionCharacters))
  }

  const sections = reconcileSectionIds(
    source,
    drafts,
    options.previousDocument,
    options.reconcile,
  )

  return {
    source,
    sections,
    targetSectionCharacters,
    maxSectionCharacters,
  }
}

/** Returns the exact source slice owned by a section. */
export function getMarkdownSectionSource(
  document: MarkdownSectionDocument,
  section: MarkdownSection,
): string {
  return document.source.slice(section.from, section.to)
}

/**
 * Replaces one section without reparsing or resegmenting the complete document.
 * The edited section keeps its stable ID, later source ranges are shifted by the
 * exact length delta, and only the edited section's content metadata is rebuilt.
 * Structural metadata (kind/heading) intentionally remains unchanged until a
 * background splitMarkdownDocument reconciliation installs fresh boundaries.
 */
export function replaceMarkdownSectionSource(
  document: MarkdownSectionDocument,
  sectionId: string,
  markdown: string,
): ReplaceMarkdownSectionSourceResult {
  const sectionIndex = document.sections.findIndex(section => section.id === sectionId)
  if (sectionIndex < 0) {
    throw new Error(`Unknown Markdown section: ${sectionId}`)
  }

  const section = document.sections[sectionIndex]
  const change: MarkdownSectionChange = {
    from: section.from,
    to: section.to,
    insertedLength: markdown.length,
  }
  const previousMarkdown = document.source.slice(section.from, section.to)
  if (previousMarkdown === markdown) {
    return { document, change }
  }

  const nextSource = document.source.slice(0, section.from)
    + markdown
    + document.source.slice(section.to)
  const nextSectionTo = section.from + markdown.length
  const delta = nextSectionTo - section.to
  const maxSectionCharacters = document.maxSectionCharacters
    ?? DEFAULT_SECTION_MAX_CHARACTERS
  const nextHeading = section.heading
    ? {
        ...section.heading,
        offset: Math.min(section.heading.offset, markdown.length),
      }
    : undefined
  const fingerprintSpan: PrimarySpan = {
    kind: section.kind,
    from: section.from,
    to: nextSectionTo,
    heading: nextHeading
      ? {
          level: nextHeading.level,
          text: nextHeading.text,
          ancestorPath: nextHeading.ancestorPath,
          sourceFrom: section.from + nextHeading.offset,
        }
      : undefined,
  }
  const contentHash = hashSourceRange(nextSource, section.from, nextSectionTo)
  const fingerprint = createSectionFingerprint(nextSource, fingerprintSpan, contentHash)

  const sections = document.sections.map((currentSection, index): MarkdownSection => {
    if (index < sectionIndex) return currentSection
    if (index > sectionIndex) {
      return {
        ...currentSection,
        from: currentSection.from + delta,
        to: currentSection.to + delta,
      }
    }

    return {
      ...currentSection,
      to: nextSectionTo,
      heading: nextHeading,
      contentHash,
      fingerprint,
      oversized: markdown.length > maxSectionCharacters,
    }
  })

  return {
    document: {
      ...document,
      source: nextSource,
      sections,
    },
    change,
  }
}

/**
 * Reassembles sections in their current order. For an untouched result from
 * splitMarkdownDocument this is byte-for-byte (and code-unit-for-code-unit)
 * identical to document.source.
 */
export function joinMarkdownSections(document: MarkdownSectionDocument): string {
  return document.sections
    .map(section => getMarkdownSectionSource(document, section))
    .join('')
}

/** Finds the section owning an offset. A document-end offset belongs to the last section. */
export function findMarkdownSectionAtOffset(
  document: MarkdownSectionDocument,
  offset: number,
): MarkdownSection | null {
  const { sections, source } = document
  if (sections.length === 0) return null

  const target = Math.max(0, Math.min(offset, source.length))
  let low = 0
  let high = sections.length - 1

  while (low <= high) {
    const middle = Math.floor((low + high) / 2)
    const section = sections[middle]

    if (target < section.from) {
      high = middle - 1
    } else if (target >= section.to && middle < sections.length - 1) {
      low = middle + 1
    } else {
      return section
    }
  }

  return sections[sections.length - 1]
}

function parseTopLevelStructure(
  source: string,
  lineStarts: readonly number[],
  protectedRanges: readonly SourceRange[],
): { atomicRanges: SourceRange[]; headings: HeadingBoundary[] } {
  const tokens = blockParser.parse(source, {})
  const atomicRanges: SourceRange[] = []
  const headings: HeadingBoundary[] = []
  let currentH1 = ''

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index]
    const lineRange = token.map
    if (token.level !== 0 || !lineRange || lineRange.length < 2) continue

    const range = {
      from: getLineOffset(lineStarts, lineRange[0], source.length),
      to: getLineOffset(lineStarts, lineRange[1], source.length),
    }

    if (range.to <= range.from) continue
    atomicRanges.push(range)

    if (token.type !== 'heading_open' || (token.tag !== 'h1' && token.tag !== 'h2')) {
      continue
    }

    if (isOffsetProtected(range.from, protectedRanges)) continue

    const level = token.tag === 'h1' ? 1 : 2
    const inlineToken = tokens[index + 1]
    const text = inlineToken?.type === 'inline'
      ? inlineToken.content.trim()
      : ''
    const ancestorPath = level === 2 && currentH1 ? [currentH1] : []

    headings.push({ ...range, level, text, ancestorPath })
    if (level === 1) currentH1 = text
  }

  return {
    atomicRanges: mergeOverlappingRanges(atomicRanges),
    headings,
  }
}

function buildPrimarySpans(
  source: string,
  frontmatter: SourceRange | null,
  headings: readonly HeadingBoundary[],
): PrimarySpan[] {
  const spans: PrimarySpan[] = []
  let contentFrom = frontmatter?.to ?? 0
  const contentHeadings = headings.filter(heading => heading.from >= contentFrom)
  const firstHeading = contentHeadings[0]

  if (frontmatter) {
    const canOwnFollowingWhitespace = !firstHeading
      ? source.slice(contentFrom).trim().length === 0
      : source.slice(contentFrom, firstHeading.from).trim().length === 0
    const frontmatterTo = canOwnFollowingWhitespace
      ? firstHeading?.from ?? source.length
      : frontmatter.to

    spans.push({
      kind: 'frontmatter',
      from: 0,
      to: frontmatterTo,
    })
    contentFrom = frontmatterTo
  }

  if (contentHeadings.length === 0) {
    if (contentFrom < source.length || spans.length === 0) {
      spans.push({
        kind: 'preamble',
        from: contentFrom,
        to: source.length,
      })
    }
    return spans
  }

  const firstHeadingFrom = contentHeadings[0].from
  let firstHeadingSectionFrom = firstHeadingFrom
  if (contentFrom < firstHeadingFrom) {
    const prefix = source.slice(contentFrom, firstHeadingFrom)
    if (prefix.trim().length === 0 && spans.length === 0) {
      firstHeadingSectionFrom = contentFrom
    } else if (prefix.length > 0) {
      spans.push({
        kind: 'preamble',
        from: contentFrom,
        to: firstHeadingFrom,
      })
    }
  }

  for (let index = 0; index < contentHeadings.length; index++) {
    const heading = contentHeadings[index]
    const nextHeading = contentHeadings[index + 1]

    spans.push({
      kind: 'heading',
      from: index === 0 ? firstHeadingSectionFrom : heading.from,
      to: nextHeading?.from ?? source.length,
      heading: {
        level: heading.level,
        text: heading.text,
        ancestorPath: heading.ancestorPath,
        sourceFrom: heading.from,
      },
    })
  }

  return spans
}

function splitPrimarySpan(
  source: string,
  span: PrimarySpan,
  safeBoundaries: readonly number[],
  targetSectionCharacters: number,
  maxSectionCharacters: number,
): SectionDraft[] {
  if (span.to - span.from <= maxSectionCharacters) {
    return [createSectionDraft(source, span, maxSectionCharacters)]
  }

  const boundaries = safeBoundaries.filter(boundary => (
    boundary > span.from && boundary < span.to
  ))
  const drafts: SectionDraft[] = []
  let from = span.from
  let isFirstChunk = true

  while (from < span.to) {
    const remaining = span.to - from
    if (remaining <= maxSectionCharacters) {
      drafts.push(createSectionDraft(source, {
        ...span,
        kind: isFirstChunk ? span.kind : 'block',
        from,
        heading: isFirstChunk ? span.heading : undefined,
      }, maxSectionCharacters))
      break
    }

    const minimumUsefulSize = Math.max(1, Math.floor(targetSectionCharacters / 4))
    const afterMinimum = from + minimumUsefulSize
    const target = from + targetSectionCharacters
    const maximum = from + maxSectionCharacters
    const eligible = boundaries.filter(boundary => boundary >= afterMinimum)
    const nearTarget = eligible.find(boundary => boundary >= target && boundary <= maximum)
    const beforeMaximum = findLastNumberAtMost(eligible, maximum)
    // If one indivisible block is larger than the maximum, keep it whole and
    // mark the resulting section as oversized instead of corrupting Markdown.
    const afterMaximum = eligible.find(boundary => boundary > maximum)
    const to = nearTarget ?? beforeMaximum ?? afterMaximum ?? span.to

    if (to <= from || to >= span.to) {
      drafts.push(createSectionDraft(source, {
        ...span,
        kind: isFirstChunk ? span.kind : 'block',
        from,
        heading: isFirstChunk ? span.heading : undefined,
      }, maxSectionCharacters))
      break
    }

    drafts.push(createSectionDraft(source, {
      ...span,
      kind: isFirstChunk ? span.kind : 'block',
      from,
      to,
      heading: isFirstChunk ? span.heading : undefined,
    }, maxSectionCharacters))

    from = to
    isFirstChunk = false
  }

  return drafts
}

function createSectionDraft(
  source: string,
  span: PrimarySpan,
  maxSectionCharacters: number,
): SectionDraft {
  const contentHash = hashSourceRange(source, span.from, span.to)
  const heading = span.heading
    ? {
        level: span.heading.level,
        text: span.heading.text,
        ancestorPath: span.heading.ancestorPath,
        offset: Math.max(0, span.heading.sourceFrom - span.from),
      }
    : undefined
  const fingerprint = createSectionFingerprint(source, span, contentHash)

  return {
    kind: span.kind,
    from: span.from,
    to: span.to,
    heading,
    contentHash,
    fingerprint,
    oversized: span.to - span.from > maxSectionCharacters,
  }
}

function reconcileSectionIds(
  source: string,
  drafts: readonly SectionDraft[],
  previousDocument?: MarkdownSectionDocument,
  options: MarkdownSectionReconcileOptions = {},
): MarkdownSection[] {
  const previous = previousDocument?.sections ?? []
  const assignedIds = new Map<number, string>()
  const usedPreviousIndexes = new Set<number>()
  const usedIds = new Set<string>()

  const assign = (draftIndex: number, previousIndex: number): void => {
    if (assignedIds.has(draftIndex) || usedPreviousIndexes.has(previousIndex)) return
    const id = previous[previousIndex]?.id
    if (!id || usedIds.has(id)) return

    assignedIds.set(draftIndex, id)
    usedPreviousIndexes.add(previousIndex)
    usedIds.add(id)
  }

  if (
    options.activeSectionId
    && typeof options.anchorOffset === 'number'
    && previous.length > 0
  ) {
    const previousIndex = previous.findIndex(section => section.id === options.activeSectionId)
    const draftIndex = findRangeIndexAtOffset(drafts, options.anchorOffset, source.length)
    if (previousIndex >= 0 && draftIndex >= 0) assign(draftIndex, previousIndex)
  }

  assignByOrderedKey(previous, drafts, section => section.fingerprint, assign, usedPreviousIndexes, assignedIds)
  assignByOrderedKey(previous, drafts, getHeadingKey, assign, usedPreviousIndexes, assignedIds)

  for (let draftIndex = 0; draftIndex < drafts.length; draftIndex++) {
    if (assignedIds.has(draftIndex)) continue

    const draft = drafts[draftIndex]
    let bestPreviousIndex = -1
    let bestOverlap = 0

    for (let previousIndex = 0; previousIndex < previous.length; previousIndex++) {
      if (usedPreviousIndexes.has(previousIndex)) continue
      const mappedRange = mapPreviousRange(previous[previousIndex], options.change)
      const overlap = getRangeOverlap(draft, mappedRange)
      if (overlap > bestOverlap) {
        bestOverlap = overlap
        bestPreviousIndex = previousIndex
      }
    }

    if (bestPreviousIndex >= 0 && bestOverlap > 0) {
      assign(draftIndex, bestPreviousIndex)
    }
  }

  const unmatchedPrevious = previous
    .map((_, index) => index)
    .filter(index => !usedPreviousIndexes.has(index))
  const unmatchedDrafts = drafts
    .map((_, index) => index)
    .filter(index => !assignedIds.has(index))

  if (unmatchedPrevious.length === unmatchedDrafts.length) {
    for (let index = 0; index < unmatchedDrafts.length; index++) {
      assign(unmatchedDrafts[index], unmatchedPrevious[index])
    }
  }

  const reservedIds = new Set(previous.map(section => section.id))
  const generatedIdOccurrences = new Map<string, number>()

  return drafts.map((draft, index) => {
    let id = assignedIds.get(index)
    if (!id) {
      const base = `section-${draft.fingerprint}`
      let occurrence = generatedIdOccurrences.get(base) ?? 0
      do {
        occurrence++
        id = occurrence === 1 ? base : `${base}-${occurrence}`
      } while (usedIds.has(id) || reservedIds.has(id))
      generatedIdOccurrences.set(base, occurrence)
      usedIds.add(id)
    }

    return { ...draft, id }
  })
}

function assignByOrderedKey(
  previous: readonly MarkdownSection[],
  drafts: readonly SectionDraft[],
  getKey: (section: MarkdownSection | SectionDraft) => string,
  assign: (draftIndex: number, previousIndex: number) => void,
  usedPreviousIndexes: ReadonlySet<number>,
  assignedIds: ReadonlyMap<number, string>,
): void {
  const previousByKey = new Map<string, number[]>()
  for (let index = 0; index < previous.length; index++) {
    if (usedPreviousIndexes.has(index)) continue
    const key = getKey(previous[index])
    if (!key) continue
    const indexes = previousByKey.get(key) ?? []
    indexes.push(index)
    previousByKey.set(key, indexes)
  }

  const keyCursors = new Map<string, number>()
  for (let index = 0; index < drafts.length; index++) {
    if (assignedIds.has(index)) continue
    const key = getKey(drafts[index])
    const candidates = previousByKey.get(key)
    if (!key || !candidates || candidates.length === 0) continue

    let cursor = keyCursors.get(key) ?? 0
    while (cursor < candidates.length && usedPreviousIndexes.has(candidates[cursor])) {
      cursor++
    }
    if (cursor >= candidates.length) continue

    assign(index, candidates[cursor])
    keyCursors.set(key, cursor + 1)
  }
}

function findFrontmatterRange(
  source: string,
  lineStarts: readonly number[],
): SourceRange | null {
  if (lineStarts.length === 0) return null
  const firstLine = getLineText(source, lineStarts, 0).replace(/^\uFEFF/, '')
  if (firstLine.trim() !== '---') return null

  for (let line = 1; line < lineStarts.length; line++) {
    const value = getLineText(source, lineStarts, line).trim()
    if (value === '---' || value === '...') {
      return {
        from: 0,
        to: getLineOffset(lineStarts, line + 1, source.length),
      }
    }
  }

  // An unclosed `---` is valid Markdown (usually a thematic break), not
  // necessarily frontmatter. Avoid swallowing the complete document.
  return null
}

function findBlockMathRanges(
  source: string,
  lineStarts: readonly number[],
  frontmatter: SourceRange | null,
): SourceRange[] {
  const ranges: SourceRange[] = []
  let fence: { marker: '`' | '~'; length: number } | null = null
  let math: { from: number; closing: '$$' | '\\]' } | null = null

  for (let line = 0; line < lineStarts.length; line++) {
    const from = getLineOffset(lineStarts, line, source.length)
    const to = getLineOffset(lineStarts, line + 1, source.length)
    if (frontmatter && from < frontmatter.to) continue

    const value = getLineText(source, lineStarts, line)
    if (fence) {
      if (isClosingFence(value, fence.marker, fence.length)) fence = null
      continue
    }

    const openingFence = getOpeningFence(value)
    if (openingFence) {
      fence = openingFence
      continue
    }

    if (math) {
      if (containsMathClosing(value, math.closing)) {
        ranges.push({ from: math.from, to })
        math = null
      }
      continue
    }

    const mathOpening = getMathOpening(value)
    if (!mathOpening) continue
    if (mathOpening.closedOnSameLine) {
      ranges.push({ from, to })
    } else {
      math = { from, closing: mathOpening.closing }
    }
  }

  if (math) ranges.push({ from: math.from, to: source.length })
  return ranges
}

function getOpeningFence(value: string): { marker: '`' | '~'; length: number } | null {
  const match = /^ {0,3}(`{3,}|~{3,})/.exec(value)
  if (!match) return null
  const marker = match[1][0]
  if (marker !== '`' && marker !== '~') return null
  return { marker, length: match[1].length }
}

function isClosingFence(value: string, marker: '`' | '~', minimumLength: number): boolean {
  const pattern = marker === '`'
    ? /^ {0,3}(`{3,})\s*$/
    : /^ {0,3}(~{3,})\s*$/
  const match = pattern.exec(value)
  return Boolean(match && match[1].length >= minimumLength)
}

function getMathOpening(value: string): {
  closing: '$$' | '\\]'
  closedOnSameLine: boolean
} | null {
  const dollar = /^ {0,3}\$\$/.exec(value)
  if (dollar) {
    return {
      closing: '$$',
      closedOnSameLine: value.indexOf('$$', dollar[0].length) >= 0,
    }
  }

  const bracket = /^ {0,3}\\\[/.exec(value)
  if (!bracket) return null
  return {
    closing: '\\]',
    closedOnSameLine: value.indexOf('\\]', bracket[0].length) >= 0,
  }
}

function containsMathClosing(value: string, closing: '$$' | '\\]'): boolean {
  return value.includes(closing)
}

function buildLineStarts(source: string): number[] {
  const starts = [0]
  for (let index = 0; index < source.length; index++) {
    const character = source.charCodeAt(index)
    if (character === 13) {
      if (source.charCodeAt(index + 1) === 10) index++
      starts.push(index + 1)
    } else if (character === 10) {
      starts.push(index + 1)
    }
  }
  return starts
}

function getLineText(
  source: string,
  lineStarts: readonly number[],
  line: number,
): string {
  const from = getLineOffset(lineStarts, line, source.length)
  let to = getLineOffset(lineStarts, line + 1, source.length)
  if (to > from && source.charCodeAt(to - 1) === 10) to--
  if (to > from && source.charCodeAt(to - 1) === 13) to--
  return source.slice(from, to)
}

function getLineOffset(
  lineStarts: readonly number[],
  line: number,
  sourceLength: number,
): number {
  return line >= 0 && line < lineStarts.length
    ? lineStarts[line]
    : sourceLength
}

function isOffsetProtected(offset: number, ranges: readonly SourceRange[]): boolean {
  return ranges.some(range => offset >= range.from && offset < range.to)
}

function mergeOverlappingRanges(ranges: readonly SourceRange[]): SourceRange[] {
  const sorted = ranges
    .filter(range => range.to > range.from)
    .map(range => ({ ...range }))
    .sort((left, right) => left.from - right.from || left.to - right.to)
  const merged: SourceRange[] = []

  for (const range of sorted) {
    const previous = merged[merged.length - 1]
    if (previous && range.from < previous.to) {
      previous.to = Math.max(previous.to, range.to)
    } else {
      merged.push(range)
    }
  }

  return merged
}

function createSectionFingerprint(
  source: string,
  span: PrimarySpan,
  contentHash: string,
): string {
  const leadingSample = normalizeFingerprintText(
    source.slice(span.from, Math.min(span.to, span.from + 384)),
  )
  const trailingSample = normalizeFingerprintText(
    source.slice(Math.max(span.from, span.to - 192), span.to),
  )
  const headingKey = span.heading
    ? `${span.heading.level}:${span.heading.ancestorPath.join('/')}:${span.heading.text}`
    : ''

  return hashString([
    span.kind,
    headingKey,
    leadingSample,
    trailingSample,
    String(span.to - span.from),
    contentHash,
  ].join('\u001f'))
}

function getHeadingKey(section: MarkdownSection | SectionDraft): string {
  const heading = section.heading
  if (!heading) return ''
  return `${heading.level}:${heading.ancestorPath.join('/')}::${normalizeFingerprintText(heading.text)}`
}

function normalizeFingerprintText(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

function hashSourceRange(source: string, from: number, to: number): string {
  let hash = 0x811c9dc5
  for (let index = from; index < to; index++) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

function hashString(value: string): string {
  return hashSourceRange(value, 0, value.length)
}

function mapPreviousRange(
  section: MarkdownSection,
  change?: MarkdownSectionChange,
): SourceRange {
  if (!change) return section
  const from = mapPreviousOffset(section.from, 1, change)
  const to = mapPreviousOffset(section.to, -1, change)
  return { from: Math.min(from, to), to: Math.max(from, to) }
}

function mapPreviousOffset(
  offset: number,
  assoc: -1 | 1,
  change: MarkdownSectionChange,
): number {
  const delta = change.insertedLength - (change.to - change.from)
  if (offset < change.from || (offset === change.from && assoc < 0)) return offset
  if (offset > change.to || (offset === change.to && assoc > 0)) return offset + delta
  return assoc < 0 ? change.from : change.from + change.insertedLength
}

function getRangeOverlap(left: SourceRange, right: SourceRange): number {
  return Math.max(0, Math.min(left.to, right.to) - Math.max(left.from, right.from))
}

function findRangeIndexAtOffset(
  ranges: readonly SourceRange[],
  offset: number,
  sourceLength: number,
): number {
  if (ranges.length === 0) return -1
  const target = Math.max(0, Math.min(offset, sourceLength))
  for (let index = 0; index < ranges.length; index++) {
    if (target >= ranges[index].from && (
      target < ranges[index].to || index === ranges.length - 1
    )) {
      return index
    }
  }
  return ranges.length - 1
}

function uniqueSortedNumbers(values: readonly number[]): number[] {
  return [...new Set(values)].sort((left, right) => left - right)
}

function findLastNumberAtMost(values: readonly number[], maximum: number): number | undefined {
  let result: number | undefined
  for (const value of values) {
    if (value > maximum) break
    result = value
  }
  return result
}

function normalizePositiveInteger(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return fallback
  }
  return Math.max(1, Math.floor(value))
}
