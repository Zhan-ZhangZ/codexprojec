import { Extension, type Editor } from '@tiptap/core'
import { ChangeSet, simplifyChanges } from '@tiptap/pm/changeset'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state'
import { Transform } from '@tiptap/pm/transform'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

interface AgentDiffPreviewPayload {
  originalContent: string
  modifiedContent: string
  from?: number
  to?: number
}

interface AgentDiffPreviewMeta {
  type: 'show' | 'clear'
  payload?: AgentDiffPreviewPayload
}

interface AgentDiffPreviewState {
  active: boolean
  decorations: DecorationSet
}

export const agentDiffPreviewPluginKey = new PluginKey<AgentDiffPreviewState>('agentDiffPreview')

function createInsertedContentWidget(content: string) {
  return () => {
    const element = document.createElement('span')
    element.className = 'agent-diff-preview-inserted'
    element.dataset.agentDiffType = 'inserted'
    element.contentEditable = 'false'
    element.textContent = content || '新增内容'
    return element
  }
}

function buildDiffDecorations(
  editor: Editor,
  currentDoc: ProseMirrorNode,
  payload: AgentDiffPreviewPayload
) {
  if (payload.from !== undefined && payload.to !== undefined) {
    const from = Math.min(Math.max(0, payload.from), currentDoc.content.size)
    const to = Math.min(Math.max(from, payload.to), currentDoc.content.size)
    const decorations: Decoration[] = []

    if (to > from) {
      decorations.push(Decoration.inline(from, to, {
        class: 'agent-diff-preview-removed',
        'data-agent-diff-type': 'removed',
      }))
    }

    if (payload.modifiedContent) {
      decorations.push(Decoration.widget(
        to,
        createInsertedContentWidget(payload.modifiedContent),
        { side: 1, key: `agent-diff-range-insert-${from}-${to}` }
      ))
    }

    return DecorationSet.create(currentDoc, decorations)
  }

  const modifiedJson = editor.markdown?.parse(payload.modifiedContent)
  if (!modifiedJson) {
    return DecorationSet.empty
  }

  const modifiedDoc = editor.schema.nodeFromJSON(modifiedJson)
  const transform = new Transform(currentDoc).replaceWith(
    0,
    currentDoc.content.size,
    modifiedDoc.content
  )
  const changeSet = ChangeSet.create(currentDoc).addSteps(
    modifiedDoc,
    transform.mapping.maps,
    'agent'
  )
  const changes = simplifyChanges(changeSet.changes, modifiedDoc)
  const decorations: Decoration[] = []

  for (const change of changes) {
    if (change.toA > change.fromA) {
      decorations.push(Decoration.inline(change.fromA, change.toA, {
        class: 'agent-diff-preview-removed',
        'data-agent-diff-type': 'removed',
      }))
    }

    if (change.toB > change.fromB) {
      const insertedContent = modifiedDoc.textBetween(
        change.fromB,
        change.toB,
        '\n',
        '\n'
      )
      const position = Math.min(
        change.toA > change.fromA ? change.toA : change.fromA,
        currentDoc.content.size
      )
      decorations.push(Decoration.widget(
        position,
        createInsertedContentWidget(insertedContent),
        { side: 1, key: `agent-diff-insert-${change.fromA}-${change.fromB}` }
      ))
    }
  }

  return DecorationSet.create(currentDoc, decorations)
}

function applyPreviewMeta(
  editor: Editor,
  transaction: Transaction,
  state: AgentDiffPreviewState,
  newState: EditorState
): AgentDiffPreviewState {
  const meta = transaction.getMeta(agentDiffPreviewPluginKey) as AgentDiffPreviewMeta | undefined
  if (!meta) {
    return transaction.docChanged
      ? { ...state, decorations: state.decorations.map(transaction.mapping, transaction.doc) }
      : state
  }

  if (meta.type === 'clear' || !meta.payload) {
    return {
      active: false,
      decorations: DecorationSet.empty,
    }
  }

  const decorations = buildDiffDecorations(editor, newState.doc, meta.payload)
  return {
    active: decorations !== DecorationSet.empty,
    decorations,
  }
}

export const AgentDiffPreview = Extension.create({
  name: 'agentDiffPreview',

  addProseMirrorPlugins() {
    const editor = this.editor

    return [
      new Plugin<AgentDiffPreviewState>({
        key: agentDiffPreviewPluginKey,
        state: {
          init: () => ({
            active: false,
            decorations: DecorationSet.empty,
          }),
          apply: (transaction, value, _oldState, newState) => (
            applyPreviewMeta(editor, transaction, value, newState)
          ),
        },
        filterTransaction: (transaction, state) => {
          const previewState = agentDiffPreviewPluginKey.getState(state)
          return !previewState?.active || !transaction.docChanged || Boolean(
            transaction.getMeta(agentDiffPreviewPluginKey)
          )
        },
        props: {
          decorations: (state) => (
            agentDiffPreviewPluginKey.getState(state)?.decorations ?? null
          ),
        },
      }),
    ]
  },
})
