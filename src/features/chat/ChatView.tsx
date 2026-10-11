import { ArrowDown, ArrowLeft, Bot, CircleAlert, MessageSquarePlus, MessagesSquare, RotateCcw, Trash } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Companion, moodLabels } from '../../components/companion/Companion'
import { Badge } from '../../components/ui/Badge'
import { Button, IconButton } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/Dialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { hrefFor, type View } from '../../lib/useRoute'
import { clockTime, cx, relativeTime } from '../../lib/utils'
import { useStore } from '../../state/AppStore'
import type { Message } from '../../types'
import { Composer } from './Composer'
import { RichCardView } from './RichCards'
import './chat.css'

export const starterPrompts = ['Help me plan my day', 'What do you remember about me?', 'How are the headphones going?', 'Long day — help me wind down']

interface ChatViewProps {
  threadId?: string
  navigate: (view: View, param?: string) => void
}

export function ChatView({ threadId, navigate }: ChatViewProps) {
  const { state, actions, mood, responderLabel } = useStore()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const threads = useMemo(() => [...state.threads].sort((a, b) => b.updatedAt - a.updatedAt), [state.threads])
  const activeId = threadId ?? threads[0]?.id
  const thread = state.threads.find((t) => t.id === activeId)
  const messages = useMemo(() => state.messages.filter((m) => m.threadId === activeId), [state.messages, activeId])
  const replying = state.replyingTo === activeId
  const { companionName, companionStyle } = state.settings

  const lastMessage = (id: string) => {
    for (let i = state.messages.length - 1; i >= 0; i--) if (state.messages[i].threadId === id) return state.messages[i]
    return undefined
  }

  const send = (text: string) => {
    const id = actions.sendMessage(thread ? thread.id : null, text)
    if (id !== threadId) navigate('chat', id)
  }

  const newThread = () => navigate('chat', actions.createThread())

  return (
    <div className="chat" data-pane={threadId ? 'conversation' : 'list'}>
      <aside className="threads" aria-label="Conversations">
        <header className="threads__head">
          <h1 className="threads__title">Conversations</h1>
          <Button size="sm" variant="quiet" icon={MessageSquarePlus} onClick={newThread}>
            New
          </Button>
        </header>
        {threads.length === 0 ? (
          <EmptyState icon={MessagesSquare} title="No conversations yet" compact>
            Start one and it will appear here.
          </EmptyState>
        ) : (
          <ul className="threads__list">
            {threads.map((t) => {
              const last = lastMessage(t.id)
              return (
                <li key={t.id}>
                  <a href={hrefFor('chat', t.id)} className="thread-link" aria-current={t.id === activeId ? 'true' : undefined}>
                    <span className="thread-link__top">
                      <span className="thread-link__title">{t.title}</span>
                      <time className="thread-link__time" dateTime={new Date(t.updatedAt).toISOString()}>
                        {relativeTime(t.updatedAt)}
                      </time>
                    </span>
                    <span className="thread-link__preview">
                      {state.replyingTo === t.id ? `${companionName} is thinking…` : last ? `${last.role === 'user' ? 'You: ' : ''}${last.text}` : 'No messages yet'}
                    </span>
                  </a>
                </li>
              )
            })}
          </ul>
        )}
      </aside>

      <section className="conversation" aria-label={thread ? `Conversation: ${thread.title}` : 'Conversation'}>
        {!thread ? (
          <div className="conversation__missing">
            <EmptyState
              icon={MessagesSquare}
              title={threadId ? 'Conversation not found' : 'No conversation selected'}
              action={
                <Button variant="primary" icon={MessageSquarePlus} onClick={newThread}>
                  Start a conversation
                </Button>
              }
            >
              {threadId ? 'It may have been deleted, or the demo was reset.' : 'Pick a conversation or start a new one.'}
            </EmptyState>
          </div>
        ) : (
          <>
            <header className="conversation__head">
              <a className="icon-btn conversation__back" href={hrefFor('chat')} aria-label="Back to conversations">
                <ArrowLeft size={18} aria-hidden />
              </a>
              <Companion mood={mood} appearance={companionStyle} name={companionName} size="sm" />
              <div className="conversation__who">
                <h2 className="conversation__title">{thread.title}</h2>
                <p className="conversation__mood" aria-live="polite">
                  {companionName} · {moodLabels[mood]}
                </p>
              </div>
              <Badge tone="muted" icon={Bot} className="conversation__responder">
                {responderLabel}
              </Badge>
              <IconButton icon={Trash} label="Delete conversation" onClick={() => setConfirmDelete(true)} />
            </header>

            <MessageList
              key={thread.id}
              messages={messages}
              replying={replying}
              companionName={companionName}
              onFollowUp={send}
              onRetry={actions.retryMessage}
            />

            <div className="conversation__composer">
              <Composer
                onSend={send}
                busy={replying || state.replyingTo !== null}
                placeholder={`Message ${companionName}…`}
                label={`Message ${companionName}`}
                autoFocus={messages.length === 0}
              />
            </div>
          </>
        )}
      </section>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this conversation?"
        confirmLabel="Delete conversation"
        onConfirm={() => {
          if (!thread) return
          actions.deleteThread(thread.id)
          navigate('chat')
        }}
      >
        <p className="muted">“{thread?.title}” and its messages will be removed from this demo session. Memories, missions and proposals it created are kept.</p>
      </ConfirmDialog>
    </div>
  )
}

interface MessageListProps {
  messages: Message[]
  replying: boolean
  companionName: string
  onFollowUp: (text: string) => void
  onRetry: (messageId: string) => void
}

function MessageList({ messages, replying, companionName, onFollowUp, onRetry }: MessageListProps) {
  const scroller = useRef<HTMLDivElement>(null)
  const [atBottom, setAtBottom] = useState(true)
  // Only messages that arrive after the thread opens get an entrance transition.
  const [openedAt] = useState(() => Date.now())
  const last = messages[messages.length - 1]

  const scrollToBottom = (smooth: boolean) => {
    const el = scroller.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }

  // Jump to the end when a thread opens.
  useLayoutEffect(() => scrollToBottom(false), [])

  // Follow new messages if the reader is already at the bottom or just sent one.
  useEffect(() => {
    if (atBottom || last?.role === 'user') scrollToBottom(true)
  }, [messages.length, replying])

  const onScroll = () => {
    const el = scroller.current
    if (!el) return
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80)
  }

  return (
    <div className="messages-wrap">
      <div className="messages" ref={scroller} onScroll={onScroll}>
        {messages.length === 0 ? (
          <div className="messages__empty">
            <EmptyState icon={MessagesSquare} title={`Say hello to ${companionName}`} compact>
              Replies come from a scripted demo responder. Try one of these:
            </EmptyState>
            <div className="followups followups--center">
              {starterPrompts.map((p) => (
                <button key={p} type="button" className="chip" onClick={() => onFollowUp(p)} disabled={replying}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ol className="messages__list" aria-label="Messages">
            {messages.map((m) => {
              const time = (
                <time className="msg__time" dateTime={new Date(m.createdAt).toISOString()}>
                  {clockTime(m.createdAt)}
                </time>
              )
              return (
                <li key={m.id} className={cx('msg', `msg--${m.role}`, m.status === 'error' && 'msg--error', m.createdAt >= openedAt && 'msg--new')}>
                  {m.role === 'assistant' && <span className="msg__avatar" aria-hidden />}
                  <div className="msg__content">
                    {m.role === 'assistant' ? (
                      <p className="msg__meta">
                        <span className="msg__name">{companionName}</span>
                        {time}
                      </p>
                    ) : (
                      <p className="visually-hidden">You said:</p>
                    )}
                    <div className="msg__bubble">{m.text}</div>
                    {m.cards && m.cards.length > 0 && (
                      <div className="msg__cards" role="group" aria-label="Attached to this reply">
                        {m.cards.map((c, i) => (
                          <RichCardView key={i} card={c} />
                        ))}
                      </div>
                    )}
                    {m.status === 'error' ? (
                      <div className="msg__error" role="alert">
                        <CircleAlert size={15} aria-hidden />
                        <span>Couldn’t get a reply. {m.error}</span>
                        <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => onRetry(m.id)} disabled={replying}>
                          Retry
                        </Button>
                      </div>
                    ) : (
                      m.role === 'user' && time
                    )}
                  </div>
                </li>
              )
            })}
            {replying && (
              <li className="msg msg--assistant msg--new msg--pending">
                <span className="msg__avatar msg__avatar--thinking" aria-hidden />
                <div className="msg__content">
                  <p className="msg__typing" role="status">
                    <span className="typing-dot" aria-hidden />
                    <span className="typing-dot" aria-hidden />
                    <span className="typing-dot" aria-hidden />
                    <span className="msg__typing-label">{companionName} is thinking…</span>
                  </p>
                </div>
              </li>
            )}
          </ol>
        )}
        {last?.role === 'assistant' && last.followUps && !replying && (
          <div className="followups" role="group" aria-label="Suggested follow-ups">
            <span className="followups__label" aria-hidden>
              Suggested
            </span>
            {last.followUps.map((f) => (
              <button key={f} type="button" className="chip" onClick={() => onFollowUp(f)}>
                {f}
              </button>
            ))}
          </div>
        )}
      </div>
      {!atBottom && (
        <button type="button" className="jump-latest" onClick={() => scrollToBottom(true)}>
          <ArrowDown size={15} aria-hidden /> Latest
        </button>
      )}
    </div>
  )
}
