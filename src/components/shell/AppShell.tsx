import { Brain, FlaskConical, House, Menu, MessagesSquare, PanelLeftClose, PanelLeftOpen, Settings, ShieldCheck, Target, type LucideIcon } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { brand } from '../../config/brand'
import { hrefFor, type View } from '../../lib/useRoute'
import { useMediaQuery } from '../../lib/useMediaQuery'
import { cx } from '../../lib/utils'
import { useStore } from '../../state/AppStore'
import { Companion, moodLabels } from '../companion/Companion'
import { Dialog } from '../ui/Dialog'
import './shell.css'

interface NavItem {
  view: View
  label: string
  icon: LucideIcon
}

const NAV: NavItem[] = [
  { view: 'home', label: 'Home', icon: House },
  { view: 'chat', label: 'Chat', icon: MessagesSquare },
  { view: 'memory', label: 'Memory', icon: Brain },
  { view: 'missions', label: 'Missions', icon: Target },
  { view: 'approvals', label: 'Approvals', icon: ShieldCheck },
  { view: 'settings', label: 'Settings', icon: Settings },
]

const COLLAPSE_KEY = 'aura.nav.collapsed'

/** Remembers the sidebar preference in this browser (a convenience; defaults to the quiet rail). */
function useCollapsedPreference() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) !== '0'
    } catch {
      return true
    }
  })
  const toggle = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1')
      } catch {
        /* storage blocked — preference just won't persist */
      }
      return !c
    })
  return [collapsed, toggle] as const
}

function BrandMark() {
  return (
    <span className="brandmark" aria-hidden>
      <svg viewBox="0 0 24 24" width="22" height="22">
        <circle cx="12" cy="12.5" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3 14.5 Q 12 8 21 10.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
        <circle cx="12" cy="12.5" r="2.4" fill="currentColor" />
      </svg>
    </span>
  )
}

export function DemoModeButton({ compact }: { compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const { responderLabel } = useStore()
  return (
    <>
      <button type="button" className={cx('demo-chip', compact && 'demo-chip--compact')} onClick={() => setOpen(true)} aria-haspopup="dialog" title="About this demo">
        <FlaskConical size={14} aria-hidden />
        <span className="demo-chip__label">{compact ? 'Demo' : 'Demo mode'}</span>
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="You’re using a demo" size="sm">
        <ul className="demo-facts">
          <li>
            <strong>No account, no server.</strong> Everything lives in this browser tab and resets when you reload.
          </li>
          <li>
            <strong>Replies are scripted.</strong> Chat uses a {responderLabel.toLowerCase()}, not a live AI model.
          </li>
          <li>
            <strong>Missions are simulated.</strong> Steps advance on a timer; sources and results are illustrative, not real research.
          </li>
          <li>
            <strong>Nothing leaves this app.</strong> Approving an action records your decision locally — no email, payment or third-party request is made.
          </li>
          <li>
            <strong>No voice.</strong> Nothing uses your microphone or plays audio.
          </li>
        </ul>
      </Dialog>
    </>
  )
}

function useCounts() {
  const { state } = useStore()
  const pending = state.proposals.filter((p) => p.status === 'pending').length
  const active = state.missions.filter((m) => m.status === 'running' || m.status === 'blocked').length
  const count = (v: View) => (v === 'approvals' ? pending : v === 'missions' ? active : 0)
  const countLabel = (v: View, n: number) => (v === 'approvals' ? `${n} awaiting review` : `${n} active`)
  return { count, countLabel, attention: pending + state.missions.filter((m) => m.status === 'blocked').length }
}

function NavList({ view, onNavigate }: { view: View; onNavigate?: () => void }) {
  const { count, countLabel } = useCounts()
  return (
    <ul className="nav-list">
      {NAV.map((item) => {
        const n = count(item.view)
        return (
          <li key={item.view}>
            <a href={hrefFor(item.view)} className="nav-link" aria-current={view === item.view ? 'page' : undefined} data-tooltip={item.label} onClick={onNavigate}>
              <item.icon size={19} aria-hidden />
              <span className="nav-link__label">{item.label}</span>
              {n > 0 && (
                <span className={cx('nav-count', item.view === 'approvals' && 'nav-count--attention')}>
                  <span aria-hidden>{n}</span>
                  <span className="visually-hidden">, {countLabel(item.view, n)}</span>
                </span>
              )}
            </a>
          </li>
        )
      })}
    </ul>
  )
}

function Presence() {
  const { state, mood } = useStore()
  const { companionName, companionStyle } = state.settings
  return (
    <a href={hrefFor('chat')} className="presence" aria-label={`${companionName} is ${moodLabels[mood].toLowerCase()}. Open chat.`} data-tooltip={`${companionName} · ${moodLabels[mood]}`}>
      <Companion mood={mood} appearance={companionStyle} name={companionName} size="sm" />
      <span className="presence__text">
        <span className="presence__name">{companionName}</span>
        <span className="presence__mood">
          <span className={cx('presence__dot', `presence__dot--${mood}`)} aria-hidden />
          {moodLabels[mood]}
        </span>
      </span>
    </a>
  )
}

export function AppShell({ view, children }: { view: View; children: ReactNode }) {
  const [collapsed, toggleCollapsed] = useCollapsedPreference()
  const isTablet = useMediaQuery('(min-width: 720px) and (max-width: 1099px)')
  const [menuOpen, setMenuOpen] = useState(false)
  const { attention } = useCounts()
  const rail = collapsed || isTablet

  useEffect(() => setMenuOpen(false), [view])

  return (
    <div className="shell" data-rail={rail || undefined}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <aside className="sidebar" id="primary-nav" aria-label="Primary">
        <div className="sidebar__top">
          <a href={hrefFor('home')} className="sidebar__brand" aria-label={`${brand.productName} home`} data-tooltip={brand.productName}>
            <BrandMark />
            <span className="sidebar__name">{brand.productName}</span>
          </a>
          {!isTablet && (
            <button
              type="button"
              className="icon-btn icon-btn--sm sidebar__toggle"
              onClick={toggleCollapsed}
              aria-expanded={!collapsed}
              aria-controls="primary-nav"
              aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
              data-tooltip={collapsed ? 'Expand' : undefined}
            >
              {collapsed ? <PanelLeftOpen size={17} aria-hidden /> : <PanelLeftClose size={17} aria-hidden />}
            </button>
          )}
        </div>

        <nav className="sidebar__nav" aria-label="Sections">
          <NavList view={view} />
        </nav>

        <div className="sidebar__footer">
          <Presence />
          <DemoModeButton compact={rail} />
        </div>
      </aside>

      <header className="topbar">
        <button
          type="button"
          className="icon-btn topbar__menu"
          onClick={() => setMenuOpen(true)}
          aria-haspopup="dialog"
          aria-label={attention ? `Open menu, ${attention} item${attention === 1 ? '' : 's'} need${attention === 1 ? 's' : ''} you` : 'Open menu'}
        >
          <Menu size={20} aria-hidden />
          {attention > 0 && <span className="topbar__dot" aria-hidden />}
        </button>
        <a href={hrefFor('home')} className="topbar__brand" aria-label={`${brand.productName} home`}>
          <BrandMark />
          <span className="sidebar__name">{brand.productName}</span>
        </a>
        <DemoModeButton compact />
      </header>

      <main id="main" className="main" tabIndex={-1}>
        {children}
      </main>

      <Dialog open={menuOpen} onClose={() => setMenuOpen(false)} title="Go to" size="sm">
        <nav className="menu-sheet" aria-label="Sections">
          <NavList view={view} onNavigate={() => setMenuOpen(false)} />
          <div className="menu-sheet__presence">
            <Presence />
          </div>
        </nav>
      </Dialog>
    </div>
  )
}
