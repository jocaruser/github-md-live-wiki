import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../../src/App'
import {
  fetchDefaultBranch,
  fetchFile,
  fetchSpecPaths,
  listBranches,
  listTags,
  WikiError,
} from '../../src/lib/github'

vi.mock('../../src/lib/github', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/github')>()
  return {
    ...actual,
    fetchDefaultBranch: vi.fn(),
    fetchFile: vi.fn(),
    fetchSpecPaths: vi.fn(),
    listBranches: vi.fn(),
    listTags: vi.fn(),
  }
})

const PATHS = ['README.md', 'guide/intro.md', 'plain.md']
const TEXTS: Record<string, string> = {
  'README.md': '# illo3d specs\n\nOverview with uniquetoken.\n\n## Section Two\n\nMore.',
  'guide/intro.md': '# Intro\n\nIntro body.',
  'plain.md': 'no heading in this file',
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/** Re-notify App's hashchange listener after code (or a test) sets the hash. */
function bump() {
  fireEvent(window, new HashChangeEvent('hashchange'))
}

function deepLink(hash: string) {
  window.location.hash = hash
}

const overview = () => screen.findByRole('heading', { name: 'illo3d specs', level: 1 })

beforeEach(() => {
  vi.mocked(fetchDefaultBranch).mockReset().mockResolvedValue('main')
  vi.mocked(listTags).mockReset().mockResolvedValue([{ name: 'v1.0.0', sha: 't' }])
  vi.mocked(listBranches).mockReset().mockResolvedValue([{ name: 'feat/x', sha: 'f' }])
  vi.mocked(fetchSpecPaths).mockReset().mockResolvedValue(PATHS)
  vi.mocked(fetchFile)
    .mockReset()
    .mockImplementation(async (_repo, _ref, _path, page) => TEXTS[page] ?? '# ?')
})

afterEach(() => {
  delete window.Translator
})

describe('landing', () => {
  it('shows the form when no repository is in the URL', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Live Wiki' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Load' })).toBeInTheDocument()
  })

  it('opens a repository from the form and puts it in the URL', async () => {
    render(<App />)
    await userEvent.type(screen.getByRole('textbox', { name: 'Repository' }), 'jocaruser/illo3d')
    await userEvent.type(screen.getByRole('textbox', { name: 'Path inside repository' }), 'specs')
    await userEvent.click(screen.getByRole('button', { name: 'Load' }))
    expect(window.location.hash).toBe('#r=jocaruser/illo3d&p=specs')
    bump()
    expect(await overview()).toBeInTheDocument()
    expect(fetchSpecPaths).toHaveBeenCalledWith('jocaruser/illo3d', 'main', 'specs')
  })

  it('lists an opened repository as recent, reopens and removes it', async () => {
    deepLink('#r=o/r&p=specs')
    render(<App />)
    await overview()
    await userEvent.click(screen.getByRole('button', { name: 'Close wiki' }))
    bump()
    // Back on the landing form, the repo is now a recent entry.
    const recent = await screen.findByText('o/r')
    expect(recent).toBeInTheDocument()
    await userEvent.click(recent)
    expect(window.location.hash).toBe('#r=o/r&p=specs')
    bump()
    await overview()
    // Reopen path leaves it removable back on the form.
    await userEvent.click(screen.getByRole('button', { name: 'Close wiki' }))
    bump()
    await userEvent.click(
      await screen.findByRole('button', { name: 'Remove o/r from recent repositories' })
    )
    expect(screen.queryByText('o/r')).not.toBeInTheDocument()
  })
})

describe('viewing a repository', () => {
  it('renders the overview with sidebar, title and source link', async () => {
    deepLink('#r=o/r&p=specs')
    render(<App />)
    expect(await overview()).toBeInTheDocument()
    expect(document.title).toBe('illo3d specs · o/r')
    const intro = screen.getByRole('link', { name: 'Intro' })
    expect(intro).toHaveAttribute('href', '#r=o/r&p=specs&f=guide/intro.md')
    expect(screen.getByRole('link', { name: 'View this page on GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/o/r/blob/main/specs/README.md'
    )
  })

  it('deep-links directly to a page at a pinned version', async () => {
    deepLink('#r=o/r&p=specs&v=v1.0.0&f=guide/intro.md')
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Intro', level: 1 })).toBeInTheDocument()
    expect(fetchSpecPaths).toHaveBeenCalledWith('o/r', 'v1.0.0', 'specs')
    expect(screen.getByRole('link', { name: 'View this page on GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/o/r/blob/v1.0.0/specs/guide/intro.md'
    )
  })

  it('falls back to the app name in the title for a page without a heading', async () => {
    deepLink('#r=o/r&p=specs&f=plain.md')
    render(<App />)
    await waitFor(() => expect(document.title).toBe('o/r · Live Wiki'))
  })

  it('scrolls to a routed anchor', async () => {
    const scroll = vi.spyOn(Element.prototype, 'scrollIntoView')
    deepLink('#r=o/r&p=specs&a=section-two')
    render(<App />)
    await overview()
    await waitFor(() => expect(scroll).toHaveBeenCalled())
    scroll.mockRestore()
  })

  it('switches to a release and back to latest via the version menu', async () => {
    deepLink('#r=o/r&p=specs')
    render(<App />)
    await overview()
    await userEvent.click(screen.getByRole('button', { name: /latest \(main\)/ }))
    await userEvent.click(await screen.findByRole('button', { name: 'v1.0.0' }))
    expect(window.location.hash).toBe('#r=o/r&p=specs&v=v1.0.0')
    bump()
    await waitFor(() => expect(fetchSpecPaths).toHaveBeenCalledWith('o/r', 'v1.0.0', 'specs'))
    // The trigger now shows the pinned version; reopen it and choose latest.
    await userEvent.click(screen.getByRole('button', { name: /v1\.0\.0/ }))
    await userEvent.click(await screen.findByRole('button', { name: 'latest (main)' }))
    // Choosing the default branch drops the version param for a clean URL.
    expect(window.location.hash).toBe('#r=o/r&p=specs')
  })

  it('searches the loaded pages and navigates to a hit', async () => {
    deepLink('#r=o/r&p=specs&f=guide/intro.md')
    render(<App />)
    await screen.findByRole('heading', { name: 'Intro', level: 1 })
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search pages' }), 'uniquetoken')
    await userEvent.click(await screen.findByRole('button', { name: /illo3d specs/ }))
    expect(window.location.hash).toBe('#r=o/r&p=specs&f=README.md')
  })

  it('offers the language selector and remembers a chosen language', async () => {
    window.Translator = { availability: async () => 'available', create: async () => ({ translate: async (t: string) => t }) }
    deepLink('#r=o/r&p=specs')
    render(<App />)
    await overview()
    const select = screen.getByRole('combobox', { name: 'Translate page' })
    await userEvent.selectOptions(select, 'es')
    expect(select).toHaveValue('es')
  })

  it('excludes draft directories from the sidebar and search', async () => {
    vi.mocked(fetchSpecPaths).mockResolvedValue([...PATHS, 'changes/secret-draft.md'])
    vi.mocked(fetchFile).mockImplementation(
      async (_repo, _ref, _path, page) => TEXTS[page] ?? '# Draft\n\nsupersecretword'
    )
    deepLink('#r=o/r&p=specs')
    render(<App />)
    await overview()
    expect(screen.queryByText('secret-draft')).not.toBeInTheDocument()
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search pages' }), 'supersecretword')
    expect(await screen.findByText('No matches')).toBeInTheDocument()
  })

  it('treats an all-drafts version as empty', async () => {
    vi.mocked(fetchSpecPaths).mockResolvedValue(['changes/only-draft.md'])
    deepLink('#r=o/r&p=specs')
    render(<App />)
    expect(await screen.findByText('No pages at this version')).toBeInTheDocument()
  })

  it('opens and closes the mobile sidebar', async () => {
    deepLink('#r=o/r&p=specs')
    render(<App />)
    await overview()
    await userEvent.click(screen.getByRole('button', { name: 'Toggle navigation' }))
    expect(screen.getByRole('complementary')).toHaveClass('fixed')
    await userEvent.click(screen.getByRole('link', { name: 'Intro' }))
    await waitFor(() => expect(screen.getByRole('complementary')).toHaveClass('hidden'))
  })
})

describe('resolving and error states', () => {
  it('shows a resolving state until the default branch is known', async () => {
    const gate = deferred<string>()
    vi.mocked(fetchDefaultBranch).mockReturnValue(gate.promise)
    deepLink('#r=o/r&p=specs')
    render(<App />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading pages…')
    // The version selector shows a placeholder while the branch is unknown.
    expect(screen.getByRole('button', { name: '…' })).toBeInTheDocument()
    gate.resolve('main')
    expect(await overview()).toBeInTheDocument()
  })

  it('loads a pinned version even before the default branch resolves', async () => {
    const gate = deferred<string>()
    vi.mocked(fetchDefaultBranch).mockReturnValue(gate.promise)
    deepLink('#r=o/r&p=specs&v=v1.0.0')
    render(<App />)
    expect(await overview()).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /latest \(v1.0.0\)/ })).toBeInTheDocument()
    gate.resolve('main')
  })

  it('reports a repository that cannot be opened, then closes', async () => {
    vi.mocked(fetchDefaultBranch).mockRejectedValue(new WikiError('not-found', 'no such repo'))
    deepLink('#r=o/missing&p=specs')
    render(<App />)
    expect(await screen.findByText('Couldn’t open o/missing')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Close wiki' }))
    bump()
    expect(screen.getByRole('heading', { name: 'Live Wiki' })).toBeInTheDocument()
  })

  it('wraps an unexpected default-branch failure as a network error', async () => {
    vi.mocked(fetchDefaultBranch).mockRejectedValue(new Error('boom'))
    deepLink('#r=o/r&p=specs')
    render(<App />)
    expect(await screen.findByText(/boom/)).toBeInTheDocument()
  })

  it.each([
    ['empty', 'No pages at this version'],
    ['not-found', 'Nothing found at this version'],
    ['rate-limit', 'GitHub rate limit reached'],
    ['network', 'Could not load the pages'],
  ] as const)('renders the %s content error with a back-to-latest action', async (kind, title) => {
    vi.mocked(fetchSpecPaths).mockRejectedValue(new WikiError(kind, 'details'))
    deepLink('#r=o/r&p=specs')
    render(<App />)
    expect(await screen.findByText(title)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back to latest' })).toBeInTheDocument()
  })

  it('wraps an unexpected content failure as a network error', async () => {
    vi.mocked(fetchSpecPaths).mockRejectedValue(new Error('kaboom'))
    deepLink('#r=o/r&p=specs')
    render(<App />)
    expect(await screen.findByText('Could not load the pages')).toBeInTheDocument()
    expect(screen.getByText(/kaboom/)).toBeInTheDocument()
  })

  it('goes back to latest from a per-version error', async () => {
    vi.mocked(fetchSpecPaths).mockImplementation(async (_repo, ref) => {
      if (ref !== 'main') throw new WikiError('empty', 'nothing at this tag')
      return PATHS
    })
    deepLink('#r=o/r&p=specs&v=v9.9.9')
    render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: 'Back to latest' }))
    bump()
    expect(await overview()).toBeInTheDocument()
  })

  it('reports a page missing at the current version', async () => {
    deepLink('#r=o/r&p=specs&f=missing.md')
    render(<App />)
    expect(await screen.findByText('Page not found at this version')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Go to overview' }))
    bump()
    expect(await overview()).toBeInTheDocument()
  })

  it('keeps a placeholder for a file that fails to load', async () => {
    vi.mocked(fetchFile).mockImplementation(async (_repo, _ref, _path, page) => {
      if (page === 'README.md') throw new WikiError('network', 'flaky')
      return TEXTS[page]
    })
    deepLink('#r=o/r&p=specs')
    render(<App />)
    expect(await screen.findByText('This file could not be loaded.')).toBeInTheDocument()
  })

  it('keeps working when the ref listings fail', async () => {
    vi.mocked(listTags).mockRejectedValue(new Error('limit'))
    vi.mocked(listBranches).mockRejectedValue(new Error('limit'))
    deepLink('#r=o/r&p=specs')
    render(<App />)
    await overview()
    await userEvent.click(screen.getByRole('button', { name: /latest \(main\)/ }))
    expect(await screen.findByText('No releases yet')).toBeInTheDocument()
  })

  it('ignores a branch resolution that arrives after the repo is closed', async () => {
    const gate = deferred<string>()
    vi.mocked(fetchDefaultBranch).mockReturnValue(gate.promise)
    deepLink('#r=o/r&p=specs')
    render(<App />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    deepLink('')
    bump()
    expect(screen.getByRole('heading', { name: 'Live Wiki' })).toBeInTheDocument()
    gate.resolve('main') // resolves after unmount — the stale guard swallows it
    await Promise.resolve()
    expect(screen.getByRole('heading', { name: 'Live Wiki' })).toBeInTheDocument()
  })

  it('ignores a failed branch resolution that arrives after closing', async () => {
    const gate = deferred<string>()
    vi.mocked(fetchDefaultBranch).mockReturnValue(gate.promise)
    deepLink('#r=o/r&p=specs')
    render(<App />)
    deepLink('')
    bump()
    gate.reject(new WikiError('network', 'too late'))
    await Promise.resolve()
    expect(screen.getByRole('heading', { name: 'Live Wiki' })).toBeInTheDocument()
  })

  it('ignores a superseded content load, whether it later succeeds or fails', async () => {
    const slowOk = deferred<string[]>()
    const slowFail = deferred<string[]>()
    // 'main' loads are held open; switching to a tag supersedes them.
    let mainCall = 0
    vi.mocked(fetchSpecPaths).mockImplementation((_repo, ref) => {
      if (ref !== 'main') return Promise.resolve(PATHS)
      return mainCall++ === 0 ? slowOk.promise : slowFail.promise
    })

    // First visit at latest: the main load starts and is then superseded by a tag.
    deepLink('#r=o/r&p=specs')
    render(<App />)
    await waitFor(() => expect(fetchSpecPaths).toHaveBeenCalledWith('o/r', 'main', 'specs'))
    deepLink('#r=o/r&p=specs&v=v1.0.0')
    bump()
    await overview()
    slowOk.resolve(PATHS) // resolves after being superseded — ignored
    await Promise.resolve()
    expect(await overview()).toBeInTheDocument()

    // Back to latest: a second main load starts, is superseded, then fails.
    deepLink('#r=o/r&p=specs')
    bump()
    await waitFor(() => expect(fetchSpecPaths).toHaveBeenCalledTimes(3))
    deepLink('#r=o/r&p=specs&v=v1.0.0')
    bump()
    await overview()
    slowFail.reject(new WikiError('network', 'late failure')) // ignored, no error shown
    await waitFor(() =>
      expect(screen.queryByText('Could not load the pages')).not.toBeInTheDocument()
    )
  })
})
