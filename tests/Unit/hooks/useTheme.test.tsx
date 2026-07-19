import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useTheme } from '../../../src/hooks/useTheme'
import { stubMatchMedia } from '../setup'

describe('useTheme', () => {
  it('uses the stored preference first', () => {
    localStorage.setItem('github-md-live-wiki-theme', 'dark')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')
    expect(document.documentElement).toHaveClass('dark')
  })

  it('falls back to the system preference', () => {
    stubMatchMedia(true)
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')
  })

  it('defaults to light otherwise', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('light')
    expect(document.documentElement).not.toHaveClass('dark')
  })

  it('toggles and persists', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.toggleTheme())
    expect(result.current.theme).toBe('dark')
    expect(localStorage.getItem('github-md-live-wiki-theme')).toBe('dark')
    expect(document.documentElement).toHaveClass('dark')
    act(() => result.current.toggleTheme())
    expect(result.current.theme).toBe('light')
    expect(document.documentElement).not.toHaveClass('dark')
  })
})
