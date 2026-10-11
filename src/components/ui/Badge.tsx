import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from '../../lib/utils'

export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'muted'

interface BadgeProps {
  tone?: Tone
  icon?: LucideIcon
  spinIcon?: boolean
  children: ReactNode
  className?: string
}

export function Badge({ tone = 'neutral', icon: Icon, spinIcon, children, className }: BadgeProps) {
  return (
    <span className={cx('badge', `badge--${tone}`, className)}>
      {Icon && <Icon size={13} aria-hidden className={spinIcon ? 'spin' : undefined} />}
      {children}
    </span>
  )
}
