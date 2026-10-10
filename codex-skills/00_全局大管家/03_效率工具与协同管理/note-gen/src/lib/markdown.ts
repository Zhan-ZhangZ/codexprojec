// 根据 markdown 截取标题
export function extractTitle(content: string) {
  const regex = /^# (.*)/m
  const match = content.match(regex)
  if (match) {
    const res = match[1]
    return res.replace(/[^a-zA-Z0-9\u4e00-\u9fa5\s]/g, '')
  }
  return ''
}