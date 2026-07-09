/**
 * Vercel serverless function — the one place RESEND_API_KEY is allowed to
 * exist. Runs server-side only (Node runtime), so the key never reaches the
 * browser bundle. The frontend (emailPreviewService.ts) POSTs { to, subject,
 * html } here instead of calling Resend directly.
 *
 * Locally, `npm run dev` (plain Vite, no Vercel runtime) doesn't serve files
 * under /api on its own — vite.config.ts adds a dev-only middleware that
 * imports and calls handleSendEmail() directly, so the same code path runs
 * in both places.
 *
 * Configure RESEND_API_KEY in:
 *   - .env.local (gitignored) for `npm run dev`
 *   - Vercel project → Settings → Environment Variables for the deployed app
 */

export interface SendEmailPayload {
  to: string
  subject: string
  html: string
}

export interface SendEmailResult {
  ok: boolean
  status: number
  body: unknown
}

export async function handleSendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return { ok: false, status: 500, body: { error: 'RESEND_API_KEY is not configured on the server' } }
  }
  if (!payload?.to || !payload?.subject || !payload?.html) {
    return { ok: false, status: 400, body: { error: 'Missing to/subject/html' } }
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Credit & Payment Term <onboarding@resend.dev>',
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
    }),
  })
  const body = await res.json()
  return { ok: res.ok, status: res.status, body }
}

// Vercel's Node runtime entry point — loose request/response typing to avoid
// pulling in @vercel/node just for this one function.
export default async function handler(req: { method?: string; body?: unknown }, res: { status: (code: number) => { json: (body: unknown) => void } }) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  const result = await handleSendEmail(req.body as SendEmailPayload)
  res.status(result.status).json(result.body)
}
