import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RefSelector } from '../../../src/components/RefSelector'

const tags = [{ name: 'v1.0.0', sha: 't1' }]
const branches = [
  { name: 'main', sha: 'b1' },
  { name: 'feat/x', sha: 'b2' },
]

function renderSelector(current: string, onSelect = vi.fn()) {
  render(
    <RefSelector
      current={current}
      defaultRef="main"
      tags={tags}
      branches={branches}
      onSelect={onSelect}
    />
  )
  return onSelect
}

const openMenu = () => userEvent.click(screen.getByRole('button', { name: /latest|▾|./ }))

describe('RefSelector', () => {
  it('labels the default ref as latest', () => {
    renderSelector('main')
    expect(screen.getByRole('button', { name: /latest \(main\)/ })).toBeInTheDocument()
  })

  it('shortens long commit ids', () => {
    renderSelector('a'.repeat(40))
    expect(screen.getByRole('button', { name: new RegExp('a'.repeat(12)) })).toBeInTheDocument()
  })

  it('shows branch names as-is', () => {
    renderSelector('feat/x')
    expect(screen.getByRole('button', { name: /feat\/x/ })).toBeInTheDocument()
  })

  it('lists releases and branches and selects one', async () => {
    const onSelect = renderSelector('main')
    await openMenu()
    await userEvent.click(screen.getByRole('button', { name: 'v1.0.0' }))
    expect(onSelect).toHaveBeenCalledWith('v1.0.0')
    expect(screen.queryByRole('button', { name: 'v1.0.0' })).not.toBeInTheDocument()
  })

  it('selects branches and the latest entry', async () => {
    const onSelect = renderSelector('v1.0.0')
    await openMenu()
    await userEvent.click(screen.getByRole('button', { name: 'feat/x' }))
    expect(onSelect).toHaveBeenCalledWith('feat/x')
    await openMenu()
    await userEvent.click(screen.getByRole('button', { name: 'latest (main)' }))
    expect(onSelect).toHaveBeenCalledWith('main')
  })

  it('submits a trimmed commit id', async () => {
    const onSelect = renderSelector('main')
    await openMenu()
    await userEvent.type(screen.getByRole('textbox', { name: 'Commit id' }), '  abc1234  ')
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(onSelect).toHaveBeenCalledWith('abc1234')
  })

  it('ignores an empty commit id', async () => {
    const onSelect = renderSelector('main')
    await openMenu()
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('closes via the backdrop without selecting', async () => {
    const onSelect = renderSelector('main')
    await openMenu()
    await userEvent.click(screen.getByRole('button', { name: 'Close version menu' }))
    expect(onSelect).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'v1.0.0' })).not.toBeInTheDocument()
  })

  it('shows placeholders when there are no refs', async () => {
    render(<RefSelector current="main" defaultRef="main" tags={[]} branches={[]} onSelect={vi.fn()} />)
    await openMenu()
    expect(screen.getByText('No releases yet')).toBeInTheDocument()
    expect(screen.getByText('No branches found')).toBeInTheDocument()
  })
})
