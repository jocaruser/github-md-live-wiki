import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  encodeRefForUrl,
  encodeUrlPath,
  fetchDefaultBranch,
  fetchFile,
  fetchSpecPaths,
  listBranches,
  listTags,
  WikiError,
} from '../../../src/lib/github'

describe('url encoding helpers', () => {
  it('encodes ref segments but keeps their separators', () => {
    expect(encodeRefForUrl('feat/gh#1 ü')).toBe('feat/gh%231%20%C3%BC')
  })

  it('encodes path segments but keeps their separators', () => {
    expect(encodeUrlPath('my dir/caf é.md')).toBe('my%20dir/caf%20%C3%A9.md')
  })
})

function response(
  status: number,
  body: unknown,
  headers: Record<string, string> = {}
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (key: string) => headers[key.toLowerCase()] ?? null },
    json: async () => body,
    text: async () => String(body),
  } as unknown as Response
}

function stubFetch(...results: (Response | Error)[]) {
  const mock = vi.fn()
  for (const result of results) {
    if (result instanceof Error) mock.mockRejectedValueOnce(result)
    else mock.mockResolvedValueOnce(result)
  }
  vi.stubGlobal('fetch', mock)
  return mock
}

async function kindOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise
    return 'ok'
  } catch (error) {
    return error instanceof WikiError ? error.kind : 'other'
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchDefaultBranch', () => {
  it('returns the repository default branch', async () => {
    stubFetch(response(200, { default_branch: 'trunk' }))
    expect(await fetchDefaultBranch('o/r')).toBe('trunk')
  })

  it('caches per session', async () => {
    const mock = stubFetch(response(200, { default_branch: 'main' }))
    await fetchDefaultBranch('o/r')
    await fetchDefaultBranch('o/r')
    expect(mock).toHaveBeenCalledTimes(1)
  })

  it('maps a missing repository to not-found', async () => {
    stubFetch(response(404, {}))
    expect(await kindOf(fetchDefaultBranch('o/missing'))).toBe('not-found')
  })
})

describe('listTags / listBranches', () => {
  it('maps names and shas', async () => {
    stubFetch(response(200, [{ name: 'v1.0.0', commit: { sha: 'abc' } }]))
    expect(await listTags('o/r')).toEqual([{ name: 'v1.0.0', sha: 'abc' }])
  })

  it('caches per session', async () => {
    const mock = stubFetch(response(200, [{ name: 'main', commit: { sha: 'def' } }]))
    await listBranches('o/r')
    await listBranches('o/r')
    expect(mock).toHaveBeenCalledTimes(1)
  })

  it('reloads when the cached entry has expired', async () => {
    const mock = stubFetch(
      response(200, [{ name: 'main', commit: { sha: 'a' } }]),
      response(200, [{ name: 'main', commit: { sha: 'b' } }])
    )
    await listBranches('o/r')
    const key = 'sw:branches:o/r'
    const entry = JSON.parse(sessionStorage.getItem(key)!) as { expires: number }
    sessionStorage.setItem(key, JSON.stringify({ ...entry, expires: Date.now() - 1 }))
    expect(await listBranches('o/r')).toEqual([{ name: 'main', sha: 'b' }])
    expect(mock).toHaveBeenCalledTimes(2)
  })

  it('survives a corrupted cache entry', async () => {
    sessionStorage.setItem('sw:tags:o/r', 'not json')
    stubFetch(response(200, []))
    expect(await listTags('o/r')).toEqual([])
  })

  it('survives an unwritable cache', async () => {
    const setItem = vi.spyOn(sessionStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    stubFetch(response(200, []))
    expect(await listTags('o/r')).toEqual([])
    setItem.mockRestore()
  })
})

describe('fetchSpecPaths', () => {
  const tree = (paths: string[]) =>
    response(200, { tree: paths.map((path) => ({ path, type: 'blob' })) })

  it('filters to .md files under the content path, relative and sorted', async () => {
    stubFetch(
      response(200, {
        tree: [
          { path: 'specs/b.md', type: 'blob' },
          { path: 'specs/a.md', type: 'blob' },
          { path: 'specs/img.png', type: 'blob' },
          { path: 'specs/sub', type: 'tree' },
          { path: 'src/x.md', type: 'blob' },
        ],
      })
    )
    expect(await fetchSpecPaths('o/r', 'main', 'specs')).toEqual(['a.md', 'b.md'])
  })

  it('lists the whole repository when the content path is empty', async () => {
    stubFetch(
      response(200, {
        tree: [
          { path: 'README.md', type: 'blob' },
          { path: 'docs/a.md', type: 'blob' },
          { path: 'img.png', type: 'blob' },
        ],
      })
    )
    expect(await fetchSpecPaths('o/r', 'main', '')).toEqual(['README.md', 'docs/a.md'])
  })

  it('reports emptiness differently for root vs a subdirectory', async () => {
    stubFetch(response(200, { tree: [] }))
    const rootError = (await fetchSpecPaths('o/r', 'main', '').catch((e) => e)) as WikiError
    expect(rootError.message).toContain('in the repository')
  })

  it('encodes the ref in the tree request', async () => {
    const mock = stubFetch(tree(['specs/a.md']))
    await fetchSpecPaths('o/r', 'feat/x', 'specs')
    expect(String(mock.mock.calls[0][0])).toContain('/git/trees/feat%2Fx?recursive=1')
  })

  it('throws empty when nothing matches', async () => {
    stubFetch(tree(['src/other.md']))
    expect(await kindOf(fetchSpecPaths('o/r', 'main', 'specs'))).toBe('empty')
  })

  it('caches commit shas for the whole session', async () => {
    const sha = 'a'.repeat(40)
    const mock = stubFetch(tree(['specs/a.md']))
    await fetchSpecPaths('o/r', sha, 'specs')
    await fetchSpecPaths('o/r', sha, 'specs')
    expect(mock).toHaveBeenCalledTimes(1)
    const entry = JSON.parse(
      sessionStorage.getItem(`sw:tree:o/r:specs:${sha}`)!
    ) as { expires: number }
    expect(entry.expires).toBe(0)
  })

  it('treats short hex names as refreshable refs, not immutable shas', async () => {
    stubFetch(tree(['specs/a.md']))
    await fetchSpecPaths('o/r', 'deadbee', 'specs')
    const entry = JSON.parse(
      sessionStorage.getItem('sw:tree:o/r:specs:deadbee')!
    ) as { expires: number }
    expect(entry.expires).toBeGreaterThan(0)
  })

  it('reports the rate limit with its reset time', async () => {
    stubFetch(
      response(403, {}, {
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': String(Math.round(Date.now() / 1000) + 600),
      })
    )
    const error = (await fetchSpecPaths('o/r', 'main', 'specs').catch((e) => e)) as WikiError
    expect(error.kind).toBe('rate-limit')
    expect(error.message).toMatch(/1[01] min/)
  })

  it('reports the rate limit without a reset header', async () => {
    stubFetch(response(429, {}, { 'x-ratelimit-remaining': '0' }))
    const error = (await fetchSpecPaths('o/r', 'main', 'specs').catch((e) => e)) as WikiError
    expect(error.kind).toBe('rate-limit')
    expect(error.message).toContain('60 min')
  })

  it('treats a non-rate-limit 403 as a network error', async () => {
    stubFetch(response(403, {}, { 'x-ratelimit-remaining': '10' }))
    expect(await kindOf(fetchSpecPaths('o/r', 'main', 'specs'))).toBe('network')
  })

  it('maps 404 to not-found', async () => {
    stubFetch(response(404, {}))
    expect(await kindOf(fetchSpecPaths('o/r', 'deadbeef', 'specs'))).toBe('not-found')
  })

  it('maps other statuses to network errors', async () => {
    stubFetch(response(500, {}))
    expect(await kindOf(fetchSpecPaths('o/r', 'main', 'specs'))).toBe('network')
  })

  it('maps fetch failures to network errors', async () => {
    stubFetch(new Error('offline'))
    expect(await kindOf(fetchSpecPaths('o/r', 'main', 'specs'))).toBe('network')
  })
})

describe('fetchFile', () => {
  it('reads raw content with encoded path segments', async () => {
    const mock = stubFetch(response(200, '# hi'))
    expect(await fetchFile('o/r', 'main', 'my specs', 'a b/c.md')).toBe('# hi')
    expect(String(mock.mock.calls[0][0])).toBe(
      'https://raw.githubusercontent.com/o/r/main/my%20specs/a%20b/c.md'
    )
  })

  it('encodes awkward ref names so they cannot truncate the URL', async () => {
    const mock = stubFetch(response(200, '# hi'))
    await fetchFile('o/r', 'gh#123', 'specs', 'a.md')
    expect(String(mock.mock.calls[0][0])).toBe(
      'https://raw.githubusercontent.com/o/r/gh%23123/specs/a.md'
    )
  })

  it('omits the content path segment when it is empty (repo root)', async () => {
    const mock = stubFetch(response(200, '# root'))
    await fetchFile('o/r', 'main', '', 'README.md')
    expect(String(mock.mock.calls[0][0])).toBe(
      'https://raw.githubusercontent.com/o/r/main/README.md'
    )
  })

  it('maps 404 to not-found', async () => {
    stubFetch(response(404, ''))
    expect(await kindOf(fetchFile('o/r', 'main', 'specs', 'a.md'))).toBe('not-found')
  })

  it('maps other statuses to network errors', async () => {
    stubFetch(response(500, ''))
    expect(await kindOf(fetchFile('o/r', 'main', 'specs', 'a.md'))).toBe('network')
  })

  it('maps fetch failures to network errors', async () => {
    stubFetch(new Error('offline'))
    expect(await kindOf(fetchFile('o/r', 'main', 'specs', 'a.md'))).toBe('network')
  })
})
