import { ArrowRight, AudioLines, MicOff, Square, X } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Companion } from '../../components/companion/Companion'
import type { CompanionRendererKind } from '../../components/companion/types'
import { Button, IconButton } from '../../components/ui/Button'
import { hrefFor } from '../../lib/useRoute'
import { prefersReducedMotion } from '../../lib/useReducedMotion'
import { cx } from '../../lib/utils'
import { useStore } from '../../state/AppStore'
import type { CompanionMood } from '../../types'
import { starterPrompts } from '../chat/ChatView'
import { Composer } from '../chat/Composer'
import { WakeWordPreview } from './WakeWordPreview'
import './companion-mode.css'

/* Immersive Companion Mode — a visual simulation of a future voice-first
   experience. Everything is local: messages go through the existing scripted
   demo responder, and "listening" is an animation only. Nothing here touches
   the microphone, speech or audio APIs. */

type Status = 'ready' | 'listening' | 'thinking' | 'replying'

const STATUS: Record<Status, { label: string; caption: string }> = {
  ready: { label: 'Ready', caption: 'Type below to talk with Aura.' },
  listening: { label: 'Listening (Demo)', caption: 'Reading what you type — the microphone is never used.' },
  thinking: { label: 'Thinking (Demo)', caption: 'Preparing a scripted demo reply.' },
  replying: { label: 'Replying (Demo)', caption: 'Scripted demo reply — not a live AI.' },
}

const EXIT_MS = 420
/** Start the glide even if the 3D view is slow to initialise. */
const SHOW_TIMEOUT_MS = 1200
const PREVIEW_MS = 5000
const BARS = 28

/** Deterministic pseudo-random values so particles and bars look organic but render identically every time. */
const seeded = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  left: `${8 + seeded(i, 1) * 84}%`,
  top: `${10 + seeded(i, 2) * 80}%`,
  size: 2 + Math.round(seeded(i, 3) * 3),
  duration: `${10 + seeded(i, 4) * 10}s`,
  delay: `${-seeded(i, 5) * 12}s`,
}))

interface CompanionModeProps {
  open: boolean
  /** Called after the exit transition has finished. */
  onClose: () => void
  /** Where the companion sits on Home; the transition starts and ends there. */
  originRef: RefObject<HTMLElement | null>
  /** The overlay character has taken the Home character's place (hide the original). */
  onCharacterShown?: () => void
}

export function CompanionMode({ open, onClose, originRef, onCharacterShown }: CompanionModeProps) {
  const { state, actions, mood, responderLabel, homeThreadId, setHomeThreadId } = useStore()
  const { companionName, companionStyle, showHalo } = state.settings
  const dialogRef = useRef<HTMLDialogElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const logRef = useRef<HTMLOListElement>(null)
  const [phase, setPhase] = useState<'entering' | 'open' | 'closing'>('entering')
  const [backdrop, setBackdrop] = useState(false)
  const [shown, setShown] = useState(false)
  const [characterReady, setCharacterReady] = useState(false)
  const onRenderer = useCallback((kind: CompanionRendererKind) => setCharacterReady(kind === '3d' || kind === '2d-fallback'), [])
  const [previewing, setPreviewing] = useState(false)
  const [showWake, setShowWake] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1100px)').matches)

  /* ---------- Conversation (shared with Home) ---------- */
  const messages = useMemo(() => (homeThreadId ? state.messages.filter((m) => m.threadId === homeThreadId) : []), [state.messages, homeThreadId])
  const recent = messages.slice(-6)
  const thinking = homeThreadId !== null && state.replyingTo === homeThreadId
  const busy = state.replyingTo !== null
  const last = messages[messages.length - 1]
  const prompts = !messages.length ? starterPrompts.slice(0, 3) : last?.role === 'assistant' && !thinking ? (last.followUps ?? []) : []
  const send = (text: string) => {
    setPreviewing(false)
    setHomeThreadId(actions.sendMessage(homeThreadId, text))
  }

  const status: Status = thinking ? 'thinking' : previewing || mood === 'listening' ? 'listening' : mood === 'speaking' ? 'replying' : 'ready'
  const characterMood: CompanionMood = previewing && !thinking ? 'listening' : mood

  /* ---------- Listening preview (animation only) ---------- */
  useEffect(() => {
    if (!previewing) return
    const t = window.setTimeout(() => setPreviewing(false), PREVIEW_MS)
    return () => window.clearTimeout(t)
  }, [previewing])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }, [messages.length, thinking])

  /* ---------- Enter / exit transition ---------- */
  // Moves the stage so it visually sits on the Home companion (FLIP).
  const placeOnOrigin = useCallback(() => {
    const stage = stageRef.current
    const origin = originRef.current?.getBoundingClientRect()
    if (!stage || !origin || origin.width === 0) return false
    stage.style.transform = ''
    const target = stage.getBoundingClientRect()
    const dx = origin.left + origin.width / 2 - (target.left + target.width / 2)
    const dy = origin.top + origin.height / 2 - (target.top + target.height / 2)
    const scale = origin.width / target.width
    stage.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`
    return true
  }, [originRef])

  // Choreography: the backdrop fades in while the overlay's 3D character initialises
  // out of sight (WebGL setup briefly blocks the main thread). Once its first frame is
  // drawn it takes the Home character's exact place, then glides to the centre.
  useLayoutEffect(() => {
    const dialog = dialogRef.current
    const stage = stageRef.current
    if (!open || !dialog || !stage) return
    if (!dialog.open) dialog.showModal()
    // showModal() focuses the first control; start in the text input instead.
    dialog.querySelector('textarea')?.focus({ preventScroll: true })
    const root = document.documentElement
    const previousOverflow = root.style.overflow
    root.style.overflow = 'hidden'

    setPhase('entering')
    setShown(false)
    setBackdrop(false)
    if (!prefersReducedMotion()) {
      stage.style.transition = 'none'
      placeOnOrigin()
    }
    const raf = requestAnimationFrame(() => setBackdrop(true))
    const fallback = window.setTimeout(() => setShown(true), SHOW_TIMEOUT_MS)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(fallback)
      root.style.overflow = previousOverflow
    }
  }, [open, placeOnOrigin])

  useEffect(() => {
    if (open && characterReady) setShown(true)
  }, [open, characterReady])

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!shown || !stage || phase !== 'entering') return
    onCharacterShown?.()
    void stage.offsetWidth // commit the starting position before animating
    const raf = requestAnimationFrame(() => {
      stage.style.transition = ''
      stage.style.transform = ''
      setPhase('open')
    })
    return () => cancelAnimationFrame(raf)
  }, [shown, phase, onCharacterShown])

  const close = useCallback(() => {
    if (phase === 'closing') return
    setPhase('closing')
    setBackdrop(false)
    setPreviewing(false)
    const reduced = prefersReducedMotion()
    if (!reduced) placeOnOrigin()
    window.setTimeout(
      () => {
        dialogRef.current?.close()
        if (stageRef.current) stageRef.current.style.transform = ''
        onClose()
      },
      reduced ? 0 : EXIT_MS,
    )
  }, [phase, placeOnOrigin, onClose])

  if (!open) return null

  return (
    <dialog
      ref={dialogRef}
      className="cmode"
      data-phase={phase}
      data-status={status}
      data-backdrop={backdrop || undefined}
      data-shown={shown || undefined}
      aria-label="Companion Mode"
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
    >
      <div className="cmode__backdrop" aria-hidden>
        <div className="cmode__glow" />
        <div className="cmode__particles">
          {PARTICLES.map((p, i) => (
            <span key={i} style={{ left: p.left, top: p.top, width: p.size, height: p.size, animationDuration: p.duration, animationDelay: p.delay }} />
          ))}
        </div>
      </div>

      <div className="cmode__frame">
        <header className="cmode__header">
          <p className="cmode__title">Companion Mode</p>
          <div className="cmode__header-actions">
            <button
              type="button"
              className="cmode__voice-chip"
              onClick={() => setShowWake((v) => !v)}
              aria-expanded={showWake}
              aria-controls="cmode-wake"
            >
              <MicOff size={14} aria-hidden />
              <span>Voice not connected</span>
            </button>
            <IconButton icon={X} label="Close Companion Mode" onClick={close} variant="solid" />
          </div>
        </header>

        <div className="cmode__body">
          <div className="cmode__stage" ref={stageRef}>
            <Companion mood={characterMood} appearance={companionStyle} name={companionName} size="hero" halo={showHalo} onRendererChange={onRenderer} />
            <div className="cmode__listening" aria-hidden>
              {Array.from({ length: BARS }, (_, i) => (
                <span key={i} style={{ animationDuration: `${0.7 + seeded(i, 7) * 0.7}s`, animationDelay: `${-seeded(i, 8)}s` }} />
              ))}
            </div>
          </div>

          <div className="cmode__status" role="status" aria-live="polite">
            <span className="cmode__status-pill">
              <span className="cmode__status-dot" aria-hidden />
              {STATUS[status].label}
            </span>
            <span className="cmode__status-caption">{previewing && status === 'listening' ? 'Visual preview only — your microphone is off.' : STATUS[status].caption}</span>
          </div>

          <section className="cmode__log-wrap" aria-label="Conversation">
            {recent.length === 0 ? (
              <p className="cmode__empty">Say something to begin. This continues your Home conversation, using the {responderLabel.toLowerCase()}.</p>
            ) : (
              <ol className="cmode__log" ref={logRef}>
                {messages.length > recent.length && <li className="cmode__earlier">Earlier messages are in Chat</li>}
                {recent.map((m) => (
                  <li key={m.id} className={cx('cmode__msg', `cmode__msg--${m.role}`)}>
                    <span className="visually-hidden">{m.role === 'user' ? 'You:' : `${companionName}:`}</span>
                    <p>{m.text}</p>
                    {m.status === 'error' && (
                      <Button size="sm" variant="ghost" onClick={() => actions.retryMessage(m.id)} disabled={busy}>
                        Couldn’t get a reply — retry
                      </Button>
                    )}
                    {m.cards && m.cards.length > 0 && (
                      <a className="cmode__attachments" href={hrefFor('chat', m.threadId)}>
                        {m.cards.length} attachment{m.cards.length === 1 ? '' : 's'} — view in Chat <ArrowRight size={12} aria-hidden />
                      </a>
                    )}
                  </li>
                ))}
                {thinking && (
                  <li className="cmode__msg cmode__msg--assistant cmode__msg--thinking">
                    <span className="home-thinking__dots" aria-hidden>
                      <span />
                      <span />
                      <span />
                    </span>
                    <span className="visually-hidden">{companionName} is thinking</span>
                  </li>
                )}
              </ol>
            )}
          </section>

          <div id="cmode-wake" className="cmode__wake-slot">
            {showWake && <WakeWordPreview className="cmode__wake" onDismiss={() => setShowWake(false)} />}
          </div>
        </div>

        <footer className="cmode__footer">
          <div className="cmode__prompts">
            {prompts.map((p) => (
              <button key={p} type="button" className="chip chip--sm" onClick={() => send(p)} disabled={busy}>
                {p}
              </button>
            ))}
            <button
              type="button"
              className="chip chip--sm cmode__preview"
              aria-pressed={previewing}
              onClick={() => setPreviewing((v) => !v)}
              disabled={thinking}
            >
              {previewing ? <Square size={12} aria-hidden /> : <AudioLines size={13} aria-hidden />}
              {previewing ? 'Stop preview' : 'Preview listening'}
            </button>
          </div>
          <Composer onSend={send} busy={busy} placeholder={`Type to ${companionName}…`} label={`Message ${companionName} in Companion Mode`} variant="hero" autoFocus />
          {homeThreadId && (
            <a className="cmode__continue" href={hrefFor('chat', homeThreadId)}>
              Continue in Chat <ArrowRight size={13} aria-hidden />
            </a>
          )}
        </footer>
      </div>
    </dialog>
  )
}
