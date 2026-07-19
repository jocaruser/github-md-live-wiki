// Hash routes: #/<ref>/<path>[#<anchor>]
// Every dynamic part is URI-encoded on write and decoded on read: the ref as
// one segment (so branch names containing '/' stay unambiguous), the page
// path per segment (its '/' separators stay literal), and the anchor. A '#'
// inside a file name is therefore %23 and never collides with the anchor
// separator. An empty path means the content root (README.md).

export interface Route {
  ref: string
  path: string
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

function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/')
}

function decodePath(path: string): string {
  return path.split('/').map(safeDecode).join('/')
}

/**
 * The fragment as it appears in the serialized URL. Always read it from
 * location.href: unlike location.hash (which Firefox returns pre-decoded,
 * making '/' in refs ambiguous), the href serialization is identical across
 * browsers.
 */
export function hashOf(href: string): string {
  const i = href.indexOf('#')
  return i === -1 ? '' : href.slice(i)
}

export function formatRoute(route: Route): string {
  const anchor = route.anchor ? `#${encodeURIComponent(route.anchor)}` : ''
  return `#/${encodeURIComponent(route.ref)}/${encodePath(route.path)}${anchor}`
}

export function parseRoute(hash: string, defaultRef: string): Route {
  const raw = hash.startsWith('#/') ? hash.slice(2) : ''
  if (!raw) return { ref: defaultRef, path: '' }
  const slash = raw.indexOf('/')
  const refPart = slash === -1 ? raw : raw.slice(0, slash)
  const rest = slash === -1 ? '' : raw.slice(slash + 1)
  const hashIndex = rest.indexOf('#')
  const path = hashIndex === -1 ? rest : rest.slice(0, hashIndex)
  const anchor = hashIndex === -1 ? undefined : rest.slice(hashIndex + 1)
  return {
    ref: safeDecode(refPart) || defaultRef,
    path: decodePath(path),
    anchor: anchor ? safeDecode(anchor) : undefined,
  }
}
