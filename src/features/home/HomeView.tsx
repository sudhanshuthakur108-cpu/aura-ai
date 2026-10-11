import { ArrowRight, Brain, CircleAlert, Hand, ListChecks, Maximize2, RotateCcw, ShieldCheck, SquarePen, Target, type LucideIcon } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { Companion, moodLabels } from '../../components/companion/Companion'
import { Button } from '../../components/ui/Button'
import { hrefFor } from '../../lib/useRoute'
import { cx, greetingFor } from '../../lib/utils'
import { useStore } from '../../state/AppStore'
import type { AppState } from '../../state/reducer'
import type { Message, RichCard } from '../../types'
import { starterPrompts } from '../chat/ChatView'
import { Composer } from '../chat/Composer'
import { proposalKindMeta } from '../approvals/meta'
import { CompanionMode } from '../companion-mode/CompanionMode'
import './home.css'

/** The latest exchange in a thread: the last user message and the reply to it, if any. */
function latestExchange(messages: Message[]) {
  let userIndex = -1
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      userIndex = i
      break
    }
  }
  if (userIndex === -1) return { user: undefined, reply: undefined }
  return { user: messages[userIndex], reply: messages.slice(userIndex + 1).find((m) => m.role === 'assistant') }
}

/** Home keeps replies compact: rich attachments become a single link to where they live. */
function attachment(card: RichCard, state: AppState, threadId: string): { icon: LucideIcon; kind: string; title: string; href: string } | null {
  switch (card.kind) {
    case 'mission': {
      const m = state.missions.find((x) => x.id === card.missionId)
      return m ? { icon: Target, kind: 'Mission', title: m.title, href: hrefFor('missions', m.id) } : null
    }
    case 'proposal': {
      const p = state.proposals.find((x) => x.id === card.proposalId)
      return p ? { icon: proposalKindMeta[p.kind].icon, kind: 'Needs your approval', title: p.title, href: hrefFor('approvals', p.id) } : null
    }
    case 'memory-saved': {
      const m = state.memories.find((x) => x.id === card.memoryId)
      return m ? { icon: Brain, kind: 'Saved to memory', title: m.title, href: hrefFor('memory', m.id) } : null
    }
    case 'memory-list':
      return { icon: Brain, kind: 'From memory', title: `${card.memoryIds.length} things I remember`, href: hrefFor('chat', threadId) }
    case 'checklist':
      return { icon: ListChecks, kind: 'Checklist', title: `${card.title} · ${card.items.length} items`, href: hrefFor('chat', threadId) }
  }
}

export function HomeView() {
  const [immersive, setImmersive] = useState(false)
  // True once Companion Mode's character has taken over; the Home one then hides.
  const [lifted, setLifted] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const liftHome = useCallback(() => setLifted(true), [])
  const { state, actions, mood, responderLabel, homeThreadId, setHomeThreadId } = useStore()
  const { preferredName, companionName, companionStyle, showHalo } = state.settings
  const name = preferredName.trim()

  const messages = useMemo(() => (homeThreadId ? state.messages.filter((m) => m.threadId === homeThreadId) : []), [state.messages, homeThreadId])
  const { user, reply } = latestExchange(messages)
  const conversing = Boolean(user)
  const thinking = homeThreadId !== null && state.replyingTo === homeThreadId
  const busy = state.replyingTo !== null

  const pending = state.proposals.filter((p) => p.status === 'pending')
  const blocked = state.missions.filter((m) => m.status === 'blocked')
  const lastThread = useMemo(() => [...state.threads].filter((t) => t.id !== homeThreadId).sort((a, b) => b.updatedAt - a.updatedAt)[0], [state.threads, homeThreadId])

  const send = (text: string) => setHomeThreadId(actions.sendMessage(homeThreadId, text))
  const followUps = reply?.followUps ?? []

  return (
    <div className={cx('home', conversing && 'home--conversing')}>
      {(pending.length > 0 || blocked.length > 0) && (
        <nav className="home-context" aria-label="Waiting on you">
          {pending.length > 0 && (
            <a href={hrefFor('approvals', pending[0].id)} className="home-context__item">
              <ShieldCheck size={14} aria-hidden />
              {pending.length} approval{pending.length === 1 ? '' : 's'} waiting
            </a>
          )}
          {blocked.length > 0 && (
            <a href={hrefFor('missions', blocked[0].id)} className="home-context__item">
              <Hand size={14} aria-hidden />
              {blocked.length} mission{blocked.length === 1 ? ' needs' : 's need'} you
            </a>
          )}
        </nav>
      )}

      <div className="home-stage" data-lifted={lifted || undefined}>
        <button
          ref={triggerRef}
          type="button"
          className="home-stage__trigger"
          onClick={() => setImmersive(true)}
          aria-haspopup="dialog"
          aria-label={`Open Companion Mode with ${companionName}`}
        >
          {/* Holds still while Companion Mode shows its own, larger character. */}
          <Companion mood={mood} appearance={companionStyle} name={companionName} size="hero" halo={showHalo} animate={!lifted} />
          <span className="home-stage__hint" aria-hidden>
            <Maximize2 size={12} /> Companion Mode
          </span>
        </button>
        <p className="visually-hidden" aria-live="polite">
          {companionName} is {moodLabels[mood].toLowerCase()}
        </p>
      </div>

      <CompanionMode
        open={immersive}
        originRef={triggerRef}
        onCharacterShown={liftHome}
        onClose={() => {
          setLifted(false)
          setImmersive(false)
          triggerRef.current?.focus()
        }}
      />

      <section className="home-dialogue" aria-labelledby="home-greeting">
        {!conversing ? (
          <>
            <h1 id="home-greeting" className="display home-dialogue__greeting">
              {greetingFor()}
              {name ? `, ${name}` : ''}.
            </h1>
            <p className="home-dialogue__line">I’m here. What’s on your mind?</p>
          </>
        ) : (
          <>
            <h1 id="home-greeting" className="visually-hidden">
              Conversation with {companionName}
            </h1>
            <p className="home-dialogue__you">
              <span className="visually-hidden">You said: </span>
              {user!.text}
            </p>
            <div className="home-dialogue__reply" aria-live="polite">
              {thinking ? (
                <p className="home-thinking" role="status">
                  <span className="home-thinking__dots" aria-hidden>
                    <span />
                    <span />
                    <span />
                  </span>
                  {companionName} is thinking…
                </p>
              ) : user!.status === 'error' ? (
                <div className="home-error" role="alert">
                  <p>
                    <CircleAlert size={16} aria-hidden /> Couldn’t get a reply. {user!.error}
                  </p>
                  <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => actions.retryMessage(user!.id)} disabled={busy}>
                    Retry
                  </Button>
                </div>
              ) : reply ? (
                <div key={reply.id} className="home-reply">
                  <p className="home-reply__text">{reply.text}</p>
                  {reply.cards && reply.cards.length > 0 && (
                    <ul className="home-attachments" aria-label="Attached to this reply">
                      {reply.cards.map((card, i) => {
                        const a = attachment(card, state, homeThreadId!)
                        if (!a) return null
                        return (
                          <li key={i}>
                            <a href={a.href} className="home-attachment">
                              <a.icon size={16} aria-hidden />
                              <span className="home-attachment__text">
                                <span className="home-attachment__kind">{a.kind}</span>
                                <span className="home-attachment__title">{a.title}</span>
                              </span>
                              <ArrowRight size={15} aria-hidden className="home-attachment__arrow" />
                            </a>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
            {!thinking && reply && (
              <div className="home-dialogue__actions">
                <a className="btn btn--sm btn--quiet" href={hrefFor('chat', homeThreadId!)}>
                  <span>Continue in Chat</span>
                  <ArrowRight size={15} aria-hidden />
                </a>
                <Button size="sm" variant="ghost" icon={SquarePen} onClick={() => setHomeThreadId(null)}>
                  Start fresh
                </Button>
                <span className="home-dialogue__note">{responderLabel} · not a live AI</span>
              </div>
            )}
          </>
        )}
      </section>

      <div className="home-composer">
        <Composer
          onSend={send}
          busy={busy}
          placeholder={conversing ? `Reply to ${companionName}…` : `Talk to ${companionName}…`}
          label={`Message ${companionName}`}
          variant="hero"
        />
      </div>

      {!conversing ? (
        <div className="home-starters" role="group" aria-label="Conversation starters">
          {starterPrompts.map((p) => (
            <button key={p} type="button" className="chip chip--sm" onClick={() => send(p)} disabled={busy}>
              {p}
            </button>
          ))}
        </div>
      ) : (
        followUps.length > 0 &&
        !thinking && (
          <div className="home-starters" role="group" aria-label="Suggested follow-ups">
            {followUps.map((p) => (
              <button key={p} type="button" className="chip chip--sm" onClick={() => send(p)} disabled={busy}>
                {p}
              </button>
            ))}
          </div>
        )
      )}

      {!conversing && lastThread && (
        <p className="home-resume">
          or pick up{' '}
          <a href={hrefFor('chat', lastThread.id)}>
            “{lastThread.title}” <ArrowRight size={13} aria-hidden />
          </a>
        </p>
      )}
    </div>
  )
}
