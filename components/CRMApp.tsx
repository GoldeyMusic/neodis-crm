'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useCRM } from '@/lib/store'
import Login from './Login'
import Topbar from './layout/Topbar'
import Sidebar from './layout/Sidebar'
import Toast from './ui/Toast'
import InactivityBanner from './ui/InactivityBanner'

// Views
import Dashboard from './views/Dashboard'
import Sessions from './views/Sessions'
import Participants from './views/Participants'
import Formateurs from './views/Formateurs'
import Equipe from './views/Equipe'
import Documents from './views/Documents'
import Admin from './views/Admin'
import Impact from './views/Impact'
import Calendrier from './views/Calendrier'

const INACTIVITY_LIMIT = 60 * 60 * 1000 // 1h
const WARNING_BEFORE = 2 * 60 * 1000 // 2min

export default function CRMApp() {
  const { user, logout, activeView, setActiveView } = useCRM()
  const [showWarning, setShowWarning] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const inactivityTimer = useRef<NodeJS.Timeout>()
  const warningTimer = useRef<NodeJS.Timeout>()

  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  const resetTimer = () => {
    clearTimeout(inactivityTimer.current)
    clearTimeout(warningTimer.current)
    setShowWarning(false)
    warningTimer.current = setTimeout(() => setShowWarning(true), INACTIVITY_LIMIT - WARNING_BEFORE)
    inactivityTimer.current = setTimeout(() => {
      setShowWarning(false)
      logout()
    }, INACTIVITY_LIMIT)
  }

  useEffect(() => {
    if (!user) return
    resetTimer()
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click']
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer))
      clearTimeout(inactivityTimer.current)
      clearTimeout(warningTimer.current)
    }
  }, [user])

  if (!user) return <Login />

  // Rendu déclaratif : les vues non actives sont cachées via CSS (display:none)
  // mais toujours montées — leur état local (filtres, onglets…) est ainsi préservé
  // et React ne re-monte jamais un composant à cause d'un re-render parent.
  const v = activeView || 'dashboard'

  return (
    <div className="app-shell">
      <Topbar onMenuToggle={() => setSidebarOpen(o => !o)} />
      <div className="body-area">
        {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}
        <Sidebar open={sidebarOpen} onNavClick={closeSidebar} />
        <main className="main-content">
          <div style={{ display: v === 'dashboard'    ? undefined : 'none' }}><Dashboard /></div>
          <div style={{ display: v === 'sessions'     ? undefined : 'none' }}><Sessions /></div>
          <div style={{ display: v === 'calendrier'   ? undefined : 'none' }}><Calendrier /></div>
          <div style={{ display: v === 'participants' ? undefined : 'none' }}><Participants /></div>
          <div style={{ display: v === 'formateurs'   ? undefined : 'none' }}><Formateurs /></div>
          <div style={{ display: v === 'equipe'       ? undefined : 'none' }}><Equipe /></div>
          <div style={{ display: v === 'documents'    ? undefined : 'none' }}><Documents /></div>
          <div style={{ display: v === 'impact'       ? undefined : 'none' }}><Impact /></div>
          <div style={{ display: v === 'admin'        ? undefined : 'none' }}><Admin /></div>
        </main>
      </div>
      <Toast />
      {showWarning && <InactivityBanner onExtend={resetTimer} />}
    </div>
  )
}
