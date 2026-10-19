-- Wedding RSVP backend for Supabase.
-- Run this once in your project's SQL Editor (Supabase dashboard ▸ SQL Editor ▸ New query ▸ Run).
-- Change the email on the last line to the one you will log in to the admin panel with.
--
-- Guests never read the table directly: they can only look up and answer their own
-- invitation through get_guest() and rsvp(), using the token in their personal link.
-- Only logged-in users whose email is in the admins table can see or change the list.

create table if not exists public.guests (
  token      text primary key default left(replace(gen_random_uuid()::text, '-', ''), 12),
  name       text not null default '' check (char_length(name) <= 80),
  answer     text not null default '' check (answer in ('', 'yes', 'no')),
  party_size int  not null default 0 check (party_size between 0 and 20),
  message    text not null default '' check (char_length(message) <= 1000),
  replied_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.admins (
  email text primary key
);

alter table public.guests enable row level security;
alter table public.admins enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where lower(email) = lower(auth.jwt() ->> 'email'));
$$;

drop policy if exists "admins manage guests" on public.guests;
create policy "admins manage guests" on public.guests
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- A guest's own invitation, found by the token in their personal link.
create or replace function public.get_guest(p_token text)
returns table (name text, answer text, party_size int, message text, replied_at timestamptz)
language sql stable security definer set search_path = public as $$
  select g.name, g.answer, g.party_size, g.message, g.replied_at from guests g where g.token = p_token;
$$;

-- Save or update a reply. A known token fills in that guest's row; without one
-- (the general link) a new row is added. Returns the guest's token.
create or replace function public.rsvp(p_token text, p_name text, p_answer text, p_party_size int, p_message text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_answer text := case when p_answer = 'no' then 'no' else 'yes' end;
  v_size   int  := case when p_answer = 'no' then 0 else greatest(1, least(20, coalesce(p_party_size, 1))) end;
  v_name   text := left(trim(coalesce(p_name, '')), 80);
  v_msg    text := left(trim(coalesce(p_message, '')), 1000);
  v_token  text;
begin
  if v_name = '' then raise exception 'name_required'; end if;
  update guests
     set answer = v_answer, party_size = v_size, message = v_msg, replied_at = now(),
         name = case when guests.name = '' then v_name else guests.name end
   where token = coalesce(p_token, '')
  returning token into v_token;
  if v_token is null then
    insert into guests (name, answer, party_size, message, replied_at)
    values (v_name, v_answer, v_size, v_msg, now())
    returning token into v_token;
  end if;
  return v_token;
end $$;

revoke all on function public.is_admin() from public;
revoke all on function public.get_guest(text) from public;
revoke all on function public.rsvp(text, text, text, int, text) from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.get_guest(text) to anon, authenticated;
grant execute on function public.rsvp(text, text, text, int, text) to anon, authenticated;

-- ▼ Change this to the email you will log in to the admin panel with.
insert into public.admins (email) values ('you@example.com') on conflict do nothing;
