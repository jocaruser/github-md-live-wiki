import { describe, expect, it } from 'vitest'
import { basename, dirname, escapesRoot, join, normalize } from '../../../src/lib/paths'

describe('dirname', () => {
  it('returns the directory of a nested path', () => {
    expect(dirname('a/b/c.md')).toBe('a/b')
  })

  it('returns empty for a root-level path', () => {
    expect(dirname('c.md')).toBe('')
  })
})

describe('basename', () => {
  it('returns the file name of a nested path', () => {
    expect(basename('a/b/c.md')).toBe('c.md')
  })

  it('returns the path itself at root level', () => {
    expect(basename('c.md')).toBe('c.md')
  })
})

describe('normalize', () => {
  it('collapses current-dir and empty segments', () => {
    expect(normalize('a//./b/c')).toBe('a/b/c')
  })

  it('resolves parent segments', () => {
    expect(normalize('a/b/../c')).toBe('a/c')
  })

  it('keeps leading parent segments that escape the root', () => {
    expect(normalize('../../x')).toBe('../../x')
    expect(normalize('a/../../x')).toBe('../x')
  })
})

describe('join', () => {
  it('joins and normalizes segments', () => {
    expect(join('a', 'b/../c', 'd.md')).toBe('a/c/d.md')
  })

  it('ignores empty segments', () => {
    expect(join('', 'a', 'b.md')).toBe('a/b.md')
  })
})

describe('escapesRoot', () => {
  it('detects paths that leave the root', () => {
    expect(escapesRoot('..')).toBe(true)
    expect(escapesRoot('../x')).toBe(true)
  })

  it('accepts paths that stay inside', () => {
    expect(escapesRoot('a/b.md')).toBe(false)
    expect(escapesRoot('..hidden/x')).toBe(false)
  })
})
