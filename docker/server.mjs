/**
 * Dependency-free static server for the built single-page app. The app is
 * entirely client-side (it fetches content from GitHub in the browser), so the
 * server only needs to serve the bundle and fall back to index.html for the
 * app's own routes. Every served path is confined to the site directory.
 */
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, normalize, resolve } from 'node:path'

function realRoot(path) {
  return existsSync(path) ? realpathSync(path) : resolve(path)
}

const SITE = realRoot(process.env.SITE_DIR ?? '/site')
const PORT = Number(process.env.PORT ?? 5176)

const TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
}

function send(res, status, body, type, cache = 'no-cache') {
  res.writeHead(status, {
    'content-type': type,
    'cache-control': cache,
    'x-content-type-options': 'nosniff',
  })
  res.end(body)
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

function serve(res, file, cache) {
  const type = TYPES[extname(file)] ?? 'application/octet-stream'
  return send(res, 200, readFileSync(file), type, cache)
}

const server = createServer((req, res) => {
  let url
  try {
    url = decodeURIComponent((req.url ?? '/').split('?')[0])
  } catch {
    return send(res, 400, 'bad request', 'text/plain; charset=utf-8')
  }
  try {
    if (url === '/') {
      return serve(res, `${SITE}/index.html`, 'no-cache')
    }
    const target = safeChild(SITE, url.slice(1))
    if (target) {
      const cache = url.startsWith('/assets/')
        ? 'public, max-age=31536000, immutable'
        : 'no-cache'
      return serve(res, target, cache)
    }
    // Unknown non-asset path → the SPA shell (hash routing resolves it).
    if (!url.startsWith('/assets/') && !extname(url)) {
      return serve(res, `${SITE}/index.html`, 'no-cache')
    }
    return send(res, 404, 'not found', 'text/plain; charset=utf-8')
  } catch (error) {
    console.error('github-md-live-wiki server error:', error)
    return send(res, 500, 'server error', 'text/plain; charset=utf-8')
  }
})

server.listen(PORT, () => {
  console.log(`github-md-live-wiki: serving on :${PORT}`)
})
