# DOL World · Karaoke Queue

Karaoke event web app: attendees sign up, complete a profile, submit a song, and get a DB-assigned queue number; admins run the live queue, export contacts, and get an email per submission. The user is a frontend engineer (React + TS), not a backend engineer: backend is Supabase only, no custom server. Explain any Supabase dashboard step they must do manually.

## Stack (do not deviate)
Vite + React + TS (strict) · Tailwind v4 via @tailwindcss/vite · motion (import from `motion/react`) · sonner · react-router **v7** (data routers, pinned; v8 was auto-installed and rolled back) · @tanstack/react-query · react-hook-form + zod · lucide-react · @supabase/supabase-js · Vercel (vercel.json SPA rewrite). Extra approved deps: libphonenumber-js. Confetti is hand-built with motion (no extra lib).

## Agreed decisions
- Brand: **DOL World** (`VITE_EVENT_BRAND`, `src/lib/brand.ts`).
- Status enum: `waiting, up_next, singing, sung, skipped` (`singing` added = on stage; `events.current_number` follows it).
- Consent checkbox is **required at onboarding** (unchecked by default); withdrawable later on /profile. `consent_at` is set/cleared by a DB trigger, clients only toggle `marketing_consent`.
- Profile complete = full_name + phone (E.164) + snapchat (required; avatar optional).
- One active song (waiting/up_next/singing) per user per event.
- `profiles.email` synced from auth.users by trigger.
- Supabase auth uses default (implicit) flow so password-reset links work when opened in a phone's email app.

## Phases (stop after each for the user to test; list dashboard steps + how to test)
1. ✅ Setup, Tailwind theme, Supabase client, migrations + RLS (tested locally: concurrency, RLS, RPCs)
2. ✅ Auth (Google + email/password, forgot/reset), guards, onboarding, profile, avatar upload
3. ✅ Song submission, toasts, ticket reveal (spring, confetti, count-up), live status via Realtime, up-next alert, no-event state
4. ✅ Admin dashboard (event switcher/create/activate, realtime queue, status controls, Call next, search/filter/sort, CSV), contacts page + CSV; mobile-friendly
5. ✅ (built; user must do the dashboard/Resend/Vercel steps in README) Edge Function `notify-admin` (Resend, DB webhook on song_requests INSERT, shared-secret header, `--no-verify-jwt`), polish, reduced-motion, 320px QA, full README

## Database (supabase/migrations)
- `is_admin()` security definer; `admins` has no client write policies.
- Numbering: BEFORE INSERT trigger `assign_queue_number()` increments `events.last_queue_number` under row lock; rejects inactive events / incomplete profiles / duplicate active songs. Clients may only insert `(event_id, song_title, artist, note)` and update `status` (admins only via RLS).
- `handle_status_change()` keeps one singing/up_next per event and touches the event row so attendees get a realtime ping (they can't see others' rows) and refetch.
- RPCs: `get_queue_status(p_event_id)` (numbers/counts only), `call_next(p_event_id)`, `set_active_event(p_event_id | null)`, `admin_contacts()`.
- Realtime on `song_requests` and `events`. `avatars` bucket, users write only under `<uid>/`.
- After schema changes: `npm run db:types` (local) or `npm run db:types:remote`. Nullable RPC columns are widened in `src/lib/types.ts`.

## Conventions
- Feature folders: `src/features/{auth,profile,queue,admin}`, shared UI in `src/components/ui`, `@/` alias → `src/`.
- Dark neon theme tokens in `src/index.css` (`night-*`, `pink`, `cyan`, `violet`, `ink*`). Primary buttons use dark text on pink for AA contrast. Min 44px tap targets, works from 320px.
- `MotionConfig reducedMotion="user"` is set globally in `src/app/providers.tsx`.
- Formatting: `.oxfmtrc.json` (single quotes, no semicolons, width 140). Run `npx oxfmt <paths>` only on files you touched.
- Public `/privacy` and `/terms` (`src/features/legal`) are linked from Google's OAuth Branding page; contact email comes from `VITE_CONTACT_EMAIL`.
- Supabase default SMTP only delivers to team members: real attendees need custom SMTP (Resend + verified domain) or "Confirm email" off.
- Admin: `/admin` (queue) and `/admin/contacts`, behind `RequireAdmin` (404 for non-admins). Shared `Dialog` and `Select` live in `src/components/ui`; CSV helpers (with formula-injection guard) in `src/lib/csv.ts`.
- Shared motion variants in `src/lib/motion.ts`, status labels in `src/features/queue/status.ts`.
- Never run `supabase db reset` without `--local` (project is linked to hosted).
- Local dev: `npx supabase start` (Docker), `.env.local` holds local keys; the user is moving to a hosted project.
