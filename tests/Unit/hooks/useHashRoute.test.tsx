import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useHashRoute } from '../../../src/hooks/useHashRoute'

function setHash(hash: string) {
  window.location.hash = hash
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

describe('useHashRoute', () => {
  it('parses the current hash on mount', () => {
    window.location.hash = '#/v1.0.0/guide/intro.md'
    const { result } = renderHook(() => useHashRoute('main'))
    expect(result.current).toEqual({ ref: 'v1.0.0', path: 'guide/intro.md', anchor: undefined })
  })

  it('follows hash changes', () => {
    const { result } = renderHook(() => useHashRoute('main'))
    expect(result.current).toEqual({ ref: 'main', path: '' })
    act(() => setHash('#/feat%2Fx/a.md#sec'))
    expect(result.current).toEqual({ ref: 'feat/x', path: 'a.md', anchor: 'sec' })
  })

  it('removes its listener on unmount', () => {
    const remove = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useHashRoute('main'))
    unmount()
    expect(remove).toHaveBeenCalledWith('hashchange', expect.any(Function))
    remove.mockRestore()
  })
})
