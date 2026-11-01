# DOL World · Karaoke Queue

Attendees sign up, fill in a short profile, pick a song and get a queue number. Admins run the queue live from their phone, export contacts, and get an email for every new song.

- **Frontend:** Vite + React + TypeScript (strict), Tailwind v4, motion, sonner, react-router v7, TanStack Query, react-hook-form + zod.
- **Backend:** Supabase only (Postgres + RLS, Auth, Storage, Realtime, one Edge Function). No custom server.
- **Hosting:** Vercel.

## Contents

1. [How it works](#how-it-works)
2. [Run it locally](#run-it-locally)
3. [Hosted Supabase setup](#hosted-supabase-setup)
4. [Make yourself an admin](#make-yourself-an-admin)
5. [Auth emails (sign-up confirmation and password reset)](#auth-emails)
6. [New-song email to the admin (Edge Function)](#new-song-email-to-the-admin)
7. [Deploy to Vercel](#deploy-to-vercel)
8. [Google sign-in: publish the app](#google-sign-in-publish-the-app)
9. [Before the event](#before-the-event)
10. [Troubleshooting](#troubleshooting)
11. [Project structure](#project-structure)

---

## How it works

**Attendee flow:** sign up with Google or email → onboarding (name, phone, marketing consent) → pick a song → ticket with their number → the page updates live and alerts them when they're up next.

**Admin flow:** `/admin` shows the live queue. Create and switch events, go live or end an event, press **Call next**, change any status, search, filter, sort and export CSV. `/admin/contacts` lists everyone, with an "opted in only" filter and CSV export.

**What the database guarantees** (in `supabase/migrations/`):

| Rule | Where |
|---|---|
| Queue numbers are assigned by the database, per event, starting at 1, with no gaps or duplicates even when many people submit at once | `assign_queue_number()` trigger (row lock on the event) |
| Only one active event at a time | unique index + `set_active_event()` |
| One song in the queue per person per event | unique index + trigger message |
| Must have a complete profile and an active event to submit | trigger |
| Attendees only ever see their own rows; queue status is numbers only | RLS + `get_queue_status()` |
| Only admins can change statuses, see contacts, call next or manage events | RLS + `is_admin()` |
| Clients can't set their own queue number, status or consent timestamp | column-level grants + triggers |

Statuses: `waiting` → `up_next` → `singing` (on stage) → `sung`, or `skipped`.

## Run it locally

Requires Node 20+ and Docker.

```bash
npm install
npx supabase start            # first run downloads Docker images, applies migrations + seed
npm run dev                   # http://localhost:5173
```

To run against the local stack, put the values printed by `npx supabase status` in `.env.local`:

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<ANON_KEY from supabase status>
VITE_EVENT_BRAND=DOL World
VITE_CONTACT_EMAIL=you@example.com
```

Scripts:

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Typecheck + production build |
| `npm run typecheck` / `npm run lint` | Strict TypeScript / oxlint |
| `npm run db:reset` | Rebuild the **local** DB from migrations + `supabase/seed.sql` |
| `npm run db:types` | Regenerate `src/lib/database.types.ts` from the local DB |
| `npm run db:types:remote` | Same, from the linked hosted project |

> ⚠️ This folder is linked to the hosted project. Only ever reset with `npx supabase db reset --local`.

## Hosted Supabase setup

Already done for project `xridrrclixxkuokiqnlf`. To set up a fresh project:

1. [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**. Pick a region near your attendees and save the database password.
2. Link and push the schema:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
3. **Project Settings → API Keys**: copy the **Project URL** and the **publishable** (or `anon`) key into `.env.local` / Vercel.
   **Never** put the `secret` / `service_role` key in the frontend, a `VITE_` variable, Vercel or a chat.
4. **Authentication → URL Configuration**:
   - **Site URL:** your Vercel URL (e.g. `https://dol-world.vercel.app`)
   - **Redirect URLs:** add `https://dol-world.vercel.app/**` and `http://localhost:5173/**`
5. **Authentication → Sign In / Providers → Google**: enable it and paste the Client ID and Client secret from Google Cloud (see [Google sign-in](#google-sign-in-publish-the-app)).
6. Create the first event. Easiest is from the admin dashboard once you're an admin, or in the **SQL Editor**:
   ```sql
   insert into public.events (name, venue, event_date, is_active)
   values ('DOL World Karaoke Night', 'Lagos', '2026-11-06', true);
   ```

## Make yourself an admin

1. Sign up in the app with the email you'll use to run the event and finish onboarding.
2. Supabase dashboard → **SQL Editor** → **New query**, then run:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'you@example.com';
   ```
3. Check it worked (an insert always says "No rows returned"):
   ```sql
   select u.email, a.user_id is not null as is_admin
   from auth.users u left join public.admins a on a.user_id = u.id
   where u.email = 'you@example.com';
   ```
4. Refresh the app. An **Admin** button appears in the header.

To remove an admin: `delete from public.admins where user_id = (select id from auth.users where email = '...');`

## Auth emails

Supabase's built-in email sender is only meant for testing. It **only delivers to members of your Supabase team** and is limited to a few emails an hour. Real attendees signing up with email + password would never receive their confirmation link. Pick one option:

### Option A (recommended): send auth emails through Resend

This needs a domain you control, e.g. `dolworld.com`.

1. [resend.com](https://resend.com) → sign up → **Domains → Add domain**. Add the DNS records it shows at your domain registrar and wait until it says **Verified**.
2. **API Keys → Create API key** (permission: *Sending access*). Copy it; it's shown once.
3. Supabase → **Authentication → Emails → SMTP Settings** → turn on **Enable custom SMTP**:
   | Field | Value |
   |---|---|
   | Sender email | `karaoke@yourdomain.com` |
   | Sender name | `DOL World` |
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` |
   | Password | your Resend API key |
4. Save. Then **Authentication → Rate Limits** → raise **emails per hour** (e.g. 100) for event night.

### Option B: no domain

- **Authentication → Sign In / Providers → Email** → turn **off** "Confirm email". Email sign-ups then work straight away.
- Password-reset emails still won't reach attendees, so tell people to use **Continue with Google**.

## New-song email to the admin

`supabase/functions/notify-admin` sends one email per song submitted. A **Database Webhook** calls it on every insert into `song_requests`. The webhook sends a secret header, and the function rejects any request without it. It's deployed with `--no-verify-jwt` because a webhook has no user login.

### 1. Resend API key

- Sign up at [resend.com](https://resend.com) **using the admin email address**.
- Without a verified domain, Resend's shared sender (`onboarding@resend.dev`) can only deliver to the account owner's own email, and that's exactly the admin.
- **API Keys → Create API key** → *Sending access*. You can reuse the key from Option A above.

### 2. Make a webhook secret

```bash
openssl rand -hex 32
```

Copy the output. It's used in steps 3 and 5.

### 3. Set the function's secrets

```bash
npx supabase secrets set \
  RESEND_API_KEY=re_xxx \
  ADMIN_EMAIL=you@example.com \
  WEBHOOK_SECRET=<the value from step 2> \
  APP_URL=https://dol-world.vercel.app \
  BRAND="DOL World"
```

- `ADMIN_EMAIL` can be several addresses separated by commas. They must all be verified in Resend, or you need a verified domain.
- With a verified domain, also set `EMAIL_FROM="DOL World <karaoke@yourdomain.com>"`.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided to the function automatically. Don't set them.

### 4. Deploy the function

```bash
npx supabase functions deploy notify-admin --no-verify-jwt
```

### 5. Create the Database Webhook

Supabase dashboard → **Integrations → Database Webhooks**. On older dashboards it's **Database → Webhooks**. If asked, click **Enable webhooks**. Then **Create a new hook**:

| Field | Value |
|---|---|
| Name | `notify-admin` |
| Table | `song_requests` |
| Events | ✅ **Insert** only |
| Type of webhook | **Supabase Edge Functions** |
| Method | `POST` |
| Edge Function | `notify-admin` |
| Timeout | `5000` ms |
| HTTP Headers → Add a new header | `x-webhook-secret` = the value from step 2 |

Click **Create webhook**.

### 6. Test it

- Submit a song in the app. An email arrives within a few seconds.
- If not, check **Edge Functions → notify-admin → Logs**:
  - **401:** the header is missing, or it doesn't match `WEBHOOK_SECRET`.
  - **"API key is invalid":** the `RESEND_API_KEY` is wrong.
  - **Resend 403:** you're sending to an address Resend won't deliver to without a verified domain.
- To see past webhook calls: `select * from net._http_response order by created desc limit 5;`

Local testing (optional):

```bash
cp supabase/functions/.env.example supabase/functions/.env   # fill it in
npx supabase functions serve notify-admin --env-file supabase/functions/.env --no-verify-jwt
```

## Deploy to Vercel

1. Put the code on GitHub:
   - Create an empty repo on github.com (no README).
   - Then run:
     ```bash
     git remote add origin https://github.com/<you>/dol-world.git
     git push -u origin main
     ```
2. [vercel.com](https://vercel.com) → **Add New… → Project** → import the repo.
   - Vercel detects **Vite**; leave the build settings as they are.
   - `vercel.json` already makes deep links like `/admin` work.
3. **Environment Variables** (before clicking Deploy):
   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | `https://xridrrclixxkuokiqnlf.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | your **publishable** key |
   | `VITE_EVENT_BRAND` | `DOL World` |
   | `VITE_CONTACT_EMAIL` | the email for privacy / deletion requests |
4. **Deploy**, and copy the URL (e.g. `https://dol-world.vercel.app`).
5. Point everything else at that URL:
   - **Supabase → Authentication → URL Configuration:**
     - set **Site URL** to the Vercel URL
     - add `https://<your-url>/**` to **Redirect URLs**
   - **Edge Function:** `npx supabase secrets set APP_URL=https://<your-url>` (for the email button)
   - **Google Cloud Branding:** see the next section.

`VITE_` variables are baked in at build time. After changing one in Vercel, open **Deployments → ⋯ → Redeploy**.

## Google sign-in: publish the app

While the Google app is in **Testing**, only the test users you list can sign in with Google. Before the event:

1. [console.cloud.google.com](https://console.cloud.google.com) → project **DOL World** → **Google Auth Platform → Branding**:
   | Field | Value |
   |---|---|
   | App name | `DOL World` |
   | User support email | your email |
   | App home page | `https://<your-url>` |
   | Privacy policy | `https://<your-url>/privacy` |
   | Terms of service | `https://<your-url>/terms` |
   | Authorized domains | `<your-url>` without `https://` (e.g. `dol-world.vercel.app`) and `xridrrclixxkuokiqnlf.supabase.co` |
   | Developer contact | your email |

   Leave the **logo empty**. Uploading one triggers a Google review that can take days.
2. **Audience → Publish app → Confirm.**
   - The app only asks for name, email and photo, so it goes live without verification.
   - Users may briefly see "Google hasn't verified this app" until Google finishes its check. They can continue past it.
3. Leave **Clients → Authorized redirect URIs** unchanged: `https://xridrrclixxkuokiqnlf.supabase.co/auth/v1/callback`.

## Before the event

- [ ] **Supabase secret key:** if it was ever shared, rotate it (**Project Settings → API Keys → Secret keys** → create a new one, delete the old one).
- [ ] Google app published, and Auth URL configuration points at the Vercel URL.
- [ ] Auth emails: Option A or B above done.
- [ ] New-song email arrives when you submit a test song.
- [ ] Test the whole flow on two phones: sign up → song → admin **Call next** → attendee sees "up next".
- [ ] Clear out test data (SQL Editor). This keeps accounts and deletes test songs and events:
  ```sql
  delete from public.song_requests;
  delete from public.events;
  ```
  To also delete test accounts (their profiles go with them), run this, keeping your admin email:
  ```sql
  delete from auth.users where email not in ('you@example.com');
  ```
- [ ] Create the real event in `/admin` and tick **Go live now**.
- [ ] Share the link, e.g. as a QR code on the screen at the venue.

## Troubleshooting

| Problem | Fix |
|---|---|
| "Missing Supabase environment variables" | `.env.local` (locally) or Vercel env vars are missing. Redeploy after adding them. |
| Google sign-in returns to `localhost` in production | Supabase **Site URL** / **Redirect URLs** still point at localhost. |
| "Access blocked: app is in testing" | Publish the Google app, or add the person under **Audience → Test users**. |
| Sign-up says "check your email" but nothing arrives | See [Auth emails](#auth-emails). |
| Password reset link says expired | Links are single-use and expire after an hour. Request a new one and open it in the same browser. |
| No **Admin** button | The email isn't in `public.admins`. Run the check query in [Make yourself an admin](#make-yourself-an-admin), then refresh. |
| Attendees don't update live | Realtime reconnects on its own, and the page also refreshes every 30 s and when a phone wakes up. |
| "This event is not taking songs right now" | No event is live. Go live in `/admin`. |

## Project structure

```
src/
  app/            router, providers, layouts, header
  components/ui/  Button, Input, Select, Dialog, Card, Confetti, …
  features/
    auth/         login, signup, password reset, route guards
    profile/      onboarding, profile, avatar upload, my songs
    queue/        home page, song form, ticket, live status, realtime
    admin/        queue dashboard, contacts, CSV export, admin guard
    legal/        /privacy and /terms
  lib/            supabase client, generated DB types, phone/CSV helpers
supabase/
  migrations/     schema, RLS, triggers, RPCs, storage, realtime
  functions/      notify-admin Edge Function
```

Accessibility and motion:
- Every animation respects the phone's "reduce motion" setting (`MotionConfig reducedMotion="user"` plus a CSS fallback).
- Tap targets are at least 44px, and layouts work from 320px wide.
- Pink buttons use dark text for contrast.
