import { DirTree } from '@/stores/article'

export function normalizePath(path: string) {
  return path.replace(/\\/g, '/')
}

export function parentPath(path: string) {
  if (!path.includes('/')) return ''
  return path.split('/').slice(0, -1).join('/')
}

export function isMarkdownFile(node: DirTree) {
  return node.isFile && node.name.toLowerCase().endsWith('.md')
}

export function getNodeByPath(tree: DirTree[], path: string): DirTree | null {
  if (!path) return null
  const parts = normalizePath(path).split('/').filter(Boolean)
  let nodes = tree
  let current: DirTree | null = null

  for (const part of parts) {
    const next = nodes.find((node) => node.isDirectory && node.name === part)
    if (!next) return null
    current = next
    nodes = next.children || []
  }

  return current
}

export function getChildrenByPath(tree: DirTree[], path: string): DirTree[] {
  if (!path) return tree
  const node = getNodeByPath(tree, path)
  return node?.children || []
}
