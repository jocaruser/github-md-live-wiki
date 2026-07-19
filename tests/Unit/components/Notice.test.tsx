import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Notice } from '../../../src/components/Notice'

describe('Notice', () => {
  it('renders a bare title', () => {
    render(<Notice title="Nothing here" />)
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders details and a working action', async () => {
    const onClick = vi.fn()
    render(
      <Notice title="Broken" action={{ label: 'Retry', onClick }}>
        details here
      </Notice>
    )
    expect(screen.getByText('details here')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
