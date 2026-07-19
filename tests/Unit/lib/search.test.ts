import { describe, expect, it } from 'vitest'
import { buildIndex, searchPages, stripMarkdown } from '../../../src/lib/search'

describe('stripMarkdown', () => {
  it('drops code fences and inline code markers', () => {
    expect(stripMarkdown('before\n```ts\nsecret()\n```\nafter `kept`')).toBe('before after kept')
  })

  it('keeps link and image text but drops targets', () => {
    expect(stripMarkdown('See [the ADR](decisions/x.md) and ![shot](img.png)')).toBe(
      'See the ADR and shot'
    )
  })

  it('drops heading markers and syntax characters', () => {
    expect(stripMarkdown('# Title\n\n> quote **bold** | cell')).toBe('Title quote bold cell')
  })
})

describe('buildIndex / searchPages', () => {
  const index = buildIndex([
    { path: 'saving.spec.md', title: 'Saving', text: 'two tabs truth backup' },
    { path: 'guide/intro.md', title: 'Intro', text: 'saving mentioned in passing' },
  ])

  it('returns matches with their titles', () => {
    const hits = searchPages(index, 'backup')
    expect(hits).toEqual([{ path: 'saving.spec.md', title: 'Saving' }])
  })

  it('boosts title matches above body matches', () => {
    expect(searchPages(index, 'saving')[0].path).toBe('saving.spec.md')
  })

  it('returns nothing for blank queries', () => {
    expect(searchPages(index, '   ')).toEqual([])
  })

  it('caps the number of results', () => {
    const many = buildIndex(
      Array.from({ length: 20 }, (_, i) => ({
        path: `p${i}.md`,
        title: `Page ${i}`,
        text: 'common token everywhere',
      }))
    )
    expect(searchPages(many, 'common').length).toBe(12)
  })
})
