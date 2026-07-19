import '@testing-library/jest-dom/vitest'

// Node's own experimental localStorage/sessionStorage globals shadow jsdom's
// and are non-functional without extra flags, so install deterministic stubs.
function memoryStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length() {
      return store.size
    },
    key: (index: number) => [...store.keys()][index] ?? null,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value))
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
  }
}

for (const name of ['localStorage', 'sessionStorage'] as const) {
  const stub = memoryStorage()
  Object.defineProperty(globalThis, name, { value: stub, configurable: true, writable: true })
  Object.defineProperty(window, name, { value: stub, configurable: true, writable: true })
}

// jsdom lacks matchMedia and the scroll APIs the app calls.
function stubMatchMedia(matches: boolean): void {
  window.matchMedia = ((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

stubMatchMedia(false)
Element.prototype.scrollIntoView = () => {}
Element.prototype.scrollTo = (() => {}) as Element['scrollTo']

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
  window.location.hash = ''
  stubMatchMedia(false)
})

export { stubMatchMedia }
