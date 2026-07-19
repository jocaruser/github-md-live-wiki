import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TopBar } from '../../../src/components/TopBar'

function renderBar(overrides: Partial<Parameters<typeof TopBar>[0]> = {}) {
  const props = {
    siteTitle: 'illo3d',
    homeHref: '#r=jocaruser/illo3d',
    repoUrl: 'https://github.com/jocaruser/illo3d',
    theme: 'light' as const,
    onToggleTheme: vi.fn(),
    onToggleSidebar: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  }
  render(<TopBar {...props}>slot content</TopBar>)
  return props
}

describe('TopBar', () => {
  it('links the title home and renders the slot', () => {
    renderBar()
    expect(screen.getByRole('link', { name: 'illo3d' })).toHaveAttribute(
      'href',
      '#r=jocaruser/illo3d'
    )
    expect(screen.getByText('slot content')).toBeInTheDocument()
  })

  it('links the repository', () => {
    renderBar()
    expect(screen.getByRole('link', { name: 'GitHub ↗' })).toHaveAttribute(
      'href',
      'https://github.com/jocaruser/illo3d'
    )
  })

  it('toggles the sidebar', async () => {
    const props = renderBar()
    await userEvent.click(screen.getByRole('button', { name: 'Toggle navigation' }))
    expect(props.onToggleSidebar).toHaveBeenCalledOnce()
  })

  it('closes the wiki', async () => {
    const props = renderBar()
    await userEvent.click(screen.getByRole('button', { name: 'Close wiki' }))
    expect(props.onClose).toHaveBeenCalledOnce()
  })

  it('shows the moon in light mode and toggles the theme', async () => {
    const props = renderBar()
    const button = screen.getByRole('button', { name: 'Toggle colour theme' })
    expect(button).toHaveTextContent('🌙')
    await userEvent.click(button)
    expect(props.onToggleTheme).toHaveBeenCalledOnce()
  })

  it('shows the sun in dark mode', () => {
    renderBar({ theme: 'dark' })
    expect(screen.getByRole('button', { name: 'Toggle colour theme' })).toHaveTextContent('☀️')
  })
})
