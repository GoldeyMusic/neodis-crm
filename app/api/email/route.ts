// app/api/email/route.ts — Endpoint d'envoi d'emails NEODIS CRM

import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, EmailPayload } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const body: EmailPayload = await req.json()

    if (!body.type || !body.to || !body.data) {
      return NextResponse.json(
        { error: 'Champs manquants : type, to, data requis' },
        { status: 400 }
      )
    }

    const result = await sendEmail(body)
    return NextResponse.json({ success: true, id: result?.id })

  } catch (err) {
    console.error('[email/route]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur inconnue' },
      { status: 500 }
    )
  }
}
