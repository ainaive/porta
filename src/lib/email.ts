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
    // Log only a non-sensitive status. The body carries reset/invite links
    // (and `to` is a recipient address), so neither goes to the logs.
    logger.warn('email skipped: RESEND_API_KEY unset', {
      subject: email.subject,
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
      // Bound the call so a hung Resend can't stall the auth request.
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) {
      logger.error('email send failed', { status: response.status })
    }
  } catch (error) {
    logger.error('email send threw', errorFields(error))
  }
}
