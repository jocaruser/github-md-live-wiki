import { useCallback, useEffect, useState } from 'react'
import { Landing } from './components/Landing'
import { Wiki } from './components/Wiki'
import { useHashRoute } from './hooks/useHashRoute'
import { useTheme } from './hooks/useTheme'
import { getRecents, removeRecent, type Selection } from './lib/library'
import { formatRoute } from './lib/route'

export function App() {
  const route = useHashRoute()
  const { theme, toggleTheme } = useTheme()
  const [recents, setRecents] = useState<Selection[]>(() => getRecents())

  // The recents list can grow while a repo is open (see Wiki); refresh it from
  // storage every time we return to the landing form.
  useEffect(() => {
    if (!route.repo) setRecents(getRecents())
  }, [route.repo])

  const open = useCallback((selection: Selection) => {
    window.location.hash = formatRoute({ repo: selection.repo, path: selection.path, page: '' })
  }, [])
  const close = useCallback(() => {
    window.location.hash = ''
  }, [])
  const dropRecent = useCallback((selection: Selection) => {
    setRecents(removeRecent(selection))
  }, [])

  if (route.repo) {
    return (
      <Wiki
        key={`${route.repo}:${route.path}`}
        repo={route.repo}
        route={route}
        onClose={close}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    )
  }

  return (
    <Landing
      recents={recents}
      onOpen={open}
      onRemoveRecent={dropRecent}
      theme={theme}
      onToggleTheme={toggleTheme}
    />
  )
}
