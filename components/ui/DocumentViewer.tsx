'use client'
import { useEffect } from 'react'

interface Props {
  name: string
  data: string
  onClose: () => void
}

export default function DocumentViewer({ name, data, onClose }: Props) {
  const isPDF = name.toLowerCase().endsWith('.pdf')

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const download = () => {
    const a = document.createElement('a')
    a.href = data
    a.download = name
    a.click()
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,.55)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        animation: 'fadeIn .15s ease-out',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      {/* Popup */}
      <div style={{
        background: 'var(--surface)',
        borderRadius: 12,
        boxShadow: '0 20px 60px rgba(0,0,0,.3)',
        width: '85vw',
        maxWidth: 960,
        height: '88vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 18px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>{isPDF ? '📄' : '📝'}</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', maxWidth: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-sm" onClick={download}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M8 3v8M5 8l3 3 3-3M3 13h10"/>
              </svg>
              Télécharger
            </button>
            <button className="btn btn-sm" onClick={onClose} style={{ padding: '5px 10px' }}>✕</button>
          </div>
        </div>

        {/* Corps */}
        <div style={{ flex: 1, overflow: 'hidden', background: '#525659' }}>
          {isPDF ? (
            <iframe
              src={data}
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              title={name}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, color: 'white' }}>
              <div style={{ fontSize: 48 }}>📝</div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>{name}</div>
              <div style={{ fontSize: 13, opacity: .7 }}>Ce format ne peut pas être prévisualisé.</div>
              <button className="btn btn-primary" onClick={download}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 3v8M5 8l3 3 3-3M3 13h10"/></svg>
                Télécharger
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
