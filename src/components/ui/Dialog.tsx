import { X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { cx } from '../../lib/utils'
import { Button, IconButton } from './Button'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

/** Native <dialog> gives us a focus trap, Escape handling and an inert background. */
export function Dialog({ open, onClose, title, description, children, footer, size = 'md' }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={cx('dialog', `dialog--${size}`)}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
    >
      {open && (
        <div className="dialog__panel">
          <header className="dialog__header">
            <div>
              <h2 id={titleId} className="dialog__title">
                {title}
              </h2>
              {description && (
                <div id={descId} className="dialog__desc">
                  {description}
                </div>
              )}
            </div>
            <IconButton icon={X} label="Close dialog" onClick={onClose} />
          </header>
          {children && <div className="dialog__body">{children}</div>}
          {footer && <footer className="dialog__footer">{footer}</footer>}
        </div>
      )}
    </dialog>
  )
}

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  children?: ReactNode
  confirmLabel: string
  tone?: 'danger' | 'primary'
  /** When set, a checkbox with this label must be ticked before confirming. */
  acknowledgement?: string
}

export function ConfirmDialog({ open, onClose, onConfirm, title, children, confirmLabel, tone = 'danger', acknowledgement }: ConfirmDialogProps) {
  const [acked, setAcked] = useState(false)
  useEffect(() => {
    if (open) setAcked(false)
  }, [open])

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} autoFocus>
            Go back
          </Button>
          <Button
            variant={tone}
            disabled={Boolean(acknowledgement) && !acked}
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="stack-3">
        {children}
        {acknowledgement && (
          <label className="check">
            <input type="checkbox" checked={acked} onChange={(e) => setAcked(e.target.checked)} />
            <span>{acknowledgement}</span>
          </label>
        )}
      </div>
    </Dialog>
  )
}
