import { LoaderCircle, type LucideIcon } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '../../lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'quiet'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md' | 'lg'
  icon?: LucideIcon
  iconAfter?: LucideIcon
  loading?: boolean
  children?: ReactNode
}

export function Button({ variant = 'secondary', size = 'md', icon: Icon, iconAfter: IconAfter, loading, className, children, disabled, type = 'button', ...rest }: ButtonProps) {
  const iconSize = size === 'sm' ? 15 : 17
  return (
    <button
      type={type}
      className={cx('btn', `btn--${variant}`, `btn--${size}`, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <LoaderCircle size={iconSize} className="spin" aria-hidden /> : Icon && <Icon size={iconSize} aria-hidden />}
      {children && <span>{children}</span>}
      {IconAfter && !loading && <IconAfter size={iconSize} aria-hidden />}
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon
  label: string
  size?: 'sm' | 'md'
  variant?: 'ghost' | 'solid'
}

export function IconButton({ icon: Icon, label, size = 'md', variant = 'ghost', className, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button type={type} className={cx('icon-btn', `icon-btn--${size}`, variant === 'solid' && 'icon-btn--solid', className)} aria-label={label} title={label} {...rest}>
      <Icon size={size === 'sm' ? 16 : 18} aria-hidden />
    </button>
  )
}
