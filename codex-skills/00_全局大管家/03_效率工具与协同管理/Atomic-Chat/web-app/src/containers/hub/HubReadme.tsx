import { useEffect, useState } from 'react'
import type { Components } from 'react-markdown'
import { RenderMarkdown } from '@/containers/RenderMarkdown'
import { useGeneralSetting } from '@/hooks/useGeneralSetting'
import { useTranslation } from '@/i18n/react-i18next-compat'

// HuggingFace READMEs open with a YAML frontmatter block (license, tags,
// base_model…). Without a frontmatter parser it renders as stray `---` rules
// and key/value text. `removeYamlFrontMatter` in lib/models assumes LF and no
// BOM; a README fetched over HTTP frequently has both.
const stripFrontmatter = (markdown: string): string =>
  markdown.replace(/^\uFEFF?\s*---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')

// Model cards are wallpapered with CI shields, Discord invites and hero
// banners. They are decorative at best, and at worst they are dozens of
// remote requests and a layout that jumps as each one lands. Drop every image
// node — markdown-authored and, thanks to `allowRawHtml`, HTML-authored too.
const README_COMPONENTS: Components = {
  img: () => null,
  picture: () => null,
  a: ({ ...props }) => (
    <a {...props} target="_blank" rel="noopener noreferrer" />
  ),
}

/**
 * A Hub detail panel's README section: the repo's model card fetched from
 * Hugging Face and rendered without its frontmatter and images.
 */
export function HubReadme({ url }: { url: string | undefined }) {
  const { t } = useTranslation()
  const huggingfaceToken = useGeneralSetting((state) => state.huggingfaceToken)
  const [readme, setReadme] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!url) {
      setReadme('')
      return
    }
    let active = true
    setLoading(true)
    setReadme('')
    // HF rejects an Authorization header on public repos, so try anonymously
    // first and only retry with the token when the anonymous read fails.
    fetch(url)
      .then((response) =>
        !response.ok && huggingfaceToken
          ? fetch(url, {
              headers: { Authorization: `Bearer ${huggingfaceToken}` },
            })
          : response
      )
      .then((response) => response.text())
      .then((content) => {
        if (!active) return
        setReadme(stripFrontmatter(content))
      })
      .catch((error) => {
        console.error('Failed to fetch README:', error)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [url, huggingfaceToken])

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-medium">{t('hub:readme')}</h2>
      {loading ? (
        <p className="text-xs text-muted-foreground">
          {t('hub:loadingModels')}
        </p>
      ) : readme ? (
        <RenderMarkdown
          allowRawHtml
          isAnimating={false}
          components={README_COMPONENTS}
          content={readme}
        />
      ) : (
        <p className="text-xs text-muted-foreground">
          {t('hub:readmeUnavailable')}
        </p>
      )}
    </section>
  )
}
