import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

async function loadConfig() {
  const module = await import('../../src/config')
  return { ...module.config, initialRef: module.initialRef }
}

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  delete window.__WIKI_CONFIG__
  vi.unstubAllEnvs()
})

describe('config', () => {
  it('prefers runtime values written by the container entrypoint', async () => {
    window.__WIKI_CONFIG__ = {
      contentRepo: 'jocaruser/illo3d',
      contentPath: 'documents',
      siteTitle: 'illo3d specs',
      appUrl: 'https://example.test/app',
      defaultRef: 'trunk',
      localContent: true,
    }
    expect(await loadConfig()).toEqual({
      contentRepo: 'jocaruser/illo3d',
      contentPath: 'documents',
      siteTitle: 'illo3d specs',
      appUrl: 'https://example.test/app',
      defaultRef: 'trunk',
      localContent: true,
      initialRef: 'local',
    })
  })

  it('ignores empty runtime strings and falls back to defaults', async () => {
    window.__WIKI_CONFIG__ = {
      contentRepo: 'jocaruser/illo3d',
      contentPath: '',
      siteTitle: '',
      appUrl: '',
      defaultRef: '',
      localContent: false,
    }
    const config = await loadConfig()
    expect(config.contentPath).toBe('specs')
    expect(config.siteTitle).toBe('illo3d specs')
    expect(config.appUrl).toBe('')
    expect(config.defaultRef).toBe('main')
    expect(config.initialRef).toBe('main')
  })

  it('uses build-time env values when no runtime config exists', async () => {
    vi.stubEnv('VITE_CONTENT_REPO', 'o/r')
    vi.stubEnv('VITE_SITE_TITLE', 'custom title')
    const config = await loadConfig()
    expect(config.contentRepo).toBe('o/r')
    expect(config.siteTitle).toBe('custom title')
  })

  it('falls back to a generic title without a repository', async () => {
    const config = await loadConfig()
    expect(config.contentRepo).toBe('')
    expect(config.siteTitle).toBe('specs wiki')
    expect(config.localContent).toBe(false)
  })

  it('handles a repository id without a slash', async () => {
    window.__WIKI_CONFIG__ = { contentRepo: 'weird' }
    const config = await loadConfig()
    expect(config.siteTitle).toBe('specs wiki')
  })
})
