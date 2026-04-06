'use client'
import dynamic from 'next/dynamic'
import { CRMProvider } from '@/lib/store'

const CRMApp = dynamic(() => import('@/components/CRMApp'), { ssr: false })

export default function Home() {
  return (
    <CRMProvider>
      <CRMApp />
    </CRMProvider>
  )
}
