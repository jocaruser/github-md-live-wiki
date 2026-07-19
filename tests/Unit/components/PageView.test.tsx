import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PageView } from '../../../src/components/PageView'
import type { TranslatorLike } from '../../../src/lib/translate'

afterEach(() => {
  delete window.Translator
})

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function stubTranslator(translate: TranslatorLike['translate']) {
  window.Translator = {
    availability: async () => 'available',
    create: async () => ({ translate }),
  }
}

describe('PageView', () => {
  it('renders the html and the source link', () => {
    render(
      <PageView
        html="<h1>Hello</h1>"
        sourceUrl="https://github.com/o/r/blob/main/specs/a.md"
        lang=""
      />
    )
    expect(screen.getByRole('heading', { name: 'Hello' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View this page on GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/o/r/blob/main/specs/a.md'
    )
  })

  it('omits the footer without a source url', () => {
    render(<PageView html="<p>x</p>" lang="" />)
    expect(screen.queryByRole('link', { name: 'View this page on GitHub' })).not.toBeInTheDocument()
  })

  it('scrolls smoothly to in-page anchors instead of navigating', () => {
    const scroll = vi.spyOn(Element.prototype, 'scrollIntoView')
    render(<PageView html='<a href="#target">jump</a><h2 id="target">T</h2>' lang="" />)
    fireEvent.click(screen.getByRole('link', { name: 'jump' }))
    expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth' })
    scroll.mockRestore()
  })

  it('leaves route links (which carry query params) to the router', () => {
    const scroll = vi.spyOn(Element.prototype, 'scrollIntoView')
    render(<PageView html='<a href="#r=o/r&f=a.md">page</a>' lang="" />)
    fireEvent.click(screen.getByRole('link', { name: 'page' }))
    expect(scroll).not.toHaveBeenCalled()
    scroll.mockRestore()
  })

  it('ignores clicks outside links', () => {
    const scroll = vi.spyOn(Element.prototype, 'scrollIntoView')
    render(<PageView html="<p>plain text</p>" lang="" />)
    fireEvent.click(screen.getByText('plain text'))
    expect(scroll).not.toHaveBeenCalled()
    scroll.mockRestore()
  })

  it('lets modified clicks fall through to the browser', () => {
    const scroll = vi.spyOn(Element.prototype, 'scrollIntoView')
    render(<PageView html='<a href="#target">jump</a><h2 id="target">T</h2>' lang="" />)
    fireEvent.click(screen.getByRole('link', { name: 'jump' }), { ctrlKey: true })
    expect(scroll).not.toHaveBeenCalled()
    scroll.mockRestore()
  })

  it('decodes anchor targets before looking them up', () => {
    const scroll = vi.spyOn(Element.prototype, 'scrollIntoView')
    render(
      <PageView
        html='<a href="#configuraci%C3%B3n">go</a><h2 id="configuración">C</h2>'
        lang=""
      />
    )
    fireEvent.click(screen.getByRole('link', { name: 'go' }))
    expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth' })
    scroll.mockRestore()
  })

  it('translates the page when a language is chosen, leaving code alone', async () => {
    stubTranslator(async (text) => `«${text}»`)
    render(<PageView html="<p>Hello page</p><pre><code>const x = 1</code></pre>" lang="es" />)
    await waitFor(() => expect(screen.getByText('«Hello page»')).toBeInTheDocument())
    expect(screen.getByText('const x = 1')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('announces while the translation runs', async () => {
    const gate = deferred<string>()
    stubTranslator(() => gate.promise)
    render(<PageView html="<p>Wait for it</p>" lang="es" />)
    expect(await screen.findByRole('status')).toHaveTextContent('Translating…')
    gate.resolve('Listo')
    await waitFor(() => expect(screen.getByText('Listo')).toBeInTheDocument())
  })

  it('reports when translation is unsupported', async () => {
    render(<PageView html="<p>Untranslatable</p>" lang="es" />)
    expect(
      await screen.findByText(/Automatic translation is unavailable/)
    ).toBeInTheDocument()
    expect(screen.getByText('Untranslatable')).toBeInTheDocument()
  })

  it('reports when the translator fails mid-page', async () => {
    stubTranslator(async () => {
      throw new Error('model gone')
    })
    render(<PageView html="<p>Fragile line</p>" lang="es" />)
    expect(
      await screen.findByText(/Automatic translation is unavailable/)
    ).toBeInTheDocument()
  })

  it('ignores a translator that resolves after unmount', async () => {
    const gate = deferred<TranslatorLike>()
    window.Translator = { availability: async () => 'available', create: () => gate.promise }
    const { unmount } = render(<PageView html="<p>Too late</p>" lang="es" />)
    unmount()
    gate.resolve({ translate: async (text) => text })
    await Promise.resolve()
  })

  it('ignores a translation that finishes after unmount', async () => {
    const gate = deferred<string>()
    stubTranslator(() => gate.promise)
    const { unmount } = render(<PageView html="<p>Slow page</p>" lang="es" />)
    await screen.findByRole('status')
    unmount()
    gate.resolve('tarde')
    await Promise.resolve()
  })

  it('ignores a translation failure after unmount', async () => {
    const gate = deferred<string>()
    stubTranslator(() => gate.promise)
    const { unmount } = render(<PageView html="<p>Doomed page</p>" lang="es" />)
    await screen.findByRole('status')
    unmount()
    gate.reject(new Error('too late to matter'))
    await Promise.resolve()
  })
})
