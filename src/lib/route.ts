// The URL is the single source of truth for what the reader is viewing, so
// every link is shareable. The state lives in the hash (a static host has no
// server-side routing) as a small query:
//
//   #r=<repo>&p=<path>&v=<ref>&f=<page>&a=<anchor>
//
//   r  owner/name of the repository        (absent → the landing form)
//   p  content directory inside the repo    (absent → the repository root)
//   v  version: tag, branch or commit id    (absent → the default branch, "latest")
//   f  page file within the content dir      (absent → the overview / README)
//   a  in-page anchor                        (absent → top of page)
//
// Slashes are kept literal for readability; everything else is percent-encoded.

export interface Route {
  repo?: string
  path: string
  ref?: string
  page: string
  anchor?: string
}

/** decodeURIComponent that tolerates malformed escapes (truncated links). */
export function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/** Percent-encodes a value but leaves '/' literal (safe and readable in a fragment). */
function enc(value: string): string {
  return encodeURIComponent(value).replace(/%2F/gi, '/')
}

/**
 * The fragment as it appears in the serialized URL. Always read it from
 * location.href: unlike location.hash (which Firefox returns pre-decoded), the
 * href serialization is identical across browsers.
 */
export function hashOf(href: string): string {
  const i = href.indexOf('#')
  return i === -1 ? '' : href.slice(i)
}

export function formatRoute(route: Route): string {
  if (!route.repo) return ''
  const parts = [`r=${enc(route.repo)}`]
  if (route.path) parts.push(`p=${enc(route.path)}`)
  if (route.ref) parts.push(`v=${enc(route.ref)}`)
  if (route.page) parts.push(`f=${enc(route.page)}`)
  if (route.anchor) parts.push(`a=${enc(route.anchor)}`)
  return `#${parts.join('&')}`
}

export function parseRoute(hash: string): Route {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  const params = new Map<string, string>()
  for (const pair of raw.split('&')) {
    if (!pair) continue
    const eq = pair.indexOf('=')
    const key = eq === -1 ? pair : pair.slice(0, eq)
    const value = eq === -1 ? '' : pair.slice(eq + 1)
    if (!params.has(key)) params.set(key, safeDecode(value))
  }
  const repo = params.get('r')
  return {
    repo: repo || undefined,
    path: params.get('p') ?? '',
    ref: params.get('v') || undefined,
    page: params.get('f') ?? '',
    anchor: params.get('a') || undefined,
  }
}
