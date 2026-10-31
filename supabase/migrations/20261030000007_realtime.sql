-- Realtime: postgres_changes respects RLS, so attendees only receive their own
-- song_requests rows; admins receive all. Everyone receives events updates,
-- which is how attendees learn the queue moved.
alter publication supabase_realtime add table public.song_requests, public.events;
