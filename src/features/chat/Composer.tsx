import { ArrowUp, Paperclip } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { IconButton } from '../../components/ui/Button'
import { useToast } from '../../components/ui/Toast'
import { cx } from '../../lib/utils'
import { useStore } from '../../state/AppStore'

const MAX = 2000

interface ComposerProps {
  onSend: (text: string) => void
  busy: boolean
  placeholder: string
  label: string
  autoFocus?: boolean
  variant?: 'default' | 'hero'
}

export function Composer({ onSend, busy, placeholder, label, autoFocus, variant = 'default' }: ComposerProps) {
  const [text, setText] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)
  const hintId = useId()
  const toast = useToast()
  const { actions } = useStore()
  const { setListening } = actions
  const trimmed = text.trim()
  const canSend = trimmed.length > 0 && !busy && text.length <= MAX

  // Grow with content up to a cap.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`
  }, [text])

  useEffect(() => () => setListening(false), [setListening])

  const submit = () => {
    if (!canSend) return
    onSend(trimmed)
    setText('')
    setListening(false)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <form
      className={cx('composer', `composer--${variant}`)}
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <label className="visually-hidden" htmlFor={`${hintId}-input`}>
        {label}
      </label>
      <textarea
        id={`${hintId}-input`}
        ref={ref}
        className="composer__input"
        rows={1}
        value={text}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-describedby={hintId}
        onChange={(e) => {
          setText(e.target.value)
          setListening(e.target.value.trim().length > 0)
        }}
        onFocus={() => setListening(text.trim().length > 0)}
        onBlur={() => setListening(false)}
        onKeyDown={onKeyDown}
      />
      <div className="composer__bar">
        <div className="composer__tools">
          <IconButton
            icon={Paperclip}
            label="Attach a file (not available in demo)"
            size="sm"
            onClick={() => toast({ tone: 'info', title: 'Attachments aren’t available in this demo', body: 'Nothing was selected or uploaded.' })}
          />
        </div>
        <p id={hintId} className="composer__hint">
          {text.length > MAX - 300 ? (
            <span className={cx(text.length > MAX && 'composer__over')}>
              {text.length}/{MAX}
            </span>
          ) : busy ? (
            'Waiting for a reply…'
          ) : (
            <>
              <span className="kbd">Enter</span> send · <span className="kbd">Shift</span>+<span className="kbd">Enter</span> new line
            </>
          )}
        </p>
        <button type="submit" className="composer__send" disabled={!canSend} aria-label={busy ? 'Waiting for reply' : 'Send message'}>
          {busy ? <span className="composer__spinner" aria-hidden /> : <ArrowUp size={18} aria-hidden />}
        </button>
      </div>
    </form>
  )
}
