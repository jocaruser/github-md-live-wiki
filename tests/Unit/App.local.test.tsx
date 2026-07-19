import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../../src/App'
import {
  fetchLocalFile,
  fetchLocalPaths,
  fetchSpecPaths,
  listTags,
} from '../../src/lib/github'

vi.mock('../../src/config', () => ({
  config: {
    contentRepo: '',
    contentPath: 'specs',
    siteTitle: 'local specs',
    appUrl: '',
    defaultRef: 'main',
    localContent: true,
  },
  LOCAL_REF: 'local',
  initialRef: 'local',
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

beforeEach(() => {
  vi.mocked(fetchLocalPaths).mockResolvedValue(['README.md'])
  vi.mocked(fetchLocalFile).mockResolvedValue('# Local overview\n\nUncommitted words.')
  vi.mocked(fetchSpecPaths).mockResolvedValue(['README.md'])
})

describe('App in local content mode', () => {
  it('starts at the local pseudo-ref and reads the mounted directory', async () => {
    render(<App />)
    expect(
      await screen.findByRole('heading', { name: 'Local overview', level: 1 })
    ).toBeInTheDocument()
    expect(fetchLocalPaths).toHaveBeenCalled()
    expect(fetchLocalFile).toHaveBeenCalledWith('README.md')
    expect(fetchSpecPaths).not.toHaveBeenCalled()
    expect(listTags).not.toHaveBeenCalled()
  })

  it('offers no GitHub source link for local pages', async () => {
    render(<App />)
    await screen.findByRole('heading', { name: 'Local overview', level: 1 })
    expect(screen.queryByRole('link', { name: 'View this page on GitHub' })).not.toBeInTheDocument()
  })

  it('switches from local to a remote ref', async () => {
    render(<App />)
    await screen.findByRole('heading', { name: 'Local overview', level: 1 })
    await userEvent.click(screen.getByRole('button', { name: /^local/ }))
    await userEvent.click(screen.getByRole('button', { name: 'latest (main)' }))
    await waitFor(() => expect(fetchSpecPaths).toHaveBeenCalledWith('', 'main', 'specs'))
  })
})
