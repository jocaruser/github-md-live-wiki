import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  collectTextNodes,
  getTranslator,
  translateInto,
  TRANSLATION_LANGUAGES,
  translationSupported,
  type TranslatorLike,
} from '../../../src/lib/translate'

afterEach(() => {
  delete window.Translator
})

function stubFactory(overrides: Partial<NonNullable<typeof window.Translator>> = {}) {
  const translator: TranslatorLike = { translate: async (text) => `[t]${text}` }
  window.Translator = {
    availability: async () => 'available',
    create: async () => translator,
    ...overrides,
  }
  return translator
}

describe('translationSupported', () => {
  it('is false without the browser API', () => {
    expect(translationSupported()).toBe(false)
  })

  it('is true with it', () => {
    stubFactory()
    expect(translationSupported()).toBe(true)
  })
})

describe('TRANSLATION_LANGUAGES', () => {
  it('offers a fixed set of languages', () => {
    expect(TRANSLATION_LANGUAGES.map((l) => l.code)).toEqual(['es', 'fr', 'de', 'it', 'pt', 'ja'])
  })
})

describe('getTranslator', () => {
  it('returns null without the browser API', async () => {
    expect(await getTranslator('es')).toBeNull()
  })

  it('returns null when the language pair is unavailable', async () => {
    const create = vi.fn()
    stubFactory({ availability: async () => 'unavailable', create })
    expect(await getTranslator('es')).toBeNull()
    expect(create).not.toHaveBeenCalled()
  })

  it('returns null when the API throws', async () => {
    stubFactory({
      create: async () => {
        throw new Error('download refused')
      },
    })
    expect(await getTranslator('es')).toBeNull()
  })

  it('creates a translator for an available pair', async () => {
    const translator = stubFactory()
    expect(await getTranslator('es')).toBe(translator)
  })
})

describe('collectTextNodes', () => {
  it('collects non-blank text nodes but never inside code', () => {
    const root = document.createElement('div')
    root.innerHTML =
      '<p>Read <a href="#/x">the guide</a> now.</p>' +
      '<pre><code>const keep = true</code></pre>' +
      '<p>Press <kbd>Enter</kbd> or <samp>ok</samp>.</p>' +
      '<p>   </p>'
    expect(collectTextNodes(root).map((node) => node.data)).toEqual([
      'Read ',
      'the guide',
      ' now.',
      'Press ',
      ' or ',
      '.',
    ])
  })
})

describe('translateInto', () => {
  it('translates text in place, preserving surrounding whitespace and code', async () => {
    const root = document.createElement('div')
    root.innerHTML = '<p>\n  spaced words \n</p><pre><code>left alone</code></pre>'
    const translator: TranslatorLike = { translate: async (text) => `«${text}»` }
    await translateInto(root, translator, 'es')
    expect(root.querySelector('p')?.textContent).toBe('\n  «spaced words» \n')
    expect(root.querySelector('code')?.textContent).toBe('left alone')
  })

  it('reuses the session cache for repeated phrases', async () => {
    const root = document.createElement('div')
    root.innerHTML = '<p>repeated-phrase-xyz</p><p>repeated-phrase-xyz</p>'
    const translate = vi.fn(async (text: string) => `[fr]${text}`)
    await translateInto(root, { translate }, 'fr')
    const again = document.createElement('div')
    again.innerHTML = '<p>repeated-phrase-xyz</p>'
    await translateInto(again, { translate }, 'fr')
    expect(again.textContent).toBe('[fr]repeated-phrase-xyz')
    expect(translate).toHaveBeenCalledTimes(1)
  })

  it('is idempotent — re-translating a node starts from its original text', async () => {
    const root = document.createElement('div')
    root.innerHTML = '<p>Hello</p>'
    const translator: TranslatorLike = { translate: async (text) => `«${text}»` }
    await translateInto(root, translator, 'es')
    await translateInto(root, translator, 'es')
    expect(root.querySelector('p')?.textContent).toBe('«Hello»')
  })

  it('propagates translator failures', async () => {
    const root = document.createElement('div')
    root.innerHTML = '<p>doomed-phrase</p>'
    const translator: TranslatorLike = {
      translate: async () => {
        throw new Error('model gone')
      },
    }
    await expect(translateInto(root, translator, 'de')).rejects.toThrow('model gone')
  })
})
