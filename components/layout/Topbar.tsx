'use client'
import { useState } from 'react'
import { useCRM } from '@/lib/store'
import ProfileModal from '../modals/ProfileModal'

export default function Topbar({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const { user } = useCRM()
  const [profileOpen, setProfileOpen] = useState(false)

  const initials = user ? (user.name[0] + user.nom[0]).toUpperCase() : 'AD'

  return (
    <>
      <header className="topbar">
        <button className="hamburger-btn" onClick={onMenuToggle} aria-label="Menu">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M3 5h14M3 10h14M3 15h14"/></svg>
        </button>
        <a className="topbar-logo" href="#">UMA<span>NI</span></a>
        <span className="topbar-sep" style={{ color: 'var(--border-strong)', fontSize: 16 }}>|</span>
        <span className="topbar-byline" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>by NEODIS</span>
        <div className="topbar-spacer" />
        <div className="topbar-search-wrap">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: .4, flexShrink: 0 }}><circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/></svg>
          <input placeholder="Recherche… (⌘K)" />
        </div>
        <div className="topbar-user" onClick={() => setProfileOpen(true)}>
          <div className="avatar">
            {user?.photo
              ? <img src={user.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials
            }
          </div>
          <span>{user?.name}</span>
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: .4 }}><path d="M4 6l4 4 4-4"/></svg>
        </div>
      </header>
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  )
}
