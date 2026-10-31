-- Local development seed (runs on `supabase db reset`). Not applied to production.
insert into public.events (name, venue, event_date, is_active)
values ('D.O.L World Karaoke Night', 'Lagos', current_date + 7, true);
