import MiniSearch from 'minisearch'

export interface PageDoc {
  path: string
  title: string
  text: string
}

export interface SearchHit {
  path: string
  title: string
}

/** Reduces markdown to plain-ish text so matches land on words, not syntax. */
export function stripMarkdown(src: string): string {
  return src
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_>#|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildIndex(docs: PageDoc[]): MiniSearch<PageDoc> {
  const index = new MiniSearch<PageDoc>({
    idField: 'path',
    fields: ['title', 'text'],
    storeFields: ['title'],
  })
  index.addAll(docs)
  return index
}

export function searchPages(index: MiniSearch<PageDoc>, query: string): SearchHit[] {
  if (!query.trim()) return []
  return index
    .search(query, { prefix: true, fuzzy: 0.15, boost: { title: 3 } })
    .slice(0, 12)
    .map((result) => ({
      path: result.id as string,
      title: (result as unknown as { title: string }).title,
    }))
}
