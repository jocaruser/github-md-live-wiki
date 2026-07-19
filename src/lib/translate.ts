// Automatic page translation via the browser's built-in Translator API
// (shipped in Chromium; on-device, no keys). Content is authored in English;
// the reader picks a target language and the rendered page is translated in
// place. Where the API is missing the feature simply does not appear.

export interface TranslatorLike {
  translate(text: string): Promise<string>
}

interface TranslatorFactory {
  availability(options: { sourceLanguage: string; targetLanguage: string }): Promise<string>
  create(options: { sourceLanguage: string; targetLanguage: string }): Promise<TranslatorLike>
}

declare global {
  interface Window {
    Translator?: TranslatorFactory
  }
}

export const SOURCE_LANGUAGE = 'en'

export const LANGUAGE_STORAGE_KEY = 'github-md-live-wiki-language'

export const TRANSLATION_LANGUAGES = [
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
  { code: 'ja', label: '日本語' },
] as const

export function translationSupported(): boolean {
  return window.Translator !== undefined
}

/** Returns a translator for English → target, or null when it cannot exist. */
export async function getTranslator(targetLanguage: string): Promise<TranslatorLike | null> {
  const factory = window.Translator
  if (!factory) return null
  try {
    const availability = await factory.availability({
      sourceLanguage: SOURCE_LANGUAGE,
      targetLanguage,
    })
    if (availability === 'unavailable') return null
    return await factory.create({ sourceLanguage: SOURCE_LANGUAGE, targetLanguage })
  } catch {
    return null
  }
}

/** Code stays verbatim: translating identifiers or commands corrupts them. */
const UNTRANSLATED_TAGS = new Set(['CODE', 'PRE', 'KBD', 'SAMP'])

export function collectTextNodes(root: Node): Text[] {
  const nodes: Text[] = []
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if ((node as Text).data.trim()) nodes.push(node as Text)
      return
    }
    if (node instanceof Element && UNTRANSLATED_TAGS.has(node.tagName)) return
    node.childNodes.forEach(walk)
  }
  walk(root)
  return nodes
}

// Each text node's pristine text, remembered so translating the same node
// twice (React StrictMode re-invokes the mount effect in development) starts
// from the original rather than compounding onto already-translated text.
const originalText = new WeakMap<Text, string>()

// Translations are cached per language for the session (as promises, so a
// phrase appearing twice on one page is only translated once even while the
// first translation is still running). Failed translations are evicted.
const textCaches = new Map<string, Map<string, Promise<string>>>()

function textCacheFor(targetLanguage: string): Map<string, Promise<string>> {
  let cache = textCaches.get(targetLanguage)
  if (!cache) {
    cache = new Map()
    textCaches.set(targetLanguage, cache)
  }
  return cache
}

/** Translates every text node under root in place, preserving whitespace. */
export async function translateInto(
  root: HTMLElement,
  translator: TranslatorLike,
  targetLanguage: string
): Promise<void> {
  const cache = textCacheFor(targetLanguage)
  await Promise.all(
    collectTextNodes(root).map(async (node) => {
      let original = originalText.get(node)
      if (original === undefined) {
        original = node.data
        originalText.set(node, original)
      }
      const text = original.trim()
      const leading = original.slice(0, original.indexOf(text[0]))
      const trailing = original.slice(leading.length + text.length)
      let pending = cache.get(text)
      if (!pending) {
        pending = translator.translate(text)
        cache.set(text, pending)
        pending.catch(() => cache.delete(text))
      }
      node.data = leading + (await pending) + trailing
    })
  )
}
