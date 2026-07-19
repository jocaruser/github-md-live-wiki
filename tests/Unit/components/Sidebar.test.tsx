import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Sidebar } from '../../../src/components/Sidebar'
import type { NavItem } from '../../../src/lib/nav'

const nav: NavItem[] = [
  { kind: 'page', path: 'README.md', title: 'Overview' },
  {
    kind: 'section',
    title: 'Decisions',
    indexPath: 'decisions/README.md',
    items: [{ kind: 'page', path: 'decisions/ADR-0001.md', title: 'ADR-0001' }],
  },
  {
    kind: 'section',
    title: 'Welcome',
    items: [{ kind: 'page', path: 'welcome/welcome.spec.md', title: 'Welcome page' }],
  },
]

const linkFor = (path: string) => `#/main/${path}`

function renderSidebar(currentPath: string, open = false, onLinkClick = vi.fn()) {
  render(
    <Sidebar nav={nav} currentPath={currentPath} linkFor={linkFor} onLinkClick={onLinkClick} open={open} />
  )
  return onLinkClick
}

describe('Sidebar', () => {
  it('renders pages as links and marks the current one', () => {
    renderSidebar('README.md')
    const active = screen.getByRole('link', { name: 'Overview' })
    expect(active).toHaveAttribute('href', '#/main/README.md')
    expect(active).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'ADR-0001' })).not.toHaveAttribute('aria-current')
  })

  it('links section titles to their index page and marks them active', () => {
    renderSidebar('decisions/README.md')
    const section = screen.getByRole('link', { name: 'Decisions' })
    expect(section).toHaveAttribute('href', '#/main/decisions/README.md')
    expect(section).toHaveAttribute('aria-current', 'page')
  })

  it('renders index-less sections as plain labels', () => {
    renderSidebar('README.md')
    expect(screen.getByText('Welcome')).not.toHaveAttribute('href')
    expect(screen.getByRole('link', { name: 'Welcome page' })).toBeInTheDocument()
  })

  it('stays hidden on small screens when closed and overlays when open', () => {
    renderSidebar('README.md', false)
    expect(screen.getByRole('complementary')).toHaveClass('hidden')
  })

  it('overlays when open and reports clicks', async () => {
    const onLinkClick = renderSidebar('README.md', true)
    const aside = screen.getByRole('complementary')
    expect(aside).toHaveClass('fixed')
    await userEvent.click(screen.getByText('Welcome'))
    expect(onLinkClick).toHaveBeenCalled()
  })
})
