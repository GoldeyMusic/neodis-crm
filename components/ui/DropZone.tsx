'use client'
import { useState, useRef, useCallback } from 'react'

interface Props {
  onFile?: (file: File) => void
  onFiles?: (files: File[]) => void
  accept?: string
  maxMB?: number
  label?: string
  sublabel?: string
  compact?: boolean
  multiple?: boolean
}

export default function DropZone({ onFile, onFiles, accept, maxMB = 10, label = 'Déposer un fichier ici', sublabel, compact = false, multiple = false }: Props) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback((files: File[]) => {
    const valid = files.filter(f => !maxMB || f.size <= maxMB * 1024 * 1024)
    if (onFiles) { onFiles(valid); return }
    if (onFile && valid[0]) onFile(valid[0])
  }, [onFile, onFiles, maxMB])

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragging(false) }
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length) handleFiles(files)
  }
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length) handleFiles(files)
    e.target.value = ''
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{
        border: `2px dashed ${dragging ? 'var(--ft)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)',
        padding: compact ? '14px 16px' : '24px 16px',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all .15s',
        background: dragging ? 'var(--ft-bg)' : 'transparent',
        userSelect: 'none',
      }}
      onMouseOver={e => { if (!dragging) e.currentTarget.style.borderColor = 'var(--border-strong)' }}
      onMouseOut={e => { if (!dragging) e.currentTarget.style.borderColor = 'var(--border)' }}
    >
      <input ref={inputRef} type="file" accept={accept} multiple={multiple} style={{ display: 'none' }} onChange={onChange} />
      {!compact && (
        <div style={{ fontSize: 24, marginBottom: 8 }}>
          {dragging ? '📂' : '📄'}
        </div>
      )}
      <div style={{ fontSize: 13, fontWeight: 500, color: dragging ? 'var(--ft)' : 'var(--text-secondary)' }}>
        {dragging ? 'Relâcher pour importer' : label}
      </div>
      {sublabel && !dragging && (
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 3 }}>{sublabel}</div>
      )}
      {!compact && !dragging && (
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>
          ou <span style={{ color: 'var(--ft)', textDecoration: 'underline' }}>cliquer pour parcourir</span>
        </div>
      )}
    </div>
  )
}
