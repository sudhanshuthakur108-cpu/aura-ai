import { useCallback, useEffect, useState } from 'react'

export type View = 'home' | 'chat' | 'memory' | 'missions' | 'approvals' | 'settings'

export interface Route {
  view: View
  /** Optional id, e.g. a thread or mission. */
  param?: string
}

const VIEWS: View[] = ['home', 'chat', 'memory', 'missions', 'approvals', 'settings']

export function parseHash(hash: string): Route {
  const [view, param] = hash.replace(/^#\/?/, '').split('/')
  return VIEWS.includes(view as View) ? { view: view as View, param: param ? decodeURIComponent(param) : undefined } : { view: 'home' }
}

export function hrefFor(view: View, param?: string) {
  return `#/${view}${param ? `/${encodeURIComponent(param)}` : ''}`
}

/** Minimal hash router: keeps back/forward and deep links working without a dependency. */
export function useRoute() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))

  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const navigate = useCallback((view: View, param?: string) => {
    const next = hrefFor(view, param)
    if (window.location.hash !== next) window.location.hash = next
  }, [])

  return { route, navigate }
}
