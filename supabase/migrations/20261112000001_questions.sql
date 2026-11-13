-- Mix & Mingle anonymous questions to the host.
--
-- Anonymity model: the host and the room never see who asked. user_id is kept
-- only so abuse can be moderated (ban_question_author) and rate-limited.
-- Nobody but the asker can select from questions, admins included: the host
-- reads them through host_questions(), which never returns user_id.

alter table public.profiles
  add column questions_banned boolean not null default false;
-- Not added to the client update grant on profiles: only ban_question_author() sets it.

create type public.question_status as enum ('pending', 'approved', 'answered', 'hidden');

create table public.questions (
  id                 uuid primary key default gen_random_uuid(),
  event_id           uuid not null references public.events (id) on delete cascade,
  user_id            uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  -- The topic that was live when it was asked, for the catch-up recap.
  topic_id           uuid references public.topics (id) on delete set null,
  body               text not null check (char_length(btrim(body)) between 1 and 280),
  status             public.question_status not null default 'pending',
  -- Set by the word filter. Flagged questions are highlighted for the host, never dropped.
  flagged            boolean not null default false,
  shown_on_screen_at timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index questions_event_idx on public.questions (event_id, created_at);
create index questions_user_event_idx on public.questions (user_id, event_id, created_at desc);
create index questions_topic_idx on public.questions (topic_id);

create trigger questions_set_updated_at
  before update on public.questions
  for each row execute function public.set_updated_at();

alter table public.events
  add column screen_question_id uuid references public.questions (id) on delete set null,
  -- Bumped on every question change. Admins can't select questions, so this
  -- event-row update is how the host console gets a realtime ping.
  add column questions_rev integer not null default 0;

-- A basic word filter. It only flags for the host to review.
create function public.question_needs_review(p_body text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(p_body) ~ (
    '\m(fuck\w*|shit\w*|bitch\w*|cunt\w*|dick\w*|cock\w*|pussy|pussies|whore\w*|slut\w*|bastard\w*|'
    || 'asshole\w*|wank\w*|twat\w*|nigg\w*|fag\w*|faggot\w*|retard\w*|tranny|trannies|spastic|kys|'
    || 'kill yourself|rape\w*|motherfuck\w*)\M'
  );
$$;

create function public.prepare_question()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count  integer;
  v_latest timestamptz;
begin
  -- Never trust client-supplied values for these.
  if auth.uid() is not null then
    new.user_id := auth.uid();
  end if;
  new.body := btrim(new.body);
  new.status := 'pending';
  new.shown_on_screen_at := null;
  new.created_at := now();
  new.flagged := public.question_needs_review(new.body);

  if not exists (
    select 1 from public.events e
     where e.id = new.event_id and e.is_active and e.type = 'mix_mingle' and e.ended_at is null
  ) then
    raise exception 'Questions are closed for this event';
  end if;

  -- Locks the asker's check-in so two quick taps can't both slip past the limits.
  perform 1 from public.check_ins where event_id = new.event_id and user_id = new.user_id for update;
  if not found then
    raise exception 'Join tonight to ask a question' using errcode = '42501';
  end if;

  if exists (select 1 from public.profiles where id = new.user_id and questions_banned) then
    raise exception 'You can''t send questions right now';
  end if;

  select count(*), max(created_at) into v_count, v_latest
    from public.questions
   where event_id = new.event_id and user_id = new.user_id;

  if v_count >= 5 then
    raise exception 'You''ve sent 5 questions tonight. That''s the limit.';
  end if;
  if v_latest > now() - interval '30 seconds' then
    raise exception 'Give it 30 seconds before sending another question';
  end if;

  select id into new.topic_id from public.topics where event_id = new.event_id and status = 'live';

  return new;
end;
$$;

create trigger questions_prepare
  before insert on public.questions
  for each row execute function public.prepare_question();

create function public.bump_questions_rev()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.events set questions_rev = questions_rev + 1 where id = coalesce(new.event_id, old.event_id);
  return null;
end;
$$;

create trigger questions_bump_rev
  after insert or update or delete on public.questions
  for each row execute function public.bump_questions_rev();

-- RLS
alter table public.questions enable row level security;

revoke all on public.questions from anon, authenticated;
grant select on public.questions to authenticated;
grant insert (event_id, body) on public.questions to authenticated;

create policy "Users can ask their own questions"
  on public.questions for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can read their own questions"
  on public.questions for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Host view: everything the host needs, never who asked.
create function public.host_questions(p_event_id uuid)
returns table (
  id                 uuid,
  body               text,
  status             public.question_status,
  flagged            boolean,
  topic_id           uuid,
  shown_on_screen_at timestamptz,
  created_at         timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  return query
    select q.id, q.body, q.status, q.flagged, q.topic_id, q.shown_on_screen_at, q.created_at
      from public.questions q
     where q.event_id = p_event_id
     order by q.created_at desc;
end;
$$;

-- Approve / hide / mark answered (or back to pending).
create function public.moderate_question(p_question_id uuid, p_status public.question_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  update public.questions set status = p_status where id = p_question_id;
  if not found then
    raise exception 'Question not found' using errcode = 'P0002';
  end if;
  if p_status = 'hidden' then
    update public.events set screen_question_id = null where screen_question_id = p_question_id;
  end if;
end;
$$;

-- Shows a question on /screen until replaced. Pass null to clear the screen.
-- Showing a pending question approves it.
create function public.show_question_on_screen(p_event_id uuid, p_question_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  if p_question_id is not null then
    update public.questions
       set shown_on_screen_at = now(),
           status = case when status = 'pending' then 'approved'::public.question_status else status end
     where id = p_question_id and event_id = p_event_id and status <> 'hidden';
    if not found then
      raise exception 'That question can''t be shown';
    end if;
  end if;
  update public.events set screen_question_id = p_question_id where id = p_event_id;
end;
$$;

-- Stops the author of a question from asking any more and hides everything
-- they've asked, without telling the host who it was. Returns how many
-- questions were hidden.
create function public.ban_question_author(p_question_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_author uuid;
  v_hidden integer;
begin
  perform public.assert_admin();
  select user_id into v_author from public.questions where id = p_question_id;
  if v_author is null then
    raise exception 'Question not found' using errcode = 'P0002';
  end if;

  update public.profiles set questions_banned = true where id = v_author;

  update public.events set screen_question_id = null
   where screen_question_id in (select id from public.questions where user_id = v_author);

  update public.questions set status = 'hidden' where user_id = v_author and status <> 'hidden';
  get diagnostics v_hidden = row_count;
  return v_hidden;
end;
$$;

revoke execute on function public.question_needs_review(text) from public, anon, authenticated;
revoke execute on function public.host_questions(uuid) from public, anon;
revoke execute on function public.moderate_question(uuid, public.question_status) from public, anon;
revoke execute on function public.show_question_on_screen(uuid, uuid) from public, anon;
revoke execute on function public.ban_question_author(uuid) from public, anon;
grant execute on function public.host_questions(uuid) to authenticated;
grant execute on function public.moderate_question(uuid, public.question_status) to authenticated;
grant execute on function public.show_question_on_screen(uuid, uuid) to authenticated;
grant execute on function public.ban_question_author(uuid) to authenticated;

-- Askers get live status updates on their own questions (RLS limits it to them).
alter publication supabase_realtime add table public.questions;
