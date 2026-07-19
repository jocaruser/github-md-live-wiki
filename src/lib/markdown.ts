import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import css from 'highlight.js/lib/languages/css'
import diff from 'highlight.js/lib/languages/diff'
import json from 'highlight.js/lib/languages/json'
import markdown from 'highlight.js/lib/languages/markdown'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'
import MarkdownIt from 'markdown-it'
import anchor from 'markdown-it-anchor'
import taskLists from 'markdown-it-task-lists'
import { encodeRefForUrl, encodeUrlPath } from './github'
import { dirname, escapesRoot, join } from './paths'
import { formatRoute, safeDecode } from './route'

hljs.registerLanguage('bash', bash)
hljs.registerLanguage('css', css)
hljs.registerLanguage('diff', diff)
hljs.registerLanguage('json', json)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('javascript', typescript)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('yaml', yaml)

export interface RenderContext {
  repo: string
  /** concrete ref for raw/blob URLs (the resolved version being viewed) */
  ref: string
  /** directory inside the repo holding the pages; '' means the repo root */
  contentPath: string
  /** URL version to preserve in page links; undefined keeps them on "latest" */
  routeRef?: string
}

export function ghSlug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s+/g, '-')
}

/** First level-one heading outside code fences, backticks stripped. */
export function extractTitle(src: string): string | undefined {
  let inFence = false
  for (const line of src.split('\n')) {
    if (/^(```|~~~)/.test(line.trim())) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const match = /^#\s+(.+)$/.exec(line)
    if (match) return match[1].replace(/`/g, '').trim()
  }
  return undefined
}

// markdown-it stores link destinations percent-encoded; split first (a '#'
// inside a name is %23 at this point), then decode to real file-path text.
function splitAnchor(href: string): { file: string; anchor?: string } {
  const i = href.indexOf('#')
  const rawFile = i === -1 ? href : href.slice(0, i)
  const rawAnchor = i === -1 ? '' : href.slice(i + 1)
  return { file: safeDecode(rawFile), anchor: rawAnchor ? safeDecode(rawAnchor) : undefined }
}

/** Joins non-empty path segments (an empty content path means the repo root). */
function joinSegments(...parts: string[]): string {
  return parts.filter(Boolean).join('/')
}

/**
 * Maps a markdown link target to what it must be on the published wiki:
 * - links between pages become hash routes at the current ref
 * - non-md assets inside the content tree load from raw.githubusercontent.com
 * - links escaping the content tree but staying inside the repository open the
 *   file on GitHub at the matching ref
 * - external links, in-page anchors and links escaping the repository are left
 *   untouched (returns null)
 */
export function rewriteTarget(
  href: string,
  pagePath: string,
  ctx: RenderContext,
  isImage: boolean
): string | null {
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//') || href.startsWith('#')) {
    return null
  }
  const ref = encodeRefForUrl(ctx.ref)
  if (href.startsWith('/')) {
    return `https://github.com/${ctx.repo}/blob/${ref}${encodeUrlPath(safeDecode(href))}`
  }
  const { file, anchor: linkAnchor } = splitAnchor(href)
  if (!file) return null
  const resolved = join(dirname(pagePath), file)
  if (!escapesRoot(resolved)) {
    if (!isImage && resolved.endsWith('.md')) {
      return formatRoute({
        repo: ctx.repo,
        path: ctx.contentPath,
        ref: ctx.routeRef,
        page: resolved,
        anchor: linkAnchor,
      })
    }
    return `https://raw.githubusercontent.com/${ctx.repo}/${ref}/${joinSegments(encodeUrlPath(ctx.contentPath), encodeUrlPath(resolved))}`
  }
  const repoPath = join(ctx.contentPath, dirname(pagePath), file)
  if (!escapesRoot(repoPath)) {
    const suffix = linkAnchor ? `#${encodeURIComponent(linkAnchor)}` : ''
    return `https://github.com/${ctx.repo}/blob/${ref}/${encodeUrlPath(repoPath)}${suffix}`
  }
  return null
}

export function createRenderer(ctx: RenderContext): (pagePath: string, src: string) => string {
  const md = new MarkdownIt({
    html: false,
    linkify: true,
    highlight: (code, lang) =>
      lang && hljs.getLanguage(lang) ? hljs.highlight(code, { language: lang }).value : '',
  })
  md.use(anchor, { slugify: ghSlug, tabIndex: false })
  md.use(taskLists)
  md.core.ruler.push('github-md-live-wiki-links', (state) => {
    const { pagePath } = state.env as { pagePath: string }
    for (const token of state.tokens) {
      if (token.type !== 'inline') continue
      // Inline tokens always carry a children array.
      for (const child of token.children!) {
        if (child.type === 'link_open') {
          const href = child.attrGet('href')
          if (!href) continue
          const target = rewriteTarget(href, pagePath, ctx, false)
          if (target) child.attrSet('href', target)
        } else if (child.type === 'image') {
          const src = child.attrGet('src')
          if (!src) continue
          const target = rewriteTarget(src, pagePath, ctx, true)
          if (target) child.attrSet('src', target)
        }
      }
    }
  })
  return (pagePath, src) => md.render(src, { pagePath })
}
