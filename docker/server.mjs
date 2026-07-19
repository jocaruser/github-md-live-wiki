/**
 * Dependency-free static server for the built shell, plus two endpoints that
 * expose a mounted content directory to the SPA's local mode:
 *   GET /__local/manifest     -> { paths: [".md files relative to /content"] }
 *   GET /__local/file/<path>  -> raw file body (allow-listed extensions only)
 *
 * Symlinks inside the content mount are refused: every served path must
 * resolve (realpath) inside its root, and directory walks skip links.
 */
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'

function realRoot(path) {
  return existsSync(path) ? realpathSync(path) : resolve(path)
}

const SITE = realRoot(process.env.SITE_DIR ?? '/site')
const CONTENT = realRoot(process.env.CONTENT_DIR ?? '/content')
const PORT = Number(process.env.PORT ?? 5176)

const TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
}

// Local content is arbitrary repository data; only serve types the wiki
// actually embeds, and never with a script-capable content type.
const LOCAL_TYPES = {
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8',
}

function send(res, status, body, type, cache = 'no-cache') {
  res.writeHead(status, {
    'content-type': type,
    'cache-control': cache,
    'x-content-type-options': 'nosniff',
  })
  res.end(body)
}

function listMarkdown(dir, prefix = '') {
  const paths = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
    if (entry.isSymbolicLink()) continue
    if (entry.isDirectory()) {
      paths.push(...listMarkdown(join(dir, entry.name), `${prefix}${entry.name}/`))
    } else if (entry.name.endsWith('.md')) {
      paths.push(`${prefix}${entry.name}`)
    }
  }
  return paths
}

/** Resolves a request path to a real file strictly inside root, or undefined. */
function safeChild(root, relative) {
  const target = resolve(root, normalize(relative))
  if (!target.startsWith(`${root}/`)) return undefined
  if (!existsSync(target)) return undefined
  const real = realpathSync(target)
  if (!real.startsWith(`${root}/`)) return undefined
  if (!statSync(real).isFile()) return undefined
  return real
}

const server = createServer((req, res) => {
  let url
  try {
    url = decodeURIComponent((req.url ?? '/').split('?')[0])
  } catch {
    return send(res, 400, 'bad request', 'text/plain; charset=utf-8')
  }
  try {
    if (url === '/__local/manifest') {
      if (!existsSync(CONTENT)) {
        return send(res, 404, 'no local content', 'text/plain; charset=utf-8')
      }
      const body = JSON.stringify({ paths: listMarkdown(CONTENT) })
      return send(res, 200, body, 'application/json; charset=utf-8')
    }
    if (url.startsWith('/__local/file/')) {
      const type = LOCAL_TYPES[extname(url).toLowerCase()]
      const target = type && safeChild(CONTENT, url.slice('/__local/file/'.length))
      if (!target) return send(res, 404, 'not found', 'text/plain; charset=utf-8')
      return send(res, 200, readFileSync(target), type)
    }
    const target = safeChild(SITE, url === '/' ? 'index.html' : url.slice(1))
    if (!target) return send(res, 404, 'not found', 'text/plain; charset=utf-8')
    const type = TYPES[extname(target)] ?? 'application/octet-stream'
    const cache = url.startsWith('/assets/')
      ? 'public, max-age=31536000, immutable'
      : 'no-cache'
    return send(res, 200, readFileSync(target), type, cache)
  } catch (error) {
    console.error('github-md-live-wiki server error:', error)
    return send(res, 500, 'server error', 'text/plain; charset=utf-8')
  }
})

server.listen(PORT, () => {
  console.log(
    `github-md-live-wiki: serving on :${PORT}${existsSync(CONTENT) ? ' (local content mounted)' : ''}`
  )
})
