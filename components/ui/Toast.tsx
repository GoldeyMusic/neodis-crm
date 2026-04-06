'use client'
import { useCRM } from '@/lib/store'

export default function Toast() {
  const { toast } = useCRM()
  return (
    <div className={`toast${toast ? ' visible' : ''}`}>{toast}</div>
  )
}
