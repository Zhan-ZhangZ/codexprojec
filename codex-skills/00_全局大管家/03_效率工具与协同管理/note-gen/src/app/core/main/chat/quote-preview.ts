export function getQuotePreview(content: string, limit = 160) {
  if (!content || content.length <= limit) {
    return content
  }

  return `${content.slice(0, limit)}...`
}
