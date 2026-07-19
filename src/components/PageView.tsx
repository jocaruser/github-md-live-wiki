import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { safeDecode } from '../lib/route'
import { getTranslator, translateInto } from '../lib/translate'

interface PageViewProps {
  html: string
  sourceUrl?: string
  /** BCP-47 target language, or '' for the original text. */
  lang: string
}

type TranslationStatus = 'original' | 'translating' | 'translated' | 'failed'

/**
 * Renders a page's HTML. Rendering is safe against injection because the
 * markdown pipeline has raw HTML disabled; every tag here came from
 * markdown-it's own renderer.
 *
 * The parent remounts this component (key) when the page or language changes,
 * so translation always starts from the pristine rendered text.
 */
export function PageView({ html, sourceUrl, lang }: PageViewProps) {
  const articleRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<TranslationStatus>('original')

  useEffect(() => {
    if (!lang) return
    let stale = false
    setStatus('translating')
    ;(async () => {
      const translator = await getTranslator(lang)
      if (stale) return
      if (!translator) {
        setStatus('failed')
        return
      }
      await translateInto(articleRef.current!, translator, lang)
      if (!stale) setStatus('translated')
    })().catch(() => {
      if (!stale) setStatus('failed')
    })
    return () => {
      stale = true
    }
  }, [lang])

  const onClick = (event: MouseEvent<HTMLElement>) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
    const link = (event.target as HTMLElement).closest('a')
    const href = link?.getAttribute('href') ?? ''
    // A bare fragment (no query params) is an in-page anchor; a route link is
    // "#r=…". Scroll for the former, let the router handle the latter.
    if (href.startsWith('#') && !href.includes('=')) {
      event.preventDefault()
      document.getElementById(safeDecode(href.slice(1)))?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      {status === 'translating' && (
        <p role="status" className="mb-4 text-sm text-slate-400">
          Translating…
        </p>
      )}
      {status === 'failed' && (
        <p className="mb-4 text-sm text-amber-600 dark:text-amber-400">
          Automatic translation is unavailable for this language in this browser.
        </p>
      )}
      <article
        ref={articleRef}
        className="prose prose-slate max-w-none dark:prose-invert prose-headings:scroll-mt-20"
        onClick={onClick}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {sourceUrl && (
        <footer className="mt-12 border-t border-slate-200 pt-4 text-sm dark:border-slate-700">
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-indigo-600 hover:underline dark:text-indigo-400"
          >
            View this page on GitHub
          </a>
        </footer>
      )}
    </div>
  )
}
