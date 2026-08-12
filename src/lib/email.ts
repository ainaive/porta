import { errorFields, logger } from '@/lib/logger'

// Outbound mail via Resend's REST API — no SDK, so it behaves identically on
// Vercel and the self-hosted Docker runtime (both have fetch). RESEND_API_KEY
// is provisioned by the Vercel Marketplace integration; EMAIL_FROM must be an
// address on a Resend-verified domain in production.
//
// Without RESEND_API_KEY (local dev, CI, or before the integration is
// provisioned) it logs the message instead of sending, so the auth flows are
// testable and never crash on a missing key.
const RESEND_ENDPOINT = 'https://api.resend.com/emails'

export type Email = {
  to: string
  subject: string
  html: string
  text: string
}

export async function sendEmail(email: Email): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from =
    process.env.EMAIL_FROM ?? 'Silicon Ecosystem <onboarding@resend.dev>'

  if (!apiKey) {
    logger.warn('email skipped: RESEND_API_KEY unset — logging instead', {
      to: email.to,
      subject: email.subject,
      text: email.text,
    })
    return
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ from, ...email }),
    })
    if (!response.ok) {
      logger.error('email send failed', {
        to: email.to,
        status: response.status,
        body: (await response.text()).slice(0, 500),
      })
    }
  } catch (error) {
    logger.error('email send threw', { to: email.to, ...errorFields(error) })
  }
}
