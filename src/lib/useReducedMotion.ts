import { useEffect, useState } from 'react'

/** True when motion should be minimised: the OS asks for reduced motion (unless
    the user chose "Full" in Settings), or the user chose "Reduced". Reads the
    `data-motion` attribute App.tsx keeps on <html>. */
export function prefersReducedMotion() {
  if (typeof window === 'undefined') return false
  const pref = document.documentElement.dataset.motion
  if (pref === 'reduced') return true
  if (pref === 'full') return false
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(prefersReducedMotion)

  useEffect(() => {
    const update = () => setReduced(prefersReducedMotion())
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    media?.addEventListener('change', update)
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] })
    update()
    return () => {
      media?.removeEventListener('change', update)
      observer.disconnect()
    }
  }, [])

  return reduced
}
