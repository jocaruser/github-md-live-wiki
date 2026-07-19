import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { APP_NAME } from '../appMeta'
import { LanguageSelect } from './LanguageSelect'
import { Notice } from './Notice'
import { PageView } from './PageView'
import { RefSelector } from './RefSelector'
import { SearchBox } from './SearchBox'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import type { Theme } from '../hooks/useTheme'
import {
  encodeRefForUrl,
  encodeUrlPath,
  fetchDefaultBranch,
  fetchFile,
  fetchSpecPaths,
  listBranches,
  listTags,
  WikiError,
  type RefInfo,
} from '../lib/github'
import { addRecent } from '../lib/library'
import { createRenderer, extractTitle } from '../lib/markdown'
import { buildNav, isPublishedPath, pageTitle, type NavItem } from '../lib/nav'
import { formatRoute, type Route } from '../lib/route'
import {
  buildIndex,
  searchPages,
  stripMarkdown,
  type PageDoc,
  type SearchHit,
} from '../lib/search'
import { LANGUAGE_STORAGE_KEY, translationSupported } from '../lib/translate'
import type MiniSearch from 'minisearch'

interface WikiProps {
  repo: string
  route: Route
  onClose: () => void
  theme: Theme
  onToggleTheme: () => void
}

interface LoadedContent {
  texts: Map<string, string>
  titles: Map<string, string>
  nav: NavItem[]
  index: MiniSearch<PageDoc>
}

type ContentState =
  | { status: 'loading' }
  | { status: 'error'; error: WikiError }
  | { status: 'ready'; content: LoadedContent }

async function loadContent(repo: string, contentPath: string, ref: string): Promise<LoadedContent> {
  const allPaths = await fetchSpecPaths(repo, ref, contentPath)
  const paths = allPaths.filter(isPublishedPath)
  if (paths.length === 0) {
    throw new WikiError('empty', 'Nothing here is published (drafts are excluded)')
  }
  const texts = new Map<string, string>()
  await Promise.all(
    paths.map(async (path) => {
      try {
        texts.set(path, await fetchFile(repo, ref, contentPath, path))
      } catch {
        texts.set(path, `# ${path}\n\nThis file could not be loaded.`)
      }
    })
  )
  const titles = new Map<string, string>()
  for (const [path, text] of texts) {
    const title = extractTitle(text)
    if (title) titles.set(path, title)
  }
  const docs = paths.map((path) => ({
    path,
    title: pageTitle(path, titles),
    // Every path was just fetched (or given a placeholder) above.
    text: stripMarkdown(texts.get(path)!),
  }))
  return { texts, titles, nav: buildNav(paths, titles), index: buildIndex(docs) }
}

function errorNotice(error: WikiError, goHome: () => void) {
  const titles: Record<WikiError['kind'], string> = {
    'rate-limit': 'GitHub rate limit reached',
    'not-found': 'Nothing found at this version',
    empty: 'No pages at this version',
    network: 'Could not load the pages',
  }
  // "Back to latest" retries at the default branch; the top bar's Close wiki
  // button is always there to leave the repository entirely.
  return (
    <Notice title={titles[error.kind]} action={{ label: 'Back to latest', onClick: goHome }}>
      {error.message}
    </Notice>
  )
}

export function Wiki({ repo, route, onClose, theme, onToggleTheme }: WikiProps) {
  const contentPath = route.path
  const [defaultBranch, setDefaultBranch] = useState<string | null>(null)
  const [branchError, setBranchError] = useState<WikiError | null>(null)
  const [state, setState] = useState<ContentState>({ status: 'loading' })
  const [refs, setRefs] = useState<{ tags: RefInfo[]; branches: RefInfo[] }>({
    tags: [],
    branches: [],
  })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [lang, setLang] = useState(() => localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? '')
  const mainRef = useRef<HTMLElement>(null)

  const effectiveRef = route.ref ?? defaultBranch ?? undefined

  const changeLang = useCallback((next: string) => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, next)
    setLang(next)
  }, [])

  useEffect(() => {
    let stale = false
    fetchDefaultBranch(repo)
      .then((branch) => {
        if (stale) return
        setDefaultBranch(branch)
        addRecent({ repo, path: contentPath }) // the repo exists — remember it
      })
      .catch((error: unknown) => {
        if (!stale) {
          setBranchError(error instanceof WikiError ? error : new WikiError('network', String(error)))
        }
      })
    listTags(repo)
      .then((tags) => setRefs((current) => ({ ...current, tags })))
      .catch(() => {})
    listBranches(repo)
      .then((branches) => setRefs((current) => ({ ...current, branches })))
      .catch(() => {})
    return () => {
      stale = true
    }
  }, [repo, contentPath])

  useEffect(() => {
    if (!effectiveRef) return
    let stale = false
    setState({ status: 'loading' })
    loadContent(repo, contentPath, effectiveRef)
      .then((content) => {
        if (!stale) setState({ status: 'ready', content })
      })
      .catch((error: unknown) => {
        if (stale) return
        const wikiError =
          error instanceof WikiError ? error : new WikiError('network', String(error))
        setState({ status: 'error', error: wikiError })
      })
    return () => {
      stale = true
    }
  }, [repo, contentPath, effectiveRef])

  const render = useMemo(
    () =>
      effectiveRef
        ? createRenderer({ repo, contentPath, ref: effectiveRef, routeRef: route.ref })
        : null,
    [repo, contentPath, effectiveRef, route.ref]
  )

  const currentPage = route.page || 'README.md'
  const pageText = state.status === 'ready' ? state.content.texts.get(currentPage) : undefined
  const html = useMemo(
    () => (render && pageText !== undefined ? render(currentPage, pageText) : ''),
    [render, currentPage, pageText]
  )

  useEffect(() => {
    const title = state.status === 'ready' ? state.content.titles.get(currentPage) : undefined
    document.title = title ? `${title} · ${repo}` : `${repo} · ${APP_NAME}`
  }, [state, currentPage, repo])

  useEffect(() => {
    if (!html) return
    if (route.anchor) {
      document.getElementById(route.anchor)?.scrollIntoView()
    } else {
      mainRef.current?.scrollTo(0, 0)
    }
  }, [html, route.anchor])

  const navigate = useCallback(
    (page: string, ref: string | undefined) => {
      window.location.hash = formatRoute({ repo, path: contentPath, ref, page })
      setSidebarOpen(false)
    },
    [repo, contentPath]
  )
  const goToPage = useCallback((page: string) => navigate(page, route.ref), [navigate, route.ref])
  const selectRef = useCallback(
    (ref: string) => navigate(route.page, ref === defaultBranch ? undefined : ref),
    [navigate, route.page, defaultBranch]
  )
  const goHome = useCallback(() => navigate('', undefined), [navigate])
  const search = useCallback(
    (query: string): SearchHit[] =>
      state.status === 'ready' ? searchPages(state.content.index, query) : [],
    [state]
  )
  const linkFor = useCallback(
    (page: string) => formatRoute({ repo, path: contentPath, ref: route.ref, page }),
    [repo, contentPath, route.ref]
  )

  const sourceUrl = effectiveRef
    ? `https://github.com/${repo}/blob/${encodeRefForUrl(effectiveRef)}/${[
        encodeUrlPath(contentPath),
        encodeUrlPath(currentPage),
      ]
        .filter(Boolean)
        .join('/')}`
    : undefined

  if (branchError && !effectiveRef) {
    return (
      <div className="mx-auto max-w-xl px-6 pt-16">
        <Notice title={`Couldn’t open ${repo}`} action={{ label: 'Close wiki', onClick: onClose }}>
          {branchError.message}
        </Notice>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">
      <TopBar
        siteTitle={repo}
        homeHref={formatRoute({ repo, path: contentPath, ref: route.ref, page: '' })}
        repoUrl={`https://github.com/${repo}`}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        onClose={onClose}
      >
        <SearchBox search={search} onNavigate={goToPage} />
        {translationSupported() && <LanguageSelect lang={lang} onChange={changeLang} />}
        <RefSelector
          current={effectiveRef ?? '…'}
          defaultRef={defaultBranch ?? route.ref ?? ''}
          tags={refs.tags}
          branches={refs.branches}
          onSelect={selectRef}
        />
      </TopBar>
      <div className="flex min-h-0 flex-1">
        {state.status === 'ready' && (
          <Sidebar
            nav={state.content.nav}
            currentPath={currentPage}
            linkFor={linkFor}
            onLinkClick={() => setSidebarOpen(false)}
            open={sidebarOpen}
          />
        )}
        <main ref={mainRef} className="min-w-0 flex-1 overflow-y-auto">
          {state.status === 'loading' && (
            <p className="mt-16 text-center text-slate-500 dark:text-slate-400" role="status">
              Loading pages…
            </p>
          )}
          {state.status === 'error' && errorNotice(state.error, goHome)}
          {state.status === 'ready' &&
            (pageText === undefined ? (
              <Notice
                title="Page not found at this version"
                action={{ label: 'Go to overview', onClick: goHome }}
              >
                {currentPage} does not exist at {effectiveRef}.
              </Notice>
            ) : (
              <PageView
                key={`${effectiveRef}:${currentPage}:${lang}`}
                html={html}
                sourceUrl={sourceUrl}
                lang={lang}
              />
            ))}
        </main>
      </div>
    </div>
  )
}
