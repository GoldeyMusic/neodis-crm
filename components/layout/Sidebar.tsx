'use client'
import { useCRM } from '@/lib/store'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/></svg> },
  { id: 'sessions', label: 'Sessions', icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="3" width="14" height="11" rx="2"/><path d="M5 1v4M11 1v4M1 7h14"/></svg> },
  { id: 'participants', label: 'Participants', icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6" cy="5" r="3"/><path d="M1 14s0-4 5-4 5 4 5 4"/><circle cx="12" cy="5" r="2"/><path d="M14 13s0-2.5-2-3"/></svg> },
  { id: 'formateurs', label: 'Formateurs', icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="4" r="3"/><path d="M2 14s0-4 6-4 6 4 6 4"/><path d="M11 8l1.5 1.5L15 7"/></svg> },
  { id: 'documents', label: 'Documents', icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 1H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6L9 1z"/><path d="M9 1v5h5M5 9h6M5 12h4"/></svg> },
  { id: 'impact', label: 'Impact', icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 13l4-5 3 3 3-4 4-4"/><circle cx="14" cy="3" r="1.5" fill="currentColor" stroke="none"/></svg> },
  { id: 'admin', label: 'Administration', icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="2"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M11.5 4.5l1.4-1.4M3.1 12.9l1.4-1.4"/></svg> },
]

export default function Sidebar() {
  const { activeView, setActiveView, sessions } = useCRM()

  return (
    <nav className="sidebar">
      {navItems.map(item => (
        <div
          key={item.id}
          className={`nav-item${activeView === item.id ? ' active' : ''}`}
          onClick={() => setActiveView(item.id)}
        >
          {item.icon}
          {item.label}
        </div>
      ))}
    </nav>
  )
}
