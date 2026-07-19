import { useEffect, useState } from 'react'
import { hashOf, parseRoute, type Route } from '../lib/route'

// The fragment is read from location.href, never location.hash — see hashOf.
export function useHashRoute(defaultRef: string): Route {
  const [route, setRoute] = useState<Route>(() =>
    parseRoute(hashOf(window.location.href), defaultRef)
  )
  useEffect(() => {
    const onHashChange = () => setRoute(parseRoute(hashOf(window.location.href), defaultRef))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [defaultRef])
  return route
}
