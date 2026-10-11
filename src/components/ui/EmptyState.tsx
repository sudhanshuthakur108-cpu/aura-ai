import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from '../../lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  children?: ReactNode
  action?: ReactNode
  compact?: boolean
}

export function EmptyState({ icon: Icon, title, children, action, compact }: EmptyStateProps) {
  return (
    <div className={cx('empty', compact && 'empty--compact')}>
      <span className="empty__icon" aria-hidden>
        <Icon size={compact ? 20 : 24} />
      </span>
      <h3 className="empty__title">{title}</h3>
      {children && <p className="empty__body">{children}</p>}
      {action && <div className="empty__action">{action}</div>}
    </div>
  )
}
