# DOL World

Two kinds of events, one app:

- **Karaoke** (yellow): attendees sign up, fill in a short profile, pick a song and get a queue number. Admins run the queue live from their phone and get an email for every new song.
- **Mix & Mingle** (red): table discussions. Guests see the live topic without an account, check in with one tap, vote in live polls, ask the host questions anonymously, catch up on what they missed, and after the event connect with people they met (mutual opt-in, Snapchat).

Admins create either type, export contacts, and see attendance across both.

- **Frontend:** Vite + React + TypeScript (strict), Tailwind v4, motion, sonner, react-router v7, TanStack Query, react-hook-form + zod.
- **Backend:** Supabase only (Postgres + RLS, Auth, Storage, Realtime, one Edge Function). No custom server.
- **Hosting:** Vercel.

## Contents

1. [How it works](#how-it-works)
2. [Mix & Mingle](#mix--mingle)
3. [Run it locally](#run-it-locally)
4. [Database tests](#database-tests)
5. [Hosted Supabase setup](#hosted-supabase-setup)
6. [Make yourself an admin](#make-yourself-an-admin)
7. [Auth emails (sign-up confirmation and password reset)](#auth-emails)
8. [New-song email to the admin (Edge Function)](#new-song-email-to-the-admin)
9. [Deploy to Vercel](#deploy-to-vercel)
10. [Google sign-in: publish the app](#google-sign-in-publish-the-app)
11. [Before the event](#before-the-event)
12. [Troubleshooting](#troubleshooting)
13. [Project structure](#project-structure)

---

## How it works

**Attendee flow:** sign up with Google or email → onboarding (name, phone, marketing consent) → pick a song → ticket with their number → the page updates live and alerts them when they're up next.

**Admin flow (karaoke):** `/admin` shows the live queue. Create and switch events, go live or end an event, press **Call next**, change any status, search, filter, sort and export CSV. `/admin/contacts` lists everyone with karaoke and Mix & Mingle attendance and last check-in, with event-type and "opted in only" filters and CSV export. `/admin/reports` lists Connect reports.

The home page (`/`) switches on the live event's type. Colours follow the same rule everywhere: **karaoke screens are yellow, Mix & Mingle screens are red, and they are never mixed**. With nothing live, the app is neutral ivory.

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

## Mix & Mingle

**Guest flow.** Anyone can open `/` during a live Mix & Mingle event and see the current topic, live poll results and the catch-up, without an account. Tapping **Join tonight**, **Save my vote**, **Ask** or **Connect** opens a sign-in sheet (Google first, email second). After sign-in (and a short profile step for new people) the app finishes the action they tapped. Checking in asks for "I'm 18 or older" (required), "Let people I meet tonight find me in Connect" (off by default) and, if they haven't opted in before, "Keep me posted on future DOL World events" (optional).

The sticky bottom bar has **Vote**, **Ask** and **Catch up**:
- **Live topic card:** flips in when the host moves on, with a "New topic" toast, a buzz, and a countdown that uses the server's clock (so wrong phone clocks don't matter). At zero it says "Time's up — wrap it up"; the host decides when to move on.
- **Polls:** tap an option, **Save my vote**, then live result bars. Votes can be changed while the poll is open.
- **Ask anonymously:** up to 5 questions a night, one every 30 seconds. "My questions" shows each one's status. The host never sees who asked.
- **What you missed:** opens on its own for latecomers and anyone back after 15+ minutes away. Finished topics with their poll results and a few approved questions, as a swipeable stack on phones.

**Host flow.** `/admin` → pick the Mix & Mingle event → **Open host console** (`/admin/events/<id>/host`, built for a phone):
- **Topics:** add one, or paste a list (one per line), with a 5/10/15-minute timer or none. Drag or use ↑↓ to reorder. **Next topic**, **End round**, **+2 min**.
- **Topic votes:** **Let guests vote on the next topic** → tick 2–6 queued topics → guests vote on their phones (and on the big screen). Tap **Start the winner**, or pick one if it's a tie. Losing topics stay in the queue. **Next topic** is paused while a vote is open; **Cancel the vote** to skip it.
- **Polls:** 2–6 options or the **Yes / No** preset, optionally linked to the live topic. Open, close, **Show on screen**. One poll is open at a time.
- **Questions:** New / Approved / Answered / Hidden. Questions caught by the word filter are marked "Check the wording", never deleted. The 🚫 button stops that person asking and hides everything they asked, without telling you who it was. (To lift a ban: `update profiles set questions_banned = false where email = '…';` in the SQL Editor.)
- **Big screen:** open `/screen/<id>` on a laptop signed in as admin, plug it into the TV and press **Full screen**. Live topic, poll bars, the question on screen, and a "Scan to vote" QR code.
- **End event** (at the bottom of the console): closes check-in, topics and polls, and opens **Connect** for 72 hours. Going live again later re-opens the event and closes Connect.

**Connect.** For 72 hours after the event ends, signed-in guests see a **Connect is open** card on the home page. `/connect/<id>` lists people who checked in and chose to be findable (first name and photo only). Tapping **I'd like to connect** is private: the other person is never told unless they tap it too. Then both see each other's Snapchat with **Copy** and **Open in Snapchat**, and a match celebration. Guests are asked for their Snapchat the first time they tap Connect (they can also set it on `/profile`). Every card has **Block** (removes both from each other's lists and undoes any match) and **Report** (goes to `/admin/reports`).

**What the database guarantees:**

| Rule | Where |
|---|---|
| Guests can read events, live/finished topics, open/closed polls and results, but never a row containing a `user_id` | RLS; public RPCs `poll_results`, `event_recap` return counts and text only |
| One check-in per person per event; 18+ confirmed; complete profile; only while the event is live | `check_ins` constraints + trigger |
| One live topic, one open poll and one open topic vote per event; Next topic is atomic | partial unique indexes + `advance_topic()`, `open_poll()`, `finish_topic_vote()` |
| One vote per checked-in guest per poll, only while it's open; changing a vote replaces it | `cast_vote()` (no direct insert on `poll_votes`) |
| Nobody, admins included, can read the questions table except the asker. The host's list never includes who asked | RLS + `host_questions()` |
| 5 questions per guest per event, 1 per 30 s, banned guests blocked | `questions` insert trigger |
| Connect only for checked-in guests, only for 72 h after the event ends; non-findable and blocked people never listed; handles only for mutual requests | `connect_candidates()`, `request_connect()`, `my_matches()`; requests/blocks tables have no client access |
| Reports are readable by admins only | RLS + `admin_reports()` |

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

## Database tests

Security and business rules are covered by pgTAP tests in `supabase/tests/` (check-ins, topics, polls, anonymous questions, catch-up, Connect, and a privacy checklist that proves guests can't read any row with a `user_id` and that RLS is on for every table). They run against the **local** database inside a transaction that is rolled back, so they never change your data:

```bash
npx supabase start   # if it isn't running
npx supabase test db
```

Every file should say `ok`, ending with `All tests successful`.

## Hosted Supabase setup

Already done for project `xridrrclixxkuokiqnlf`. To set up a fresh project:

1. [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**. Pick a region near your attendees and save the database password.
2. Link and push the schema (run `npx supabase db push` again whenever new files appear in `supabase/migrations/`, **before** deploying the frontend that needs them):
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
- [ ] **Mix & Mingle:** line up topics and polls in the host console before guests arrive, and test the big screen on the venue's TV (fonts are sized for 16:9).
- [ ] Clear out test data (SQL Editor). This keeps accounts and deletes test songs and events:
  ```sql
  delete from public.song_requests;
  delete from public.events;   -- also deletes Mix & Mingle topics, polls, questions, check-ins and Connect requests
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
| Home page shows "nothing live" right after a deploy | The hosted database is missing new migrations. Run `npx supabase db push`. |
| Signing in on `localhost` sends you to the live site | Add `http://localhost:5173/**` (and `http://127.0.0.1:5173/**`) under **Authentication → URL Configuration → Redirect URLs**. |
| A guest can't vote, ask or connect | They need to tap **Join tonight** first (check-in). Connect also needs the event to be ended, and opens for 72 hours. |
| `/screen` shows the wrong poll | It shows the poll you sent with **Show on screen**, otherwise the open one. |
| Matches take a few seconds to appear for the first person | The Connect page checks for new matches every 20 s (requests are private, so there's no live push). |

## Project structure

```
src/
  app/            router, providers, layouts, header
  components/ui/  Button, Input, Select, Dialog, Card, Confetti, …
  features/
    auth/         login, signup, password reset, route guards
    profile/      onboarding, profile, avatar upload, my songs
    queue/        karaoke home, song form, ticket, live status, realtime
    mingle/       Mix & Mingle home: check-in, topic card, polls, ask, catch-up
    host/         host console: topics, polls, questions, end event
    screen/       /screen big-screen view
    connect/      Connect: candidates, matches, block/report
    admin/        events dashboard, contacts, reports, CSV export, admin guard
    legal/        /privacy and /terms
  lib/            supabase client, generated DB types, phone/CSV helpers
supabase/
  migrations/     schema, RLS, triggers, RPCs, storage, realtime
  tests/          pgTAP tests (npx supabase test db)
  functions/      notify-admin Edge Function
```

Accessibility and motion:
- Every animation respects the phone's "reduce motion" setting (`MotionConfig reducedMotion="user"` plus a CSS fallback).
- Tap targets are at least 44px, and layouts work from 320px wide.
- Accent buttons (yellow or red) use dark text for contrast.
