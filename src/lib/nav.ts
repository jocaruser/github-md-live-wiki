import { basename } from './paths'

export interface NavPage {
  kind: 'page'
  path: string
  title: string
}

export interface NavSection {
  kind: 'section'
  title: string
  indexPath?: string
  items: NavItem[]
}

export type NavItem = NavPage | NavSection

/** Top-level directories that hold local-only drafts and never publish. */
export const EXCLUDED_DIRS = ['changes']

/** Drafts are excluded everywhere — nav, search, and rendering alike. */
export function isPublishedPath(path: string): boolean {
  const top = path.split('/')[0]
  return !(path.includes('/') && EXCLUDED_DIRS.includes(top))
}

interface DirNode {
  files: string[]
  dirs: Map<string, DirNode>
}

function insert(node: DirNode, segments: string[], fullPath: string): void {
  if (segments.length === 1) {
    node.files.push(fullPath)
    return
  }
  const dir = segments[0]
  let child = node.dirs.get(dir)
  if (!child) {
    child = { files: [], dirs: new Map() }
    node.dirs.set(dir, child)
  }
  insert(child, segments.slice(1), fullPath)
}

function capitalise(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1)
}

export function pageTitle(path: string, titles: Map<string, string>): string {
  return titles.get(path) ?? basename(path).replace(/\.md$/, '')
}

/**
 * Builds the sidebar from a flat list of content-relative .md paths.
 * READMEs act as section indexes and give sections their titles; loose pages
 * come before subsections, both sorted by title.
 */
export function buildNav(paths: string[], titles: Map<string, string>): NavItem[] {
  const root: DirNode = { files: [], dirs: new Map() }
  for (const path of paths) {
    if (!isPublishedPath(path)) continue
    insert(root, path.split('/'), path)
  }
  return nodeItems(root, titles, true)
}

function nodeItems(node: DirNode, titles: Map<string, string>, isRoot: boolean): NavItem[] {
  const items: NavItem[] = []
  const readme = node.files.find((f) => basename(f) === 'README.md')
  if (isRoot && readme) {
    items.push({ kind: 'page', path: readme, title: titles.get(readme) ?? 'Overview' })
  }
  const pages: NavPage[] = node.files
    .filter((f) => basename(f) !== 'README.md')
    .map((f) => ({ kind: 'page' as const, path: f, title: pageTitle(f, titles) }))
    .sort((a, b) => a.title.localeCompare(b.title))
  const sections: NavSection[] = [...node.dirs.entries()]
    .map(([name, child]) => buildSection(name, child, titles))
    .sort((a, b) => a.title.localeCompare(b.title))
  return [...items, ...pages, ...sections]
}

function buildSection(name: string, node: DirNode, titles: Map<string, string>): NavSection {
  const readme = node.files.find((f) => basename(f) === 'README.md')
  return {
    kind: 'section',
    title: readme ? (titles.get(readme) ?? capitalise(name)) : capitalise(name),
    indexPath: readme,
    items: nodeItems(node, titles, false),
  }
}
