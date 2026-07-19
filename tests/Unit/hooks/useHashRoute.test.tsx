import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useHashRoute } from '../../../src/hooks/useHashRoute'

function setHash(hash: string) {
  window.location.hash = hash
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

describe('useHashRoute', () => {
  it('parses the current hash on mount', () => {
    window.location.hash = '#r=o/r&p=docs&v=v1.0.0&f=guide/intro.md'
    const { result } = renderHook(() => useHashRoute())
    expect(result.current).toMatchObject({
      repo: 'o/r',
      path: 'docs',
      ref: 'v1.0.0',
      page: 'guide/intro.md',
    })
  })

  it('follows hash changes', () => {
    const { result } = renderHook(() => useHashRoute())
    expect(result.current.repo).toBeUndefined()
    act(() => setHash('#r=o/r&f=a.md'))
    expect(result.current).toMatchObject({ repo: 'o/r', page: 'a.md' })
  })

  it('removes its listener on unmount', () => {
    const remove = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useHashRoute())
    unmount()
    expect(remove).toHaveBeenCalledWith('hashchange', expect.any(Function))
    remove.mockRestore()
  })
})
