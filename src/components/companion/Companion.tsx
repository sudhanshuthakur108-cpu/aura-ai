import { Component, lazy, Suspense, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from 'react'
import { useReducedMotion } from '../../lib/useReducedMotion'
import { cx } from '../../lib/utils'
import { OrbRenderer } from './renderers/OrbRenderer'
import { supportsWebGL } from './three/webgl'
import { moodLabels, type CompanionMood, type CompanionRendererKind, type CompanionSize, type CompanionStyle } from './types'
import './companion.css'

/* Public boundary for the companion character. Screens only use <Companion>.

   - size "hero": the real-time 3D character (three.js via React Three Fiber),
     loaded lazily so it never blocks the app. The 2D avatar is shown until the
     first 3D frame is drawn, and stays as the fallback when WebGL is missing,
     the context is lost, or the scene throws.
   - sizes "sm" / "md" / "lg": the matching 2D avatar (renderers/OrbRenderer).
     Small avatars stay 2D so the app never runs more than one WebGL context. */

const Companion3D = lazy(() => import('./three/Companion3D'))

export interface CompanionProps {
  mood: CompanionMood
  appearance: CompanionStyle
  name: string
  size?: CompanionSize
  halo?: boolean
  /** Set false to hold the character still (e.g. inactive previews). */
  animate?: boolean
  className?: string
  /** Reports which renderer is actually on screen. */
  onRendererChange?: (kind: CompanionRendererKind) => void
}

/** Animation runs only while the character is on screen and the tab is visible. */
function useOnScreen<T extends Element>() {
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(true)
  const [pageVisible, setPageVisible] = useState(() => typeof document === 'undefined' || !document.hidden)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const onChange = () => setPageVisible(!document.hidden)
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])

  return [ref, visible && pageVisible] as const
}

export function CompanionFallback({ name, size = 'lg' }: { name: string; size?: CompanionSize }) {
  return (
    <div className={cx('companion', 'companion-fallback', `companion--${size}`)} role="img" aria-label={`${name} (character unavailable)`}>
      <span>{name.charAt(0).toUpperCase()}</span>
    </div>
  )
}

class RenderBoundary extends Component<{ fallback: ReactNode; onError?: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Companion renderer failed; showing fallback.', error, info.componentStack)
    this.props.onError?.()
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export function Companion({ mood, appearance, name, size = 'lg', halo = true, animate = true, className, onRendererChange }: CompanionProps) {
  const [ref, onScreen] = useOnScreen<HTMLDivElement>()
  const reduced = useReducedMotion()
  // One decision for every renderer: move only when on screen, in a visible tab, with motion allowed.
  const active = animate && onScreen && !reduced
  const wants3D = size === 'hero'
  const [kind, setKind] = useState<CompanionRendererKind>(() => (!wants3D ? '2d' : supportsWebGL() ? 'loading-3d' : '2d-fallback'))

  useEffect(() => {
    if (!wants3D) setKind('2d')
  }, [wants3D])

  useEffect(() => onRendererChange?.(kind), [kind, onRendererChange])

  const orb = <OrbRenderer mood={mood} appearance={appearance} size={size} halo={halo} active={active && kind !== '3d'} />
  const use3D = kind === 'loading-3d' || kind === '3d'

  return (
    <div
      ref={ref}
      className={cx('companion', `companion--${size}`, className)}
      data-renderer={kind}
      data-mood={mood}
      data-animating={active || undefined}
      role="img"
      aria-label={`${name}, ${moodLabels[mood].toLowerCase()}`}
    >
      <RenderBoundary fallback={<CompanionFallback name={name} size={size} />}>
        {use3D ? (
          <div className="companion-3d" data-ready={kind === '3d' || undefined}>
            <div className="companion-3d__placeholder" aria-hidden>
              {orb}
            </div>
            <RenderBoundary fallback={null} onError={() => setKind('2d-fallback')}>
              <Suspense fallback={null}>
                <Companion3D
                  mood={mood}
                  appearance={appearance}
                  halo={halo}
                  active={active}
                  onReady={() => setKind('3d')}
                  onContextLost={() => setKind('2d-fallback')}
                />
              </Suspense>
            </RenderBoundary>
          </div>
        ) : (
          orb
        )}
      </RenderBoundary>
    </div>
  )
}

export { moodLabels }
