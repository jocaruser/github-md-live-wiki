import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LanguageSelect } from './components/LanguageSelect'
import { Notice } from './components/Notice'
import { PageView } from './components/PageView'
import { RefSelector } from './components/RefSelector'
import { SearchBox } from './components/SearchBox'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { config, initialRef, LOCAL_REF } from './config'
import { useHashRoute } from './hooks/useHashRoute'
import { useTheme } from './hooks/useTheme'
import {
  encodeRefForUrl,
  encodeUrlPath,
  fetchFile,
  fetchLocalFile,
  fetchLocalPaths,
  fetchSpecPaths,
  listBranches,
  listTags,
  WikiError,
  type RefInfo,
} from './lib/github'
import { createRenderer, extractTitle } from './lib/markdown'
import { buildNav, isPublishedPath, pageTitle, type NavItem } from './lib/nav'
import { formatRoute, type Route } from './lib/route'
import {
  buildIndex,
  searchPages,
  stripMarkdown,
  type PageDoc,
  type SearchHit,
} from './lib/search'
import { LANGUAGE_STORAGE_KEY, translationSupported } from './lib/translate'
import type MiniSearch from 'minisearch'

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

async function loadContent(ref: string): Promise<LoadedContent> {
  const local = ref === LOCAL_REF
  const allPaths = local
    ? await fetchLocalPaths()
    : await fetchSpecPaths(config.contentRepo, ref, config.contentPath)
  const paths = allPaths.filter(isPublishedPath)
  if (paths.length === 0) {
    throw new WikiError('empty', 'Nothing here is published (drafts are excluded)')
  }
  const texts = new Map<string, string>()
  await Promise.all(
    paths.map(async (path) => {
      try {
        texts.set(
          path,
          local
            ? await fetchLocalFile(path)
            : await fetchFile(config.contentRepo, ref, config.contentPath, path)
        )
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
    empty: 'No specs at this version',
    network: 'Could not load the specs',
  }
  return (
    <Notice title={titles[error.kind]} action={{ label: 'Back to latest', onClick: goHome }}>
      {error.message}
    </Notice>
  )
}

export function App() {
  const route = useHashRoute(initialRef)
  const { theme, toggleTheme } = useTheme()
  const [state, setState] = useState<ContentState>({ status: 'loading' })
  const [refs, setRefs] = useState<{ tags: RefInfo[]; branches: RefInfo[] }>({
    tags: [],
    branches: [],
  })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [lang, setLang] = useState(() => localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? '')
  const mainRef = useRef<HTMLElement>(null)

  const changeLang = useCallback((next: string) => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, next)
    setLang(next)
  }, [])

  useEffect(() => {
    if (!config.contentRepo) return
    listTags(config.contentRepo)
      .then((tags) => setRefs((current) => ({ ...current, tags })))
      .catch(() => {})
    listBranches(config.contentRepo)
      .then((branches) => setRefs((current) => ({ ...current, branches })))
      .catch(() => {})
  }, [])

  useEffect(() => {
    let stale = false
    setState({ status: 'loading' })
    loadContent(route.ref)
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
  }, [route.ref])

  const render = useMemo(
    () =>
      createRenderer({
        repo: config.contentRepo,
        ref: route.ref,
        contentPath: config.contentPath,
        local: route.ref === LOCAL_REF,
        defaultRef: config.defaultRef,
      }),
    [route.ref]
  )

  const currentPath = route.path || 'README.md'
  const pageText = state.status === 'ready' ? state.content.texts.get(currentPath) : undefined
  const html = useMemo(
    () => (pageText === undefined ? '' : render(currentPath, pageText)),
    [render, currentPath, pageText]
  )

  useEffect(() => {
    const title = state.status === 'ready' ? state.content.titles.get(currentPath) : undefined
    document.title = title ? `${title} · ${config.siteTitle}` : config.siteTitle
  }, [state, currentPath])

  useEffect(() => {
    if (!html) return
    if (route.anchor) {
      document.getElementById(route.anchor)?.scrollIntoView()
    } else {
      mainRef.current?.scrollTo(0, 0)
    }
  }, [html, route.anchor])

  const goTo = useCallback((target: Route) => {
    window.location.hash = formatRoute(target)
    setSidebarOpen(false)
  }, [])
  const goHome = useCallback(() => goTo({ ref: initialRef, path: '' }), [goTo])
  const search = useCallback(
    (query: string): SearchHit[] =>
      state.status === 'ready' ? searchPages(state.content.index, query) : [],
    [state]
  )
  const linkFor = useCallback(
    (path: string) => formatRoute({ ref: route.ref, path }),
    [route.ref]
  )

  const sourceUrl =
    route.ref === LOCAL_REF || !config.contentRepo
      ? undefined
      : `https://github.com/${config.contentRepo}/blob/${encodeRefForUrl(route.ref)}/${encodeUrlPath(config.contentPath)}/${encodeUrlPath(currentPath)}`

  return (
    <div className="flex h-screen flex-col bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">
      <TopBar
        siteTitle={config.siteTitle}
        homeHref={formatRoute({ ref: route.ref, path: '' })}
        appUrl={config.appUrl}
        repoUrl={config.contentRepo ? `https://github.com/${config.contentRepo}` : undefined}
        theme={theme}
        onToggleTheme={toggleTheme}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
      >
        <SearchBox search={search} onNavigate={(path) => goTo({ ref: route.ref, path })} />
        {translationSupported() && <LanguageSelect lang={lang} onChange={changeLang} />}
        <RefSelector
          current={route.ref}
          defaultRef={config.defaultRef}
          tags={refs.tags}
          branches={refs.branches}
          localAvailable={config.localContent}
          onSelect={(ref) => goTo({ ref, path: route.path })}
        />
      </TopBar>
      <div className="flex min-h-0 flex-1">
        {state.status === 'ready' && (
          <Sidebar
            nav={state.content.nav}
            currentPath={currentPath}
            linkFor={linkFor}
            onLinkClick={() => setSidebarOpen(false)}
            open={sidebarOpen}
          />
        )}
        <main ref={mainRef} className="min-w-0 flex-1 overflow-y-auto">
          {state.status === 'loading' && (
            <p className="mt-16 text-center text-slate-500 dark:text-slate-400" role="status">
              Loading specs…
            </p>
          )}
          {state.status === 'error' && errorNotice(state.error, goHome)}
          {state.status === 'ready' &&
            (pageText === undefined ? (
              <Notice
                title="Page not found at this version"
                action={{ label: 'Go to overview', onClick: () => goTo({ ref: route.ref, path: '' }) }}
              >
                {currentPath} does not exist at {route.ref}.
              </Notice>
            ) : (
              <PageView
                key={`${route.ref}:${currentPath}:${lang}`}
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
