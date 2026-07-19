import { describe, expect, it } from 'vitest'
import {
  createRenderer,
  extractTitle,
  ghSlug,
  rewriteTarget,
  type RenderContext,
} from '../../../src/lib/markdown'

// "pinned" keeps the viewed version in page links (routeRef set); "latest"
// omits it (routeRef undefined). Both use the concrete ref for raw/blob URLs.
const pinned: RenderContext = {
  repo: 'jocaruser/illo3d',
  ref: 'main',
  contentPath: 'specs',
  routeRef: 'main',
}
const latest: RenderContext = { repo: 'jocaruser/illo3d', ref: 'main', contentPath: 'specs' }
const root: RenderContext = { repo: 'o/r', ref: 'main', contentPath: '' }

describe('ghSlug', () => {
  it('lowercases and hyphenates', () => {
    expect(ghSlug('Hello World')).toBe('hello-world')
  })

  it('strips punctuation but keeps existing hyphens', () => {
    expect(ghSlug('ADR-0007: GitHub Pages!')).toBe('adr-0007-github-pages')
  })

  it('keeps underscores, matching GitHub slugs', () => {
    expect(ghSlug('snake_case name')).toBe('snake_case-name')
  })
})

describe('extractTitle', () => {
  it('takes the first level-one heading and strips backticks', () => {
    expect(extractTitle('intro\n\n# The `metadata` file\n\n# Second')).toBe('The metadata file')
  })

  it('returns undefined without a heading', () => {
    expect(extractTitle('no heading here')).toBeUndefined()
  })

  it('ignores hash lines inside code fences', () => {
    expect(extractTitle('```bash\n# install deps\n```\n\n# Real Title')).toBe('Real Title')
    expect(extractTitle('~~~\n# nope\n~~~')).toBeUndefined()
  })
})

describe('rewriteTarget', () => {
  it('leaves external, protocol-relative and in-page targets alone', () => {
    expect(rewriteTarget('https://x.com/a', 'README.md', pinned, false)).toBeNull()
    expect(rewriteTarget('mailto:a@b.c', 'README.md', pinned, false)).toBeNull()
    expect(rewriteTarget('//cdn.example/x', 'README.md', pinned, false)).toBeNull()
    expect(rewriteTarget('#section', 'README.md', pinned, false)).toBeNull()
  })

  it('routes links between pages, preserving the pinned version', () => {
    expect(rewriteTarget('decisions/x.md', 'README.md', pinned, false)).toBe(
      '#r=jocaruser/illo3d&p=specs&v=main&f=decisions/x.md'
    )
  })

  it('omits the version in page links when viewing latest', () => {
    expect(rewriteTarget('decisions/x.md', 'README.md', latest, false)).toBe(
      '#r=jocaruser/illo3d&p=specs&f=decisions/x.md'
    )
  })

  it('resolves parent segments and keeps anchors', () => {
    expect(rewriteTarget('../decisions/x.md#sec', 'migration/wizard.md', pinned, false)).toBe(
      '#r=jocaruser/illo3d&p=specs&v=main&f=decisions/x.md&a=sec'
    )
  })

  it('routes pages of a root-content repo without a path param', () => {
    expect(rewriteTarget('guide/x.md', 'README.md', root, false)).toBe('#r=o/r&f=guide/x.md')
  })

  it('returns nothing for an empty target', () => {
    expect(rewriteTarget('', 'README.md', pinned, false)).toBeNull()
  })

  it('drops a trailing empty anchor', () => {
    expect(rewriteTarget('x.md#', 'README.md', pinned, false)).toBe(
      '#r=jocaruser/illo3d&p=specs&v=main&f=x.md'
    )
  })

  it('serves in-tree assets from raw content', () => {
    expect(rewriteTarget('img/shot.png', 'guide/page.md', pinned, false)).toBe(
      'https://raw.githubusercontent.com/jocaruser/illo3d/main/specs/guide/img/shot.png'
    )
  })

  it('serves root-content assets without a path segment', () => {
    expect(rewriteTarget('logo.png', 'README.md', root, true)).toBe(
      'https://raw.githubusercontent.com/o/r/main/logo.png'
    )
  })

  it('treats md images as assets, not routes', () => {
    expect(rewriteTarget('x.md', 'README.md', pinned, true)).toBe(
      'https://raw.githubusercontent.com/jocaruser/illo3d/main/specs/x.md'
    )
  })

  it('sends out-of-tree links to GitHub at the concrete ref', () => {
    expect(rewriteTarget('../../schema.dbml', 'migration/wizard.md', pinned, false)).toBe(
      'https://github.com/jocaruser/illo3d/blob/main/schema.dbml'
    )
  })

  it('keeps anchors on out-of-tree links', () => {
    expect(rewriteTarget('../../README.md#setup', 'a/b.md', pinned, false)).toBe(
      'https://github.com/jocaruser/illo3d/blob/main/README.md#setup'
    )
  })

  it('maps repo-absolute targets to GitHub', () => {
    expect(rewriteTarget('/schema.dbml', 'README.md', pinned, false)).toBe(
      'https://github.com/jocaruser/illo3d/blob/main/schema.dbml'
    )
  })

  it('leaves links that escape the repository alone', () => {
    expect(rewriteTarget('../../../outside.md', 'a/b.md', pinned, false)).toBeNull()
  })

  it('decodes percent-encoded targets before resolving, encoding once on output', () => {
    expect(rewriteTarget('my%20page.md', 'README.md', pinned, false)).toBe(
      '#r=jocaruser/illo3d&p=specs&v=main&f=my%20page.md'
    )
    expect(rewriteTarget('img/my%20shot.png', 'guide/page.md', pinned, true)).toBe(
      'https://raw.githubusercontent.com/jocaruser/illo3d/main/specs/guide/img/my%20shot.png'
    )
  })

  it('routes file names containing a hash via %23', () => {
    expect(rewriteTarget('a%23b.md', 'README.md', pinned, false)).toBe(
      '#r=jocaruser/illo3d&p=specs&v=main&f=a%23b.md'
    )
  })

  it('encodes awkward refs in raw and blob targets', () => {
    const oddRef: RenderContext = { ...pinned, ref: 'gh#1' }
    expect(rewriteTarget('img/x.png', 'README.md', oddRef, true)).toBe(
      'https://raw.githubusercontent.com/jocaruser/illo3d/gh%231/specs/img/x.png'
    )
    expect(rewriteTarget('../../schema.dbml', 'a/b.md', oddRef, false)).toBe(
      'https://github.com/jocaruser/illo3d/blob/gh%231/schema.dbml'
    )
  })
})

describe('createRenderer', () => {
  const render = createRenderer(pinned)

  it('rewrites markdown links in rendered html', () => {
    const html = render('README.md', 'See [the ADR](decisions/x.md#sec).')
    expect(html).toContain('href="#r=jocaruser/illo3d&amp;p=specs&amp;v=main&amp;f=decisions/x.md&amp;a=sec"')
  })

  it('rewrites image sources', () => {
    const html = render('guide/page.md', '![shot](img/shot.png)')
    expect(html).toContain(
      'src="https://raw.githubusercontent.com/jocaruser/illo3d/main/specs/guide/img/shot.png"'
    )
  })

  it('leaves links without targets untouched', () => {
    const html = render('README.md', '[empty]() and [ext](https://x.com)')
    expect(html).toContain('href=""')
    expect(html).toContain('href="https://x.com"')
  })

  it('leaves images without sources untouched', () => {
    expect(render('README.md', '![nothing]()')).toContain('src=""')
  })

  it('leaves external images untouched', () => {
    expect(render('README.md', '![ext](https://cdn.example/x.png)')).toContain(
      'src="https://cdn.example/x.png"'
    )
  })

  it('slugs heading anchors github-style', () => {
    expect(render('README.md', '# Hello World')).toContain('id="hello-world"')
  })

  it('highlights known code fences', () => {
    const html = render('README.md', '```ts\nconst a = 1\n```')
    expect(html).toContain('language-ts')
    expect(html).toContain('hljs-keyword')
  })

  it('leaves unknown languages unhighlighted', () => {
    const html = render('README.md', '```nope\nconst a = 1\n```')
    expect(html).not.toContain('hljs-keyword')
  })

  it('renders task lists as checkboxes', () => {
    const html = render('README.md', '- [x] done\n- [ ] open')
    expect(html).toContain('type="checkbox"')
  })

  it('autolinks bare urls', () => {
    expect(render('README.md', 'see https://example.com/x')).toContain(
      'href="https://example.com/x"'
    )
  })
})
