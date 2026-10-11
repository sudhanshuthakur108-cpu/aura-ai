import { useEffect, useRef } from 'react'
import { AppShell } from './components/shell/AppShell'
import { ApprovalsView } from './features/approvals/ApprovalsView'
import { ChatView } from './features/chat/ChatView'
import { HomeView } from './features/home/HomeView'
import { MemoryView } from './features/memory/MemoryView'
import { MissionsView } from './features/missions/MissionsView'
import { SettingsView } from './features/settings/SettingsView'
import { brand } from './config/brand'
import { useRoute } from './lib/useRoute'
import { useStore } from './state/AppStore'

const TITLES = { home: 'Home', chat: 'Chat', memory: 'Memory', missions: 'Missions', approvals: 'Approvals', settings: 'Settings' }

export function App() {
  const { route, navigate } = useRoute()
  const { state } = useStore()
  const { theme, motion } = state.settings

  // Theme and motion preferences live on <html> so tokens can react to them.
  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    root.dataset.motion = motion
  }, [theme, motion])

  useEffect(() => {
    document.title = `${TITLES[route.view]} · ${brand.productName}`
  }, [route.view])

  // Move focus to the main region when the user navigates (not on first load,
  // so the skip link and navigation stay first in the tab order).
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    if (route.view !== 'chat') window.scrollTo({ top: 0 })
    document.getElementById('main')?.focus({ preventScroll: true })
  }, [route.view])

  return (
    <AppShell view={route.view}>
      {route.view === 'home' && <HomeView />}
      {route.view === 'chat' && <ChatView threadId={route.param} navigate={navigate} />}
      {route.view === 'memory' && <MemoryView memoryId={route.param} navigate={navigate} />}
      {route.view === 'missions' && <MissionsView missionId={route.param} navigate={navigate} />}
      {route.view === 'approvals' && <ApprovalsView key={route.param ?? 'all'} proposalId={route.param} />}
      {route.view === 'settings' && <SettingsView />}
    </AppShell>
  )
}
