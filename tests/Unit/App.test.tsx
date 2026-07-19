import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../../src/App'
import {
  fetchFile,
  fetchSpecPaths,
  listBranches,
  listTags,
  WikiError,
} from '../../src/lib/github'

vi.mock('../../src/config', () => ({
  config: {
    contentRepo: 'o/r',
    contentPath: 'specs',
    siteTitle: 'test specs',
    appUrl: 'https://app.test',
    defaultRef: 'main',
    localContent: false,
  },
  LOCAL_REF: 'local',
  initialRef: 'main',
}))

vi.mock('../../src/lib/github', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/github')>()
  return {
    ...actual,
    listTags: vi.fn(),
    listBranches: vi.fn(),
    fetchSpecPaths: vi.fn(),
    fetchFile: vi.fn(),
    fetchLocalPaths: vi.fn(),
    fetchLocalFile: vi.fn(),
  }
})

const PATHS = ['README.md', 'guide/intro.md']
const TEXTS: Record<string, string> = {
  'README.md': '# Behaviour specs\n\nOverview body with uniquetoken.',
  'guide/intro.md': '# Intro\n\n## Section Two\n\nIntro body.',
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

function happyMocks() {
  vi.mocked(listTags).mockResolvedValue([{ name: 'v1.0.0', sha: 't' }])
  vi.mocked(listBranches).mockResolvedValue([{ name: 'feat/x', sha: 'f' }])
  vi.mocked(fetchSpecPaths).mockResolvedValue(PATHS)
  vi.mocked(fetchFile).mockImplementation(async (_repo, _ref, _path, page) => TEXTS[page] ?? '# ?')
}

function setHash(hash: string) {
  window.location.hash = hash
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

const overviewHeading = () => screen.findByRole('heading', { name: 'Behaviour specs', level: 1 })

beforeEach(() => {
  vi.mocked(listTags).mockReset()
  vi.mocked(listBranches).mockReset()
  vi.mocked(fetchSpecPaths).mockReset()
  vi.mocked(fetchFile).mockReset()
  happyMocks()
})

describe('App', () => {
  it('loads and renders the overview with sidebar and title', async () => {
    render(<App />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading specs…')
    expect(await overviewHeading()).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Intro' })).toHaveAttribute(
      'href',
      '#/main/guide/intro.md'
    )
    expect(document.title).toBe('Behaviour specs · test specs')
    expect(fetchSpecPaths).toHaveBeenCalledWith('o/r', 'main', 'specs')
    expect(screen.queryByRole('combobox', { name: 'Translate page' })).not.toBeInTheDocument()
  })

  it('navigates between pages on hash changes', async () => {
    render(<App />)
    await overviewHeading()
    setHash('#/main/guide/intro.md')
    expect(await screen.findByRole('heading', { name: 'Intro', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View this page on GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/o/r/blob/main/specs/guide/intro.md'
    )
  })

  it('offers releases and branches and reloads at the picked ref', async () => {
    render(<App />)
    await overviewHeading()
    await userEvent.click(screen.getByRole('button', { name: /latest \(main\)/ }))
    await userEvent.click(await screen.findByRole('button', { name: 'v1.0.0' }))
    await waitFor(() => expect(fetchSpecPaths).toHaveBeenCalledWith('o/r', 'v1.0.0', 'specs'))
  })

  it('recovers from an error via Back to latest', async () => {
    vi.mocked(fetchSpecPaths).mockImplementation(async (_repo, ref) => {
      if (ref !== 'main') throw new WikiError('rate-limit', 'resets in about 10 min')
      return PATHS
    })
    window.location.hash = '#/v9.9.9/'
    render(<App />)
    expect(await screen.findByText('GitHub rate limit reached')).toBeInTheDocument()
    expect(screen.getByText('resets in about 10 min')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Back to latest' }))
    expect(await overviewHeading()).toBeInTheDocument()
  })

  it.each([
    ['empty', 'No specs at this version'],
    ['not-found', 'Nothing found at this version'],
    ['network', 'Could not load the specs'],
  ] as const)('renders the %s error state', async (kind, title) => {
    vi.mocked(fetchSpecPaths).mockRejectedValue(new WikiError(kind, 'details'))
    render(<App />)
    expect(await screen.findByText(title)).toBeInTheDocument()
  })

  it('wraps unexpected failures as network errors', async () => {
    vi.mocked(fetchSpecPaths).mockRejectedValue(new Error('boom'))
    render(<App />)
    expect(await screen.findByText('Could not load the specs')).toBeInTheDocument()
    expect(screen.getByText(/boom/)).toBeInTheDocument()
  })

  it('reports a page missing at the current version', async () => {
    render(<App />)
    await overviewHeading()
    setHash('#/main/missing.md')
    expect(await screen.findByText('Page not found at this version')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Go to overview' }))
    expect(await overviewHeading()).toBeInTheDocument()
  })

  it('scrolls to the routed anchor', async () => {
    const scroll = vi.spyOn(Element.prototype, 'scrollIntoView')
    render(<App />)
    await overviewHeading()
    setHash('#/main/guide/intro.md#section-two')
    await waitFor(() => expect(scroll).toHaveBeenCalled())
    scroll.mockRestore()
  })

  it('keeps a placeholder for files that fail to load', async () => {
    vi.mocked(fetchFile).mockImplementation(async (_repo, _ref, _path, page) => {
      if (page === 'guide/intro.md') throw new WikiError('network', 'flaky')
      return TEXTS[page]
    })
    window.location.hash = '#/main/guide/intro.md'
    render(<App />)
    expect(await screen.findByText('This file could not be loaded.')).toBeInTheDocument()
  })

  it('ignores results from a superseded ref load', async () => {
    const slow = deferred<string[]>()
    vi.mocked(fetchSpecPaths).mockImplementation((_repo, ref) =>
      ref === 'main' ? slow.promise : Promise.resolve(PATHS)
    )
    vi.mocked(fetchFile).mockImplementation(async (_repo, ref, _path, page) =>
      page === 'README.md' ? `# From ${ref}` : TEXTS[page]
    )
    render(<App />)
    expect(document.title).toBe('test specs')
    setHash('#/v1.0.0/')
    expect(
      await screen.findByRole('heading', { name: 'From v1.0.0', level: 1 })
    ).toBeInTheDocument()
    slow.resolve(PATHS)
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'From v1.0.0', level: 1 })).toBeInTheDocument()
    )
  })

  it('ignores failures from a superseded ref load', async () => {
    const slow = deferred<string[]>()
    vi.mocked(fetchSpecPaths).mockImplementation((_repo, ref) =>
      ref === 'main' ? slow.promise : Promise.resolve(PATHS)
    )
    render(<App />)
    setHash('#/v1.0.0/')
    await overviewHeading()
    slow.reject(new WikiError('network', 'late failure'))
    await waitFor(() =>
      expect(screen.queryByText('Could not load the specs')).not.toBeInTheDocument()
    )
  })

  it('searches loaded pages and navigates to a hit', async () => {
    render(<App />)
    await overviewHeading()
    setHash('#/main/guide/intro.md')
    await screen.findByRole('heading', { name: 'Intro', level: 1 })
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search specs' }), 'uniquetoken')
    await userEvent.click(await screen.findByRole('button', { name: /Behaviour specs/ }))
    expect(await overviewHeading()).toBeInTheDocument()
  })

  it('never publishes draft directories — not in search, not by route', async () => {
    vi.mocked(fetchSpecPaths).mockResolvedValue([...PATHS, 'changes/secret-draft.md'])
    vi.mocked(fetchFile).mockImplementation(
      async (_repo, _ref, _path, page) => TEXTS[page] ?? '# Draft\n\nsupersecretword'
    )
    render(<App />)
    await overviewHeading()
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search specs' }), 'supersecretword')
    expect(await screen.findByText('No matches')).toBeInTheDocument()
    setHash('#/main/changes/secret-draft.md')
    expect(await screen.findByText('Page not found at this version')).toBeInTheDocument()
  })

  it('treats an all-drafts version as empty', async () => {
    vi.mocked(fetchSpecPaths).mockResolvedValue(['changes/only-draft.md'])
    render(<App />)
    expect(await screen.findByText('No specs at this version')).toBeInTheDocument()
  })

  it('keeps working when the ref listings fail', async () => {
    vi.mocked(listTags).mockRejectedValue(new Error('limit'))
    vi.mocked(listBranches).mockRejectedValue(new Error('limit'))
    render(<App />)
    await overviewHeading()
    await userEvent.click(screen.getByRole('button', { name: /latest \(main\)/ }))
    expect(await screen.findByText('No releases yet')).toBeInTheDocument()
  })

  it('opens and closes the mobile sidebar', async () => {
    render(<App />)
    await overviewHeading()
    await userEvent.click(screen.getByRole('button', { name: 'Toggle navigation' }))
    expect(screen.getByRole('complementary')).toHaveClass('fixed')
    await userEvent.click(screen.getByRole('link', { name: 'Intro' }))
    await waitFor(() => expect(screen.getByRole('complementary')).toHaveClass('hidden'))
  })
})
