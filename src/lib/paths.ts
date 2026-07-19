// Browser-safe POSIX-style path helpers (no node:path in the bundle).

export function dirname(path: string): string {
  const i = path.lastIndexOf('/')
  return i === -1 ? '' : path.slice(0, i)
}

export function basename(path: string): string {
  const i = path.lastIndexOf('/')
  return i === -1 ? path : path.slice(i + 1)
}

/** Collapses '.', '..' and empty segments. Leading '..' segments survive. */
export function normalize(path: string): string {
  const out: string[] = []
  for (const seg of path.split('/')) {
    if (seg === '' || seg === '.') continue
    if (seg === '..' && out.length > 0 && out[out.length - 1] !== '..') {
      out.pop()
    } else {
      out.push(seg)
    }
  }
  return out.join('/')
}

export function join(...parts: string[]): string {
  return normalize(parts.filter(Boolean).join('/'))
}

export function escapesRoot(path: string): boolean {
  return path === '..' || path.startsWith('../')
}
