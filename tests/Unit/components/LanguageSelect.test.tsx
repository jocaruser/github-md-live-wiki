import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LanguageSelect } from '../../../src/components/LanguageSelect'

describe('LanguageSelect', () => {
  it('offers Original plus the fixed languages and reports changes', async () => {
    const onChange = vi.fn()
    render(<LanguageSelect lang="" onChange={onChange} />)
    const select = screen.getByRole('combobox', { name: 'Translate page' })
    expect(select).toHaveValue('')
    expect(screen.getByRole('option', { name: 'Original' })).toBeInTheDocument()
    await userEvent.selectOptions(select, 'es')
    expect(onChange).toHaveBeenCalledWith('es')
  })

  it('shows the active language', () => {
    render(<LanguageSelect lang="fr" onChange={vi.fn()} />)
    expect(screen.getByRole('combobox', { name: 'Translate page' })).toHaveValue('fr')
  })
})
