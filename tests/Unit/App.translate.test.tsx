import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../../src/App'
import { fetchFile, fetchSpecPaths, listBranches, listTags } from '../../src/lib/github'
import { LANGUAGE_STORAGE_KEY } from '../../src/lib/translate'

vi.mock('../../src/config', () => ({
  config: {
    contentRepo: 'o/r',
    contentPath: 'specs',
    siteTitle: 'test specs',
    appUrl: '',
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

beforeEach(() => {
  vi.mocked(listTags).mockResolvedValue([])
  vi.mocked(listBranches).mockResolvedValue([])
  vi.mocked(fetchSpecPaths).mockResolvedValue(['README.md'])
  vi.mocked(fetchFile).mockResolvedValue('# Overview\n\nGreeting line here.')
  window.Translator = {
    availability: async () => 'available',
    create: async () => ({ translate: async (text: string) => `«${text}»` }),
  }
})

afterEach(() => {
  delete window.Translator
})

describe('App with translation support', () => {
  it('translates the page when a language is picked and persists the choice', async () => {
    render(<App />)
    await screen.findByRole('heading', { name: 'Overview', level: 1 })
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Translate page' }),
      'es'
    )
    await waitFor(() => expect(screen.getByText('«Greeting line here.»')).toBeInTheDocument())
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('es')
  })

  it('starts translated when a language was chosen before', async () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'fr')
    render(<App />)
    await waitFor(() => expect(screen.getByText('«Greeting line here.»')).toBeInTheDocument())
    expect(screen.getByRole('combobox', { name: 'Translate page' })).toHaveValue('fr')
  })
})
