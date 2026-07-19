export interface WikiConfig {
  /** owner/name of the GitHub repository the .md content is pulled from */
  contentRepo: string
  /** directory inside the content repository that holds the wiki pages */
  contentPath: string
  siteTitle: string
  /** optional link back to the product the specs describe */
  appUrl: string
  /** branch shown as "latest" */
  defaultRef: string
  /** true when the container serves a mounted content directory */
  localContent: boolean
}

declare global {
  interface Window {
    __WIKI_CONFIG__?: Partial<WikiConfig>
  }
}

/** First non-empty string wins; the entrypoint writes '' for unset env vars. */
function pick(...values: (string | undefined)[]): string {
  return values.find((value) => typeof value === 'string' && value !== '') ?? ''
}

// Runtime values (docker/entrypoint.sh writes config.js from env) win over
// build-time VITE_* values, which only serve local `pnpm dev` sessions.
const runtime = window.__WIKI_CONFIG__ ?? {}

const contentRepo = pick(runtime.contentRepo, import.meta.env.VITE_CONTENT_REPO)
const repoName = contentRepo.split('/')[1] ?? ''

export const config: WikiConfig = {
  contentRepo,
  contentPath: pick(runtime.contentPath, import.meta.env.VITE_CONTENT_PATH, 'specs'),
  siteTitle: pick(
    runtime.siteTitle,
    import.meta.env.VITE_SITE_TITLE,
    repoName ? `${repoName} specs` : 'specs wiki'
  ),
  appUrl: pick(runtime.appUrl, import.meta.env.VITE_APP_URL),
  defaultRef: pick(runtime.defaultRef, import.meta.env.VITE_DEFAULT_REF, 'main'),
  localContent: runtime.localContent ?? false,
}

/** Pseudo-ref for the mounted content directory in local mode. */
export const LOCAL_REF = 'local'

/** Where the app starts without a route: the mounted directory when present. */
export const initialRef = config.localContent ? LOCAL_REF : config.defaultRef
