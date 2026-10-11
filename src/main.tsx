// Global styles load first so feature stylesheets can override them.
import '@fontsource-variable/manrope'
import '@fontsource-variable/fraunces'
import './styles/tokens.css'
import './styles/base.css'
import './components/ui/ui.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { ToastProvider } from './components/ui/Toast'
import { AppStoreProvider } from './state/AppStore'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <AppStoreProvider>
        <App />
      </AppStoreProvider>
    </ToastProvider>
  </StrictMode>,
)
