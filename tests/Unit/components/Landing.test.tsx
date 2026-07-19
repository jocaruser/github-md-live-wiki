import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Landing } from '../../../src/components/Landing'
import type { Selection } from '../../../src/lib/library'

function renderLanding(recents: Selection[] = [], overrides: Record<string, unknown> = {}) {
  const props = {
    recents,
    onOpen: vi.fn(),
    onRemoveRecent: vi.fn(),
    theme: 'light' as const,
    onToggleTheme: vi.fn(),
    ...overrides,
  }
  render(<Landing {...props} />)
  return props
}

const repoInput = () => screen.getByRole('textbox', { name: 'Repository' })
const pathInput = () => screen.getByRole('textbox', { name: 'Path inside repository' })
const loadButton = () => screen.getByRole('button', { name: 'Load' })

describe('Landing', () => {
  it('shows the app identity and a disabled Load until a valid repo is entered', async () => {
    renderLanding()
    expect(screen.getByRole('heading', { name: 'Live Wiki' })).toBeInTheDocument()
    expect(loadButton()).toBeDisabled()
    await userEvent.type(repoInput(), 'jocaruser/illo3d')
    expect(loadButton()).toBeEnabled()
  })

  it('keeps Load disabled for a malformed repository and ignores a submit', async () => {
    const props = renderLanding()
    await userEvent.type(repoInput(), 'not-a-repo')
    expect(loadButton()).toBeDisabled()
    fireEvent.submit(repoInput().closest('form')!)
    expect(props.onOpen).not.toHaveBeenCalled()
  })

  it('shows the sun in dark mode', () => {
    renderLanding([], { theme: 'dark' })
    expect(screen.getByRole('button', { name: 'Toggle colour theme' })).toHaveTextContent('☀️')
  })

  it('opens a normalized selection on submit', async () => {
    const props = renderLanding()
    await userEvent.type(repoInput(), 'jocaruser/illo3d')
    await userEvent.type(pathInput(), ' specs/ ')
    await userEvent.click(loadButton())
    expect(props.onOpen).toHaveBeenCalledWith({ repo: 'jocaruser/illo3d', path: 'specs' })
  })

  it('hides the recents section when there is no history', () => {
    renderLanding()
    expect(screen.queryByText('Recent repositories')).not.toBeInTheDocument()
  })

  it('lists recents and opens one on click', async () => {
    const recents = [
      { repo: 'a/one', path: 'docs' },
      { repo: 'b/two', path: '' },
    ]
    const props = renderLanding(recents)
    expect(screen.getByText('Recent repositories')).toBeInTheDocument()
    expect(screen.getByText(/\(root\)/)).toBeInTheDocument()
    await userEvent.click(screen.getByText('a/one'))
    expect(props.onOpen).toHaveBeenCalledWith({ repo: 'a/one', path: 'docs' })
  })

  it('removes a recent without opening it', async () => {
    const recents = [{ repo: 'a/one', path: 'docs' }]
    const props = renderLanding(recents)
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove a/one from recent repositories' })
    )
    expect(props.onRemoveRecent).toHaveBeenCalledWith(recents[0])
    expect(props.onOpen).not.toHaveBeenCalled()
  })

  it('toggles the theme', async () => {
    const props = renderLanding()
    await userEvent.click(screen.getByRole('button', { name: 'Toggle colour theme' }))
    expect(props.onToggleTheme).toHaveBeenCalledOnce()
  })
})
