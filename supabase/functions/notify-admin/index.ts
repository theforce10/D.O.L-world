// Emails the admin(s) whenever an attendee submits a song.
//
// Called by a Supabase Database Webhook on INSERT into public.song_requests.
// The webhook sends an `x-webhook-secret` header; anything without the right
// value is rejected, so the public URL can't be used to spam the admin inbox.
// Deployed with --no-verify-jwt because the webhook doesn't send a user JWT.
//
// Secrets (supabase secrets set …): RESEND_API_KEY, ADMIN_EMAIL, WEBHOOK_SECRET,
// optional EMAIL_FROM, APP_URL, BRAND. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
// are provided automatically.

import { createClient } from 'npm:@supabase/supabase-js@2.118.0'

interface SongRequestRecord {
  id: string
  event_id: string
  user_id: string
  queue_number: number
  song_title: string
  artist: string
  note: string | null
  created_at: string
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  schema: string
  record: SongRequestRecord | null
}

const env = (name: string) => Deno.env.get(name)?.trim() ?? ''

const RESEND_API_KEY = env('RESEND_API_KEY')
const WEBHOOK_SECRET = env('WEBHOOK_SECRET')
const ADMIN_EMAILS = env('ADMIN_EMAIL')
  .split(',')
  .map((e) => e.trim())
  .filter(Boolean)
const BRAND = env('BRAND') || 'DOL World'
// onboarding@resend.dev works without a domain, but only delivers to the Resend account's own email.
const EMAIL_FROM = env('EMAIL_FROM') || `${BRAND} <onboarding@resend.dev>`
const APP_URL = env('APP_URL').replace(/\/+$/, '')

const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
})

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

/** Compares secrets in constant time (hashing first makes the lengths equal). */
async function secretMatches(given: string | null): Promise<boolean> {
  if (!given || !WEBHOOK_SECRET) return false
  const enc = new TextEncoder()
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(given)),
    crypto.subtle.digest('SHA-256', enc.encode(WEBHOOK_SECRET)),
  ])
  const x = new Uint8Array(a)
  const y = new Uint8Array(b)
  let diff = 0
  for (let i = 0; i < x.length; i++) diff |= x[i]! ^ y[i]!
  return diff === 0
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })
  if (!(await secretMatches(req.headers.get('x-webhook-secret')))) return json(401, { error: 'Unauthorized' })
  if (!RESEND_API_KEY || ADMIN_EMAILS.length === 0) return json(500, { error: 'RESEND_API_KEY or ADMIN_EMAIL is not set' })

  let payload: WebhookPayload
  try {
    payload = await req.json()
  } catch {
    return json(400, { error: 'Invalid JSON' })
  }
  const song = payload.record
  if (payload.type !== 'INSERT' || payload.table !== 'song_requests' || !song) return json(200, { skipped: true })

  const [{ data: profile, error: profileError }, { data: event, error: eventError }] = await Promise.all([
    admin.from('profiles').select('full_name, email, phone').eq('id', song.user_id).maybeSingle(),
    admin.from('events').select('name, venue').eq('id', song.event_id).maybeSingle(),
  ])
  if (profileError || eventError) {
    console.error('lookup failed', profileError ?? eventError)
    return json(500, { error: 'Lookup failed' })
  }

  const name = profile?.full_name ?? 'Someone'
  const eventName = event?.name ?? 'the event'
  const time = new Date(song.created_at).toLocaleString('en-GB', { timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'short' })

  const rows: Array<[string, string | null | undefined]> = [
    ['Number', `#${song.queue_number}`],
    ['Name', name],
    ['Song', song.song_title],
    ['Artist', song.artist],
    ['Note', song.note],
    ['Phone', profile?.phone],
    ['Email', profile?.email],
    ['Event', event?.venue ? `${eventName} · ${event.venue}` : eventName],
    ['Submitted', `${time} (Lagos time)`],
  ]
  const filled = rows.filter((r): r is [string, string] => Boolean(r[1]))

  const subject = `🎤 #${song.queue_number} ${name}: ${song.song_title}`
  const text = [...filled.map(([k, v]) => `${k}: ${v}`), APP_URL ? `\nOpen the queue: ${APP_URL}/admin` : ''].join('\n')
  const html = `<!doctype html>
<html><body style="margin:0;background:#0e0620;font-family:Inter,Arial,sans-serif;color:#f5f0ff">
  <div style="max-width:520px;margin:0 auto;padding:24px">
    <p style="margin:0;color:#8ef2ff;font-size:12px;letter-spacing:3px;text-transform:uppercase;font-weight:700">${escapeHtml(BRAND)}</p>
    <h1 style="margin:8px 0 4px;font-size:40px;color:#ff7ab8">#${song.queue_number}</h1>
    <p style="margin:0 0 20px;font-size:18px"><strong>${escapeHtml(name)}</strong> picked <strong>${escapeHtml(song.song_title)}</strong> by ${escapeHtml(song.artist)}</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#170b30;border-radius:16px">
      ${filled
        .map(
          ([k, v]) =>
            `<tr><td style="padding:10px 16px;color:#b9add8;font-size:14px;width:110px;border-bottom:1px solid #24124a">${k}</td><td style="padding:10px 16px;font-size:14px;border-bottom:1px solid #24124a">${escapeHtml(v)}</td></tr>`,
        )
        .join('')}
    </table>
    ${
      APP_URL
        ? `<p style="margin:24px 0 0"><a href="${escapeHtml(APP_URL)}/admin" style="display:inline-block;background:#ff2e93;color:#07030f;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:12px">Open the live queue</a></p>`
        : ''
    }
  </div>
</body></html>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      // If the webhook retries, Resend won't send the same email twice.
      'Idempotency-Key': `song-request-${song.id}`,
    },
    body: JSON.stringify({ from: EMAIL_FROM, to: ADMIN_EMAILS, subject, text, html, reply_to: profile?.email ?? undefined }),
  })

  if (!res.ok) {
    const detail = await res.text()
    console.error('Resend error', res.status, detail)
    return json(502, { error: 'Email failed', status: res.status })
  }
  return json(200, { sent: true })
})
