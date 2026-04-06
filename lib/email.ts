// lib/email.ts — Service email Resend pour NEODIS CRM

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = 'Multicolorz Formation <contact@multicolorz.com>'
const REPLY_TO = 'contact@multicolorz.com'

// ── TYPES ──────────────────────────────────────────────────────────────────

export type EmailType =
  | 'demande_infos'
  | 'confirmation_inscription'
  | 'rappel_session'
  | 'attestation'
  | 'notification_admin'

export interface EmailPayload {
  type: EmailType
  to: string | string[]
  data: Record<string, string>
}

// ── TEMPLATES ──────────────────────────────────────────────────────────────

function templateDemandeInfos(data: Record<string, string>): { subject: string; html: string } {
  return {
    subject: `Merci pour votre intérêt — Formation UMANI`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;color:#1a1a1a">
        <img src="https://multicolorz.com/logo.png" alt="Multicolorz" style="height:48px;margin-bottom:24px" />
        <h2 style="color:#7c3aed">Bonjour ${data.prenom} 👋</h2>
        <p>Merci pour votre message ! Nous avons bien reçu votre demande d'informations concernant la formation <strong>${data.nomFormation}</strong>.</p>
        <p>Notre équipe vous recontactera dans les <strong>48h ouvrées</strong> pour vous présenter le programme, les modalités de financement et les prochaines dates disponibles.</p>
        <p>En attendant, vous pouvez consulter notre campus en ligne :</p>
        <a href="https://umani.town" style="display:inline-block;background:#7c3aed;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Découvrir UMANI Town →
        </a>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0" />
        <p style="color:#6b7280;font-size:13px">Multicolorz · Formation artistique professionnelle<br/>contact@multicolorz.com</p>
      </div>
    `,
  }
}

function templateConfirmationInscription(data: Record<string, string>): { subject: string; html: string } {
  return {
    subject: `Confirmation d'inscription — ${data.nomFormation}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;color:#1a1a1a">
        <img src="https://multicolorz.com/logo.png" alt="Multicolorz" style="height:48px;margin-bottom:24px" />
        <h2 style="color:#7c3aed">Votre inscription est confirmée ✅</h2>
        <p>Bonjour <strong>${data.prenom} ${data.nom}</strong>,</p>
        <p>Nous avons le plaisir de confirmer votre inscription à la formation :</p>
        <div style="background:#f5f3ff;border-left:4px solid #7c3aed;padding:16px 20px;border-radius:4px;margin:16px 0">
          <strong>${data.nomFormation}</strong><br/>
          📅 ${data.dates}<br/>
          💰 Financement : ${data.financeur}
        </div>
        <p>Votre lien d'accès au campus UMANI :</p>
        <a href="${data.lienUMANI}" style="display:inline-block;background:#7c3aed;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Accéder à mon espace UMANI →
        </a>
        <p style="color:#6b7280;font-size:14px">Pour toute question, contactez-nous à <a href="mailto:contact@multicolorz.com">contact@multicolorz.com</a></p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0" />
        <p style="color:#6b7280;font-size:13px">Multicolorz · Formation artistique professionnelle</p>
      </div>
    `,
  }
}

function templateRappelSession(data: Record<string, string>): { subject: string; html: string } {
  return {
    subject: `Rappel — Votre formation commence ${data.delai}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;color:#1a1a1a">
        <img src="https://multicolorz.com/logo.png" alt="Multicolorz" style="height:48px;margin-bottom:24px" />
        <h2 style="color:#7c3aed">C'est bientôt ! 🎵</h2>
        <p>Bonjour <strong>${data.prenom}</strong>,</p>
        <p>Votre formation <strong>${data.nomFormation}</strong> commence <strong>${data.delai}</strong>.</p>
        <div style="background:#f5f3ff;border-left:4px solid #7c3aed;padding:16px 20px;border-radius:4px;margin:16px 0">
          📅 Dates : ${data.dates}<br/>
          📍 Format : ${data.format ?? 'Présentiel + Campus en ligne'}
        </div>
        <p>Accédez dès maintenant à votre espace pour préparer votre arrivée :</p>
        <a href="${data.lienUMANI}" style="display:inline-block;background:#7c3aed;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Mon espace UMANI →
        </a>
        <p style="color:#6b7280;font-size:14px">Des questions ? Écrivez-nous à <a href="mailto:contact@multicolorz.com">contact@multicolorz.com</a></p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0" />
        <p style="color:#6b7280;font-size:13px">Multicolorz · Formation artistique professionnelle</p>
      </div>
    `,
  }
}

function templateAttestation(data: Record<string, string>): { subject: string; html: string } {
  return {
    subject: `Votre attestation de formation — ${data.nomFormation}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;color:#1a1a1a">
        <img src="https://multicolorz.com/logo.png" alt="Multicolorz" style="height:48px;margin-bottom:24px" />
        <h2 style="color:#7c3aed">Félicitations ${data.prenom} 🎉</h2>
        <p>Vous avez complété la formation <strong>${data.nomFormation}</strong>.</p>
        <p>Votre attestation de fin de formation est disponible en pièce jointe de cet email.</p>
        <div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:16px 20px;border-radius:4px;margin:16px 0">
          ✅ Formation complétée : ${data.nomFormation}<br/>
          📅 Période : ${data.dates}<br/>
          ⏱️ Durée : ${data.duree}
        </div>
        <p>Votre parcours sur UMANI reste accessible :</p>
        <a href="${data.lienUMANI}" style="display:inline-block;background:#7c3aed;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Mon espace UMANI →
        </a>
        <p style="color:#6b7280;font-size:14px">Merci pour votre confiance. À bientôt !</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0" />
        <p style="color:#6b7280;font-size:13px">Multicolorz · Formation artistique professionnelle</p>
      </div>
    `,
  }
}

function templateNotificationAdmin(data: Record<string, string>): { subject: string; html: string } {
  return {
    subject: `[NEODIS] ${data.sujet}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;color:#1a1a1a">
        <h2 style="color:#dc2626">🔔 Notification interne NEODIS</h2>
        <p><strong>Sujet :</strong> ${data.sujet}</p>
        <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:16px 20px;border-radius:4px;margin:16px 0">
          ${data.message}
        </div>
        ${data.lien ? `<a href="${data.lien}" style="display:inline-block;background:#1a1a1a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">Voir dans le CRM →</a>` : ''}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0" />
        <p style="color:#6b7280;font-size:13px">NEODIS CRM · Usage interne uniquement</p>
      </div>
    `,
  }
}

// ── DISPATCHER ─────────────────────────────────────────────────────────────

function getTemplate(type: EmailType, data: Record<string, string>) {
  switch (type) {
    case 'demande_infos':           return templateDemandeInfos(data)
    case 'confirmation_inscription': return templateConfirmationInscription(data)
    case 'rappel_session':          return templateRappelSession(data)
    case 'attestation':             return templateAttestation(data)
    case 'notification_admin':      return templateNotificationAdmin(data)
  }
}

// ── SEND ───────────────────────────────────────────────────────────────────

export async function sendEmail(payload: EmailPayload) {
  const { subject, html } = getTemplate(payload.type, payload.data)

  const result = await resend.emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to: Array.isArray(payload.to) ? payload.to : [payload.to],
    subject,
    html,
  })

  if (result.error) {
    throw new Error(`Resend error: ${result.error.message}`)
  }

  return result.data
}
