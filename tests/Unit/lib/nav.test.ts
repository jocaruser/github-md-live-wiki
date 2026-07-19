import { describe, expect, it } from 'vitest'
import { buildNav, isPublishedPath, pageTitle, type NavSection } from '../../../src/lib/nav'

describe('isPublishedPath', () => {
  it('excludes files under top-level draft directories', () => {
    expect(isPublishedPath('changes/draft.md')).toBe(false)
  })

  it('keeps ordinary pages and nested directories', () => {
    expect(isPublishedPath('README.md')).toBe(true)
    expect(isPublishedPath('welcome/welcome.spec.md')).toBe(true)
  })
})

const titles = new Map([
  ['README.md', 'Behaviour specs'],
  ['saving.spec.md', 'Saving'],
  ['navigation.spec.md', 'Navigation'],
  ['decisions/README.md', 'Architecture Decision Records'],
  ['decisions/ADR-0001-x.md', 'ADR-0001: X'],
  ['welcome/welcome.spec.md', 'Welcome'],
  ['welcome/google-drive.spec.md', 'Google Drive'],
])

const paths = [
  'README.md',
  'saving.spec.md',
  'navigation.spec.md',
  'decisions/README.md',
  'decisions/ADR-0001-x.md',
  'welcome/welcome.spec.md',
  'welcome/google-drive.spec.md',
  'changes/draft.md',
  'migration/steps/deep.md',
]

describe('buildNav', () => {
  const nav = buildNav(paths, titles)

  it('puts the root README first, titled from its heading', () => {
    expect(nav[0]).toEqual({ kind: 'page', path: 'README.md', title: 'Behaviour specs' })
  })

  it('sorts loose pages by title before sections', () => {
    expect(nav[1]).toEqual({ kind: 'page', path: 'navigation.spec.md', title: 'Navigation' })
    expect(nav[2]).toEqual({ kind: 'page', path: 'saving.spec.md', title: 'Saving' })
  })

  it('excludes the changes/ drafts directory', () => {
    expect(JSON.stringify(nav)).not.toContain('changes')
  })

  it('titles sections from their README and links it as index', () => {
    const decisions = nav.find(
      (item) => item.kind === 'section' && item.indexPath === 'decisions/README.md'
    ) as NavSection
    expect(decisions.title).toBe('Architecture Decision Records')
    expect(decisions.items).toEqual([
      { kind: 'page', path: 'decisions/ADR-0001-x.md', title: 'ADR-0001: X' },
    ])
  })

  it('capitalises sections without a README', () => {
    const welcome = nav.find(
      (item) => item.kind === 'section' && item.title === 'Welcome'
    ) as NavSection
    expect(welcome.indexPath).toBeUndefined()
    expect(welcome.items.map((item) => item.kind === 'page' && item.title)).toEqual([
      'Google Drive',
      'Welcome',
    ])
  })

  it('nests directories recursively', () => {
    const migration = nav.find(
      (item) => item.kind === 'section' && item.title === 'Migration'
    ) as NavSection
    const steps = migration.items[0] as NavSection
    expect(steps.title).toBe('Steps')
    expect(steps.items).toEqual([{ kind: 'page', path: 'migration/steps/deep.md', title: 'deep' }])
  })

  it('capitalises a section whose README has no heading title', () => {
    const bare = buildNav(['docs/README.md', 'docs/a.md'], new Map())
    expect(bare[0]).toMatchObject({ kind: 'section', title: 'Docs', indexPath: 'docs/README.md' })
  })

  it('omits the overview entry when the root has no README', () => {
    const bare = buildNav(['only.spec.md'], new Map())
    expect(bare).toEqual([{ kind: 'page', path: 'only.spec.md', title: 'only.spec' }])
  })

  it('falls back to Overview when the root README has no heading title', () => {
    const bare = buildNav(['README.md'], new Map())
    expect(bare[0]).toEqual({ kind: 'page', path: 'README.md', title: 'Overview' })
  })
})

describe('pageTitle', () => {
  it('prefers the extracted title', () => {
    expect(pageTitle('saving.spec.md', titles)).toBe('Saving')
  })

  it('falls back to the file name without extension', () => {
    expect(pageTitle('a/b/unknown.spec.md', titles)).toBe('unknown.spec')
  })
})
