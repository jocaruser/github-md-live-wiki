import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SearchBox } from '../../../src/components/SearchBox'
import type { SearchHit } from '../../../src/lib/search'

const hits: SearchHit[] = [
  { path: 'saving.spec.md', title: 'Saving' },
  { path: 'guide/intro.md', title: 'Intro' },
]

function renderBox(results: SearchHit[] = hits, onNavigate = vi.fn()) {
  render(<SearchBox search={(query) => (query ? results : [])} onNavigate={onNavigate} />)
  return onNavigate
}

const box = () => screen.getByRole('searchbox', { name: 'Search pages' })

describe('SearchBox', () => {
  it('shows results while typing and navigates on click', async () => {
    const onNavigate = renderBox()
    await userEvent.type(box(), 'sav')
    await userEvent.click(screen.getByRole('button', { name: /Saving/ }))
    expect(onNavigate).toHaveBeenCalledWith('saving.spec.md')
    expect(box()).toHaveValue('')
  })

  it('tells when nothing matches', async () => {
    renderBox([])
    await userEvent.type(box(), 'zzz')
    expect(screen.getByText('No matches')).toBeInTheDocument()
  })

  it('opens the first hit on Enter', async () => {
    const onNavigate = renderBox()
    await userEvent.type(box(), 'sav{Enter}')
    expect(onNavigate).toHaveBeenCalledWith('saving.spec.md')
  })

  it('does nothing on Enter without hits', async () => {
    const onNavigate = renderBox([])
    await userEvent.type(box(), 'zzz{Enter}')
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('clears on Escape', async () => {
    renderBox()
    await userEvent.type(box(), 'sav{Escape}')
    expect(box()).toHaveValue('')
  })
})
