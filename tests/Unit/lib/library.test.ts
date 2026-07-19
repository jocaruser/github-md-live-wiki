import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  addRecent,
  getRecents,
  isValidRepo,
  normalizeSelection,
  removeRecent,
  selectionKey,
  type Selection,
} from '../../../src/lib/library'

const sel = (repo: string, path = ''): Selection => ({ repo, path })

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('isValidRepo', () => {
  it('accepts owner/name with the allowed characters', () => {
    expect(isValidRepo('jocaruser/illo3d')).toBe(true)
    expect(isValidRepo('a.b_c-d/e.f_g-h')).toBe(true)
  })

  it('rejects anything that is not exactly owner/name', () => {
    expect(isValidRepo('noslash')).toBe(false)
    expect(isValidRepo('too/many/parts')).toBe(false)
    expect(isValidRepo('has space/name')).toBe(false)
    expect(isValidRepo('/name')).toBe(false)
    expect(isValidRepo('owner/')).toBe(false)
  })
})

describe('normalizeSelection', () => {
  it('trims and strips wrapping slashes', () => {
    expect(normalizeSelection('  o/r  ', '  /docs/  ')).toEqual({ repo: 'o/r', path: 'docs' })
  })

  it('keeps an empty path empty', () => {
    expect(normalizeSelection('o/r', '')).toEqual({ repo: 'o/r', path: '' })
  })
})

describe('selectionKey', () => {
  it('distinguishes repo and path', () => {
    expect(selectionKey(sel('o/r', 'docs'))).not.toBe(selectionKey(sel('o/r', 'spec')))
    expect(selectionKey(sel('o/r', 'docs'))).toBe(selectionKey(sel('o/r', 'docs')))
  })
})

describe('recents', () => {
  it('starts empty', () => {
    expect(getRecents()).toEqual([])
  })

  it('adds to the front and de-duplicates by repo+path', () => {
    addRecent(sel('a/one', 'docs'))
    addRecent(sel('b/two'))
    const list = addRecent(sel('a/one', 'docs')) // move to front, no duplicate
    expect(list).toEqual([sel('a/one', 'docs'), sel('b/two')])
    expect(getRecents()).toEqual(list)
  })

  it('treats different paths of one repo as distinct entries', () => {
    addRecent(sel('a/one', 'docs'))
    const list = addRecent(sel('a/one', 'spec'))
    expect(list).toHaveLength(2)
  })

  it('caps the history at eight', () => {
    for (let i = 0; i < 12; i++) addRecent(sel(`owner/repo${i}`))
    const list = getRecents()
    expect(list).toHaveLength(8)
    expect(list[0]).toEqual(sel('owner/repo11'))
  })

  it('removes an entry', () => {
    addRecent(sel('a/one'))
    addRecent(sel('b/two'))
    const list = removeRecent(sel('a/one'))
    expect(list).toEqual([sel('b/two')])
  })

  it('ignores corrupted storage', () => {
    localStorage.setItem('gmlw:recents', 'not json')
    expect(getRecents()).toEqual([])
  })

  it('drops non-selection entries from storage', () => {
    localStorage.setItem('gmlw:recents', JSON.stringify([{ repo: 'bad' }, sel('o/r')]))
    expect(getRecents()).toEqual([sel('o/r')])
  })

  it('ignores a non-array recents value', () => {
    localStorage.setItem('gmlw:recents', JSON.stringify({ nope: true }))
    expect(getRecents()).toEqual([])
  })

  it('survives an unwritable store', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(() => addRecent(sel('o/r'))).not.toThrow()
  })
})
