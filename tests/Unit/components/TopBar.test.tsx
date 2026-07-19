import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TopBar } from '../../../src/components/TopBar'

function renderBar(overrides: Partial<Parameters<typeof TopBar>[0]> = {}) {
  const props = {
    siteTitle: 'test specs',
    homeHref: '#/main/',
    appUrl: 'https://app.test',
    repoUrl: 'https://github.com/o/r',
    theme: 'light' as const,
    onToggleTheme: vi.fn(),
    onToggleSidebar: vi.fn(),
    ...overrides,
  }
  render(<TopBar {...props}>slot content</TopBar>)
  return props
}

describe('TopBar', () => {
  it('links the title home and renders the slot', () => {
    renderBar()
    expect(screen.getByRole('link', { name: 'test specs' })).toHaveAttribute('href', '#/main/')
    expect(screen.getByText('slot content')).toBeInTheDocument()
  })

  it('links the app and the repository when configured', () => {
    renderBar()
    expect(screen.getByRole('link', { name: 'App ↗' })).toHaveAttribute('href', 'https://app.test')
    expect(screen.getByRole('link', { name: 'GitHub ↗' })).toHaveAttribute(
      'href',
      'https://github.com/o/r'
    )
  })

  it('omits the app and repository links otherwise', () => {
    renderBar({ appUrl: '', repoUrl: undefined })
    expect(screen.queryByRole('link', { name: 'App ↗' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'GitHub ↗' })).not.toBeInTheDocument()
  })

  it('toggles the sidebar', async () => {
    const props = renderBar()
    await userEvent.click(screen.getByRole('button', { name: 'Toggle navigation' }))
    expect(props.onToggleSidebar).toHaveBeenCalledOnce()
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
