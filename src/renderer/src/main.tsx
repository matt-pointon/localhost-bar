import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { SessionsView } from './sessions/SessionsView'

const isSessions = window.location.hash.replace(/^#/, '') === 'sessions'

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isSessions ? <SessionsView /> : <App />}</StrictMode>
)
