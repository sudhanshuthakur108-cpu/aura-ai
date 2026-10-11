import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { uid } from '../../lib/utils'

type ToastTone = 'info' | 'success' | 'error'
interface ToastItem {
  id: string
  title: string
  body?: string
  tone: ToastTone
}

const ToastContext = createContext<(t: Omit<ToastItem, 'id'>) => void>(() => {})

export function useToast() {
  return useContext(ToastContext)
}

const ICONS = { info: Info, success: CircleCheck, error: CircleAlert }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const timers = useRef(new Map<string, number>())

  const dismiss = useCallback((id: string) => {
    setItems((list) => list.filter((t) => t.id !== id))
    window.clearTimeout(timers.current.get(id))
    timers.current.delete(id)
  }, [])

  const push = useCallback(
    (t: Omit<ToastItem, 'id'>) => {
      const id = uid('toast')
      setItems((list) => [...list.slice(-2), { ...t, id }])
      timers.current.set(id, window.setTimeout(() => dismiss(id), t.tone === 'error' ? 8000 : 5000))
    },
    [dismiss],
  )

  const value = useMemo(() => push, [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {items.map((t) => {
          const Icon = ICONS[t.tone]
          return (
            <div key={t.id} className={`toast toast--${t.tone}`}>
              <Icon size={18} aria-hidden className="toast__icon" />
              <div className="toast__text">
                <p className="toast__title">{t.title}</p>
                {t.body && <p className="toast__body">{t.body}</p>}
              </div>
              <button type="button" className="icon-btn icon-btn--sm" onClick={() => dismiss(t.id)} aria-label="Dismiss notification">
                <X size={16} aria-hidden />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
