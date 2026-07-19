import { describe, expect, it } from 'vitest'
import { formatRoute, hashOf, parseRoute, safeDecode } from '../../../src/lib/route'

describe('safeDecode', () => {
  it('decodes valid escapes', () => {
    expect(safeDecode('caf%C3%A9')).toBe('café')
  })

  it('returns malformed input untouched', () => {
    expect(safeDecode('feat%2')).toBe('feat%2')
  })
})

describe('hashOf', () => {
  it('extracts the serialized fragment from a href', () => {
    expect(hashOf('http://x.test/wiki/#/main/a%20b.md')).toBe('#/main/a%20b.md')
  })

  it('returns empty without a fragment', () => {
    expect(hashOf('http://x.test/wiki/')).toBe('')
  })
})

describe('formatRoute', () => {
  it('formats ref and path', () => {
    expect(formatRoute({ ref: 'main', path: 'welcome/welcome.spec.md' })).toBe(
      '#/main/welcome/welcome.spec.md'
    )
  })

  it('encodes slashes inside the ref', () => {
    expect(formatRoute({ ref: 'feat/x', path: 'a.md' })).toBe('#/feat%2Fx/a.md')
  })

  it('appends the anchor', () => {
    expect(formatRoute({ ref: 'main', path: 'a.md', anchor: 'sec' })).toBe('#/main/a.md#sec')
  })

  it('formats the content root with an empty path', () => {
    expect(formatRoute({ ref: 'v1.0.0', path: '' })).toBe('#/v1.0.0/')
  })
})

describe('parseRoute', () => {
  it('defaults when the hash is empty', () => {
    expect(parseRoute('', 'main')).toEqual({ ref: 'main', path: '' })
  })

  it('defaults when the hash is not a route', () => {
    expect(parseRoute('#anchor-only', 'main')).toEqual({ ref: 'main', path: '' })
  })

  it('parses ref and path', () => {
    expect(parseRoute('#/main/guide/intro.md', 'main')).toEqual({
      ref: 'main',
      path: 'guide/intro.md',
      anchor: undefined,
    })
  })

  it('parses a ref with no path', () => {
    expect(parseRoute('#/v1.0.0', 'main')).toEqual({ ref: 'v1.0.0', path: '' })
  })

  it('decodes slashes in the ref', () => {
    expect(parseRoute('#/feat%2Fx/a.md#sec', 'main')).toEqual({
      ref: 'feat/x',
      path: 'a.md',
      anchor: 'sec',
    })
  })

  it('drops an empty anchor', () => {
    expect(parseRoute('#/main/a.md#', 'main')).toEqual({
      ref: 'main',
      path: 'a.md',
      anchor: undefined,
    })
  })

  it('falls back to the default ref when the ref segment is empty', () => {
    expect(parseRoute('#//a.md', 'main')).toEqual({ ref: 'main', path: 'a.md', anchor: undefined })
  })

  it('round-trips through formatRoute', () => {
    const route = { ref: 'feature/deep/branch', path: 'x/y.md', anchor: 'z' }
    expect(parseRoute(formatRoute(route), 'main')).toEqual(route)
  })

  it('encodes spaces, unicode and hashes in the path', () => {
    expect(formatRoute({ ref: 'main', path: 'my page/caf é.md' })).toBe(
      '#/main/my%20page/caf%20%C3%A9.md'
    )
    expect(formatRoute({ ref: 'main', path: 'a#b.md' })).toBe('#/main/a%23b.md')
  })

  it('round-trips awkward file names and anchors', () => {
    const route = { ref: 'gh#123', path: 'my page/a#b café.md', anchor: 'configuración' }
    expect(parseRoute(formatRoute(route), 'main')).toEqual(route)
  })

  it('tolerates malformed escapes without throwing', () => {
    expect(parseRoute('#/feat%2/a%2.md', 'main')).toEqual({
      ref: 'feat%2',
      path: 'a%2.md',
      anchor: undefined,
    })
  })
})
