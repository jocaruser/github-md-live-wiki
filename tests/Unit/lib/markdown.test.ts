import { describe, expect, it } from 'vitest'
import {
  createRenderer,
  extractTitle,
  ghSlug,
  rewriteTarget,
  type RenderContext,
} from '../../../src/lib/markdown'

const remote: RenderContext = {
  repo: 'jocaruser/illo3d',
  ref: 'main',
  contentPath: 'specs',
  local: false,
  defaultRef: 'main',
}

const local: RenderContext = { ...remote, ref: 'local', local: true }

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
    expect(rewriteTarget('https://x.com/a', 'README.md', remote, false)).toBeNull()
    expect(rewriteTarget('mailto:a@b.c', 'README.md', remote, false)).toBeNull()
    expect(rewriteTarget('//cdn.example/x', 'README.md', remote, false)).toBeNull()
    expect(rewriteTarget('#section', 'README.md', remote, false)).toBeNull()
  })

  it('routes links between pages at the current ref', () => {
    expect(rewriteTarget('decisions/x.md', 'README.md', remote, false)).toBe(
      '#/main/decisions/x.md'
    )
  })

  it('resolves parent segments and keeps anchors', () => {
    expect(rewriteTarget('../decisions/x.md#sec', 'migration/wizard.md', remote, false)).toBe(
      '#/main/decisions/x.md#sec'
    )
  })

  it('returns nothing for an empty target', () => {
    expect(rewriteTarget('', 'README.md', remote, false)).toBeNull()
  })

  it('drops a trailing empty anchor', () => {
    expect(rewriteTarget('x.md#', 'README.md', remote, false)).toBe('#/main/x.md')
  })

  it('ignores an anchor-empty file part', () => {
    expect(rewriteTarget('?query', 'README.md', remote, false)).toBe(
      'https://raw.githubusercontent.com/jocaruser/illo3d/main/specs/%3Fquery'
    )
  })

  it('serves in-tree assets from raw content', () => {
    expect(rewriteTarget('img/shot.png', 'guide/page.md', remote, false)).toBe(
      'https://raw.githubusercontent.com/jocaruser/illo3d/main/specs/guide/img/shot.png'
    )
  })

  it('treats md images as assets, not routes', () => {
    expect(rewriteTarget('x.md', 'README.md', remote, true)).toBe(
      'https://raw.githubusercontent.com/jocaruser/illo3d/main/specs/x.md'
    )
  })

  it('sends out-of-tree links to GitHub at the ref', () => {
    expect(rewriteTarget('../../schema.dbml', 'migration/wizard.md', remote, false)).toBe(
      'https://github.com/jocaruser/illo3d/blob/main/schema.dbml'
    )
  })

  it('keeps anchors on out-of-tree links', () => {
    expect(rewriteTarget('../../README.md#setup', 'a/b.md', remote, false)).toBe(
      'https://github.com/jocaruser/illo3d/blob/main/README.md#setup'
    )
  })

  it('maps repo-absolute targets to GitHub', () => {
    expect(rewriteTarget('/schema.dbml', 'README.md', remote, false)).toBe(
      'https://github.com/jocaruser/illo3d/blob/main/schema.dbml'
    )
  })

  it('leaves links that escape the repository alone', () => {
    expect(rewriteTarget('../../../outside.md', 'a/b.md', remote, false)).toBeNull()
  })

  it('decodes percent-encoded targets before resolving, encoding once on output', () => {
    expect(rewriteTarget('my%20page.md', 'README.md', remote, false)).toBe(
      '#/main/my%20page.md'
    )
    expect(rewriteTarget('img/my%20shot.png', 'guide/page.md', remote, true)).toBe(
      'https://raw.githubusercontent.com/jocaruser/illo3d/main/specs/guide/img/my%20shot.png'
    )
  })

  it('routes file names containing a hash via %23', () => {
    expect(rewriteTarget('a%23b.md', 'README.md', remote, false)).toBe('#/main/a%23b.md')
  })

  it('encodes awkward refs in raw and blob targets', () => {
    const oddRef = { ...remote, ref: 'gh#1' }
    expect(rewriteTarget('img/x.png', 'README.md', oddRef, true)).toBe(
      'https://raw.githubusercontent.com/jocaruser/illo3d/gh%231/specs/img/x.png'
    )
    expect(rewriteTarget('../../schema.dbml', 'a/b.md', oddRef, false)).toBe(
      'https://github.com/jocaruser/illo3d/blob/gh%231/schema.dbml'
    )
  })

  it('drops repository links when no repo is configured', () => {
    const bare = { ...local, repo: '' }
    expect(rewriteTarget('/schema.dbml', 'README.md', bare, false)).toBeNull()
    expect(rewriteTarget('../../schema.dbml', 'a/b.md', bare, false)).toBeNull()
  })

  it('serves local assets from the local content server', () => {
    expect(rewriteTarget('img/shot.png', 'guide/page.md', local, true)).toBe(
      './__local/file/guide/img/shot.png'
    )
  })

  it('uses the default branch for repository links in local mode', () => {
    expect(rewriteTarget('../../schema.dbml', 'migration/wizard.md', local, false)).toBe(
      'https://github.com/jocaruser/illo3d/blob/main/schema.dbml'
    )
    expect(rewriteTarget('/schema.dbml', 'README.md', local, false)).toBe(
      'https://github.com/jocaruser/illo3d/blob/main/schema.dbml'
    )
  })

  it('routes local md links at the local pseudo-ref', () => {
    expect(rewriteTarget('guide/x.md', 'README.md', local, false)).toBe('#/local/guide/x.md')
  })
})

describe('createRenderer', () => {
  const render = createRenderer(remote)

  it('rewrites markdown links in rendered html', () => {
    const html = render('README.md', 'See [the ADR](decisions/x.md#sec).')
    expect(html).toContain('href="#/main/decisions/x.md#sec"')
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
