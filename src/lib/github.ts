export interface RefInfo {
  name: string
  sha: string
}

export type WikiErrorKind = 'rate-limit' | 'not-found' | 'empty' | 'network'

export class WikiError extends Error {
  constructor(
    public kind: WikiErrorKind,
    message: string
  ) {
    super(message)
  }
}

const API = 'https://api.github.com'
const RAW = 'https://raw.githubusercontent.com'
const BRANCH_TTL_MS = 5 * 60 * 1000

interface TreeEntry {
  path: string
  type: string
}

async function apiGet<T>(url: string): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } })
  } catch {
    throw new WikiError('network', `Could not reach ${url}`)
  }
  if (res.status === 403 || res.status === 429) {
    if (res.headers.get('x-ratelimit-remaining') === '0') {
      const reset = Number(res.headers.get('x-ratelimit-reset') ?? 0) * 1000
      const minutes = reset ? Math.max(1, Math.ceil((reset - Date.now()) / 60000)) : 60
      throw new WikiError(
        'rate-limit',
        `GitHub API rate limit reached. It resets in about ${minutes} min.`
      )
    }
  }
  if (res.status === 404) throw new WikiError('not-found', `Not found: ${url}`)
  if (!res.ok) throw new WikiError('network', `GitHub responded ${res.status} for ${url}`)
  return (await res.json()) as T
}

function readCache<T>(key: string): T | undefined {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return undefined
    const entry = JSON.parse(raw) as { expires: number; value: T }
    if (entry.expires !== 0 && entry.expires < Date.now()) return undefined
    return entry.value
  } catch {
    return undefined
  }
}

function writeCache<T>(key: string, value: T, ttlMs: number): void {
  try {
    const expires = ttlMs === 0 ? 0 : Date.now() + ttlMs
    sessionStorage.setItem(key, JSON.stringify({ expires, value }))
  } catch {
    // Session cache is best-effort; a full store just means more requests.
  }
}

async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = readCache<T>(key)
  if (hit !== undefined) return hit
  const value = await load()
  writeCache(key, value, ttlMs)
  return value
}

/** The repository's default branch — the ref shown as "latest". */
export function fetchDefaultBranch(repo: string): Promise<string> {
  return cached(`sw:default:${repo}`, BRANCH_TTL_MS, async () => {
    const info = await apiGet<{ default_branch: string }>(`${API}/repos/${repo}`)
    return info.default_branch
  })
}

export function listTags(repo: string): Promise<RefInfo[]> {
  return cached(`sw:tags:${repo}`, BRANCH_TTL_MS, async () => {
    const tags = await apiGet<{ name: string; commit: { sha: string } }[]>(
      `${API}/repos/${repo}/tags?per_page=100`
    )
    return tags.map((t) => ({ name: t.name, sha: t.commit.sha }))
  })
}

export function listBranches(repo: string): Promise<RefInfo[]> {
  return cached(`sw:branches:${repo}`, BRANCH_TTL_MS, async () => {
    const branches = await apiGet<{ name: string; commit: { sha: string } }[]>(
      `${API}/repos/${repo}/branches?per_page=100`
    )
    return branches.map((b) => ({ name: b.name, sha: b.commit.sha }))
  })
}

// Only a full 40-hex id is safely immutable; anything shorter could equally
// be a branch or tag name that happens to be hex, which must refresh.
function looksLikeSha(ref: string): boolean {
  return /^[0-9a-f]{40}$/i.test(ref)
}

/** Encodes a ref for URL paths, keeping its '/' separators literal. */
export function encodeRefForUrl(ref: string): string {
  return ref.split('/').map(encodeURIComponent).join('/')
}

/** Encodes a file path for URLs, segment by segment. */
export function encodeUrlPath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/')
}

/**
 * Lists the .md pages under contentPath at the given ref (tag, branch or
 * commit sha), as paths relative to contentPath. Immutable refs cache for the
 * whole session; branch refs refresh every few minutes.
 */
/** Joins non-empty URL path segments, so an empty content path means the root. */
function joinUrlSegments(...parts: string[]): string {
  return parts.filter(Boolean).join('/')
}

/**
 * Lists the .md pages under contentPath at the given ref (tag, branch or
 * commit sha), as paths relative to contentPath. An empty contentPath means
 * the whole repository. Immutable refs cache for the whole session; branch
 * refs refresh every few minutes.
 */
export function fetchSpecPaths(repo: string, ref: string, contentPath: string): Promise<string[]> {
  const ttl = looksLikeSha(ref) ? 0 : BRANCH_TTL_MS
  return cached(`sw:tree:${repo}:${contentPath}:${ref}`, ttl, async () => {
    const tree = await apiGet<{ tree: TreeEntry[] }>(
      `${API}/repos/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`
    )
    const prefix = contentPath ? `${contentPath}/` : ''
    const paths = tree.tree
      .filter((e) => e.type === 'blob' && e.path.startsWith(prefix) && e.path.endsWith('.md'))
      .map((e) => e.path.slice(prefix.length))
      .sort()
    if (paths.length === 0) {
      const where = contentPath ? `under ${contentPath}/` : 'in the repository'
      throw new WikiError('empty', `No .md files ${where} at ${ref}`)
    }
    return paths
  })
}

export async function fetchFile(
  repo: string,
  ref: string,
  contentPath: string,
  path: string
): Promise<string> {
  let res: Response
  const url = `${RAW}/${repo}/${encodeRefForUrl(ref)}/${joinUrlSegments(encodeUrlPath(contentPath), encodeUrlPath(path))}`
  try {
    res = await fetch(url)
  } catch {
    throw new WikiError('network', `Could not reach ${url}`)
  }
  if (res.status === 404) throw new WikiError('not-found', `Not found at ${ref}: ${path}`)
  if (!res.ok) throw new WikiError('network', `GitHub responded ${res.status} for ${path}`)
  return res.text()
}
