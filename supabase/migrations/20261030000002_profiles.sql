
create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  email             text,
  full_name         text check (char_length(full_name) between 1 and 120),
  phone             text check (phone ~ '^\+[1-9][0-9]{6,14}$'),
  snapchat          text check (snapchat ~ '^[A-Za-z][A-Za-z0-9._-]{1,13}[A-Za-z0-9]$'),
  avatar_url        text,
  marketing_consent boolean not null default false,
  consent_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint profiles_consent_has_timestamp
    check (not marketing_consent or consent_at is not null)
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create function public.handle_profile_consent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.marketing_consent then
    if tg_op = 'INSERT' or not old.marketing_consent then
      new.consent_at := now();
    else
      new.consent_at := old.consent_at;
    end if;
  else
    new.consent_at := null;
  end if;
  return new;
end;
$$;

create trigger profiles_handle_consent
  before insert or update on public.profiles
  for each row execute function public.handle_profile_consent();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    nullif(btrim(left(coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ), 120)), ''),
    nullif(coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    ), '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

alter table public.profiles enable row level security;

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, phone, snapchat, avatar_url, marketing_consent)
  on public.profiles to authenticated;

create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "Admins can read all profiles"
  on public.profiles for select
  to authenticated
  using ((select public.is_admin()));

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
