import type { Page } from '@playwright/test'

/** Repo id baked into the e2e bundle via VITE_CONTENT_REPO (see Makefile). */
export const REPO = 'e2e-org/e2e-repo'
export const SHA = 'abcdef1234567890abcdef1234567890abcdef12'

const CORS = { 'access-control-allow-origin': '*' }

const CONTENT: Record<string, Record<string, string>> = {
  main: {
    'README.md':
      '# E2E Specs\n\nWelcome. See [the guide](guide/intro.md) and [the schema](../schema.dbml).\n\nSearch target: mainonlyword.\n\n```ts\nconst untouchedByTranslation = true\n```',
    'guide/intro.md': '# Intro\n\nMain branch intro body.',
  },
  'v1.0.0': {
    'README.md': '# E2E Specs\n\nRelease overview v1.',
    'guide/intro.md': '# Intro\n\nRelease intro body.',
  },
  'feature/new-spec': {
    'README.md': '# E2E Specs\n\nBranch overview.',
    'guide/intro.md': '# Intro\n\nBranch intro body.',
    'guide/extra.md': '# Extra\n\nOnly on the branch.',
  },
  [SHA]: {
    'README.md': '# E2E Specs\n\nPinned commit overview.',
  },
}

export async function mockGitHub(page: Page): Promise<void> {
  await page.route('https://api.github.com/**', (route) => {
    const path = new URL(route.request().url()).pathname
    const json = (body: unknown) =>
      route.fulfill({
        status: 200,
        headers: CORS,
        contentType: 'application/json',
        body: JSON.stringify(body),
      })
    if (path === `/repos/${REPO}/tags`) {
      return json([{ name: 'v1.0.0', commit: { sha: 'f'.repeat(40) } }])
    }
    if (path === `/repos/${REPO}/branches`) {
      return json([
        { name: 'main', commit: { sha: 'a'.repeat(40) } },
        { name: 'feature/new-spec', commit: { sha: 'b'.repeat(40) } },
      ])
    }
    const treesPrefix = `/repos/${REPO}/git/trees/`
    if (path.startsWith(treesPrefix)) {
      const ref = decodeURIComponent(path.slice(treesPrefix.length))
      const files = CONTENT[ref]
      if (!files) return route.fulfill({ status: 404, headers: CORS, body: '{}' })
      return json({
        tree: Object.keys(files).map((file) => ({ path: `specs/${file}`, type: 'blob' })),
      })
    }
    return route.fulfill({ status: 404, headers: CORS, body: '{}' })
  })

  await page.route('https://raw.githubusercontent.com/**', (route) => {
    const path = new URL(route.request().url()).pathname
    const rest = decodeURIComponent(path.slice(`/${REPO}/`.length))
    const marker = rest.indexOf('/specs/')
    const ref = rest.slice(0, marker)
    const file = rest.slice(marker + '/specs/'.length)
    const body = CONTENT[ref]?.[file]
    if (body === undefined) {
      return route.fulfill({ status: 404, headers: CORS, body: 'not found' })
    }
    return route.fulfill({ status: 200, headers: CORS, contentType: 'text/plain', body })
  })
}
