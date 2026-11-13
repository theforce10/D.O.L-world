# DOL World

Event web app with two event types (`events.type`): **karaoke** (attendees submit a song and get a DB-assigned queue number; admins run the live queue, export contacts, get an email per submission) and **mix_mingle** (guests check in, then live topics, polls, anonymous questions, catch-up, and post-event Connect). The user is a frontend engineer (React + TS), not a backend engineer: backend is Supabase only, no custom server. Explain any Supabase dashboard step they must do manually.

## Stack (do not deviate)
Vite + React + TS (strict) · Tailwind v4 via @tailwindcss/vite · motion (import from `motion/react`) · sonner · react-router **v7** (data routers, pinned; v8 was auto-installed and rolled back) · @tanstack/react-query · react-hook-form + zod · lucide-react · @supabase/supabase-js · Vercel (vercel.json SPA rewrite). Extra approved deps: libphonenumber-js, qrcode.react. Confetti is hand-built with motion (no extra lib).

## Agreed decisions
- Brand: **DOL World** (`VITE_EVENT_BRAND`, `src/lib/brand.ts`).
- Status enum: `waiting, up_next, singing, sung, skipped` (`singing` added = on stage; `events.current_number` follows it).
- Consent checkbox is **required at onboarding** (unchecked by default); withdrawable later on /profile. `consent_at` is set/cleared by a DB trigger, clients only toggle `marketing_consent`.
- Profile complete = full_name + phone (E.164); avatar optional. Snapchat is back as an optional `profiles.snapchat` (Connect only; set on /profile or when first tapping Connect; shown only via `my_matches`). Mix & Mingle guests who arrive via the sign-in sheet do onboarding with `consent=later` and are asked for marketing consent (optional) at check-in.
- One active song (waiting/up_next/singing) per user per event.
- `profiles.email` synced from auth.users by trigger.
- Supabase auth uses default (implicit) flow so password-reset links work when opened in a phone's email app.

## Phases (stop after each for the user to test; list dashboard steps + how to test)
1. ✅ Setup, Tailwind theme, Supabase client, migrations + RLS (tested locally: concurrency, RLS, RPCs)
2. ✅ Auth (Google + email/password, forgot/reset), guards, onboarding, profile, avatar upload
3. ✅ Song submission, toasts, ticket reveal (spring, confetti, count-up), live status via Realtime, up-next alert, no-event state
4. ✅ Admin dashboard (event switcher/create/activate, realtime queue, status controls, Call next, search/filter/sort, CSV), contacts page + CSV; mobile-friendly
5. ✅ (built; user must do the dashboard/Resend/Vercel steps in README) Edge Function `notify-admin` (Resend, DB webhook on song_requests INSERT, shared-secret header, `--no-verify-jwt`), polish, reduced-motion, 320px QA, full README

## Mix & Mingle
- Phases: ✅ A groundwork (event types, check-ins, guest-first viewing, sign-in-on-action) · ✅ B topics + host console (`/admin/events/:eventId/host`, RPCs `advance_topic`, `end_round`, `extend_topic`, `reorder_topics`, `server_now`; countdowns use server clock offset from `src/lib/serverClock.ts`) · ✅ C polls + `/screen/:eventId` (RPCs `create_poll`, `update_poll`, `open_poll` (one open per event), `close_poll`, `show_poll_on_screen`, `cast_vote` (checked-in only, upsert), public `poll_results` (counts only); every vote touches `polls.vote_count` so clients get a realtime ping and refetch results, throttled) · ✅ D anonymous questions (`questions` readable only by the asker, admins included; host uses `host_questions` (no user_id), `moderate_question`, `show_question_on_screen`, `ban_question_author` (sets `profiles.questions_banned`, returns a count only); insert trigger enforces check-in, ban, 5 per event, 1 per 30s, flags via `question_needs_review`; question changes bump `events.questions_rev` so the host gets a realtime ping) · ✅ E catch-up (public `event_recap` jsonb; `useCatchUp` opens it for first visits, 15+ min away, or late check-in) · ✅ F Connect (`end_event` starts a 72h window; `connect_candidates`, `request_connect`, `withdraw_connect`, `unmatch`, `my_matches` (polled every 20s), `block_user`, `report_user`, `my_connect_events`, `admin_reports`, `resolve_report`; `connect_requests`/`blocks` have no client access; `set_active_event` clears `ended_at`) · ✅ G admin stats (`admin_contacts` has karaoke/mingle counts + last check-in; `event_stats`), pgTAP suite, README. · ✅ Topic votes: a poll with `kind = 'topic'` whose `poll_options.topic_id` point at queued topics (labels copied from prompts, kept in sync by trigger; guests can't read queued topics). RPCs `start_topic_vote` (2–6 queued topics, one open per event, opens immediately) and `finish_topic_vote(poll, topic)` (host picks leader or between tied; winner goes live and moves to the queue front, losers stay queued). Cancel = delete the poll. `advance_topic` refuses while a topic vote is open; `open_poll`/`update_poll` are normal-poll only. Clients split with `openTopicVote()` / `normalPolls()`.
- `/` switches on the active event's type (`src/app/HomeRoute.tsx`). Guests see Mix & Mingle read-only; actions go through `useMingleActions` (auth sheet → onboarding with `consent=later` → check-in sheet → resume, pending action in sessionStorage).
- `events` is readable by anon (no personal data). Never open RLS on tables with `user_id`: expose via security definer RPCs.
- `check_ins` (PK event_id+user_id, `age_confirmed` must be true, `discoverable` default false); trigger requires complete profile and an active, un-ended mix_mingle event.

## Database (supabase/migrations)
- `is_admin()` security definer; `admins` has no client write policies.
- Numbering: BEFORE INSERT trigger `assign_queue_number()` increments `events.last_queue_number` under row lock; rejects inactive events / incomplete profiles / duplicate active songs. Clients may only insert `(event_id, song_title, artist, note)` and update `status` (admins only via RLS).
- `handle_status_change()` keeps one singing/up_next per event and touches the event row so attendees get a realtime ping (they can't see others' rows) and refetch.
- RPCs: `get_queue_status(p_event_id)` (numbers/counts only), `call_next(p_event_id)`, `set_active_event(p_event_id | null)`, `admin_contacts()`.
- Realtime on `song_requests` and `events`. `avatars` bucket, users write only under `<uid>/`.
- After schema changes: `npm run db:types` (local) or `npm run db:types:remote`. Nullable RPC columns are widened where they're used (or in `src/lib/types.ts`).
- Tests: pgTAP files in `supabase/tests/` (`npx supabase test db`, local only, rolled back). Add a test for every new RLS rule or RPC.
- Hosted DB must get `npx supabase db push` before a frontend that needs new migrations is deployed.

## Conventions
- Feature folders: `src/features/{auth,profile,queue,admin,mingle,host,screen,connect,legal}`, shared UI in `src/components/ui`, `@/` alias → `src/`.
- Colour rule: **karaoke = yellow, Mix & Mingle = red, never mixed on one screen.** Neutral near-black `night-*` surfaces, `ink*` text, and a single `accent` / `accent-soft` / `accent-deep` / `accent-glow` / `shadow-glow-accent` set switched by `data-mode` (`karaoke` | `mingle` | neutral ivory) in `src/index.css`. `AccentModeProvider` (`src/app/accent.tsx`) sets it on `<html>` from the live event; pages override with `useAccentMode()` (`src/app/accentMode.ts`); put `data-mode` on an element to scope it locally. No area uses plain grey-black: `AccentModeProvider` sets `data-surface` on `<html>` from the route (`surfaceFor` in `src/app/accent.tsx`), which remaps the `night-*` tokens and tints the `SpotlightBg` bloom (`--color-surface-bloom`): **velvet** plum (front door: `/`, login, signup, forgot/reset password, onboarding), **midnight** navy (`/profile`, `/connect`), **lagoon** teal (`/admin`, contacts, reports), **cosmos** indigo (host console, `/screen`), **cocoa** espresso (legal, 404). Surfaces aren't accents. Never use raw hex or the old flame/gold/ember names. Primary buttons use dark text on accent. Min 44px tap targets, works from 320px.
- `MotionConfig reducedMotion="user"` is set globally in `src/app/providers.tsx`.
- Formatting: `.oxfmtrc.json` (single quotes, no semicolons, width 140). Run `npx oxfmt <paths>` only on files you touched.
- Public `/privacy` and `/terms` (`src/features/legal`) are linked from Google's OAuth Branding page; contact email comes from `VITE_CONTACT_EMAIL`.
- Supabase default SMTP only delivers to team members: real attendees need custom SMTP (Resend + verified domain) or "Confirm email" off.
- Admin: `/admin` (events, type tabs; karaoke queue or Mix & Mingle stats), `/admin/events/:id/host`, `/screen/:id`, `/admin/contacts`, `/admin/reports`, behind `RequireAdmin` (404 for non-admins). Shared `Dialog` and `Select` live in `src/components/ui`; CSV helpers (with formula-injection guard) in `src/lib/csv.ts`.
- Shared motion variants in `src/lib/motion.ts`, status labels in `src/features/queue/status.ts`.
- Never run `supabase db reset` without `--local` (project is linked to hosted).
- Local dev: `npx supabase start` (Docker), `.env.local` holds local keys; the user is moving to a hosted project.
