import { useEffect, useState } from 'react'
import { hashOf, parseRoute, type Route } from '../lib/route'

// The fragment is read from location.href, never location.hash — see hashOf.
export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(hashOf(window.location.href)))
  useEffect(() => {
    const onHashChange = () => setRoute(parseRoute(hashOf(window.location.href)))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])
  return route
}
