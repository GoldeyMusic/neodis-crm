import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Espace Formateur — UMANI by NEODIS',
  description: 'Portail personnel formateur / intervenant Masterclass',
}

export default function FormateurLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
