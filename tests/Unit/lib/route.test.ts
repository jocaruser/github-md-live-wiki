import { describe, expect, it } from 'vitest'
import { formatRoute, hashOf, parseRoute, safeDecode, type Route } from '../../../src/lib/route'

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
    expect(hashOf('http://x.test/#r=o/r&f=a.md')).toBe('#r=o/r&f=a.md')
  })

  it('returns empty without a fragment', () => {
    expect(hashOf('http://x.test/')).toBe('')
  })
})

describe('formatRoute', () => {
  it('returns an empty string without a repo (the landing form)', () => {
    expect(formatRoute({ repo: undefined, path: '', page: '' })).toBe('')
  })

  it('emits only the repo when nothing else is set', () => {
    expect(formatRoute({ repo: 'o/r', path: '', page: '' })).toBe('#r=o/r')
  })

  it('includes path, version, page and anchor when present', () => {
    expect(
      formatRoute({ repo: 'o/r', path: 'docs', ref: 'v1.0.0', page: 'guide/intro.md', anchor: 'sec' })
    ).toBe('#r=o/r&p=docs&v=v1.0.0&f=guide/intro.md&a=sec')
  })

  it('keeps slashes literal but encodes other special characters', () => {
    expect(
      formatRoute({ repo: 'o/r', path: 'my docs', ref: 'feat/x', page: 'a b/c#d.md' })
    ).toBe('#r=o/r&p=my%20docs&v=feat/x&f=a%20b/c%23d.md')
  })
})

describe('parseRoute', () => {
  it('reads the landing form from an empty hash', () => {
    expect(parseRoute('')).toEqual({ repo: undefined, path: '', ref: undefined, page: '', anchor: undefined })
  })

  it('parses every field', () => {
    expect(parseRoute('#r=o/r&p=docs&v=v1.0.0&f=guide/intro.md&a=sec')).toEqual({
      repo: 'o/r',
      path: 'docs',
      ref: 'v1.0.0',
      page: 'guide/intro.md',
      anchor: 'sec',
    })
  })

  it('decodes encoded values', () => {
    expect(parseRoute('#r=o/r&p=my%20docs&f=a%20b/c%23d.md')).toMatchObject({
      path: 'my docs',
      page: 'a b/c#d.md',
    })
  })

  it('treats an empty repo value as the landing form', () => {
    expect(parseRoute('#r=').repo).toBeUndefined()
  })

  it('tolerates malformed escapes and stray keys', () => {
    expect(parseRoute('#r=o/r&f=a%2&x&junk=1')).toMatchObject({ repo: 'o/r', page: 'a%2' })
  })

  it('normalizes a hand-typed leading/trailing slash and whitespace in the path', () => {
    expect(parseRoute('#r=o/r&p=/specs/&f=/guide/intro.md')).toMatchObject({
      repo: 'o/r',
      path: 'specs',
      page: 'guide/intro.md',
    })
    expect(parseRoute('#r=%20o/r%20&p=%20docs%20').repo).toBe('o/r')
  })

  it('ignores a repeated key, keeping the first', () => {
    expect(parseRoute('#r=first/one&r=second/two').repo).toBe('first/one')
  })

  it('round-trips awkward values', () => {
    const route: Route = {
      repo: 'o/r',
      path: 'a b',
      ref: 'feat/x#1',
      page: 'dir/pá ge.md',
      anchor: 'configuración',
    }
    expect(parseRoute(formatRoute(route))).toEqual(route)
  })
})
