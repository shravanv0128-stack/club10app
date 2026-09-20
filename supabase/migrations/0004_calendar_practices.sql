-- Calendar sync: exec-managed iCal feed URL + practices upserted from it.
-- Idempotent: safe to paste into the SQL editor any number of times.

create table if not exists public.calendar_settings (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique check (singleton),
  ical_url text not null,
  last_synced_at timestamptz,
  last_sync_error text,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.practices (
  id uuid primary key default gen_random_uuid(),
  external_uid text not null unique,
  title text not null,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  roster_group text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists practices_starts_at_idx on public.practices (starts_at);

alter table public.calendar_settings enable row level security;
alter table public.practices enable row level security;

drop policy if exists "calendar_settings_exec_select" on public.calendar_settings;
drop policy if exists "calendar_settings_exec_insert" on public.calendar_settings;
drop policy if exists "calendar_settings_exec_update" on public.calendar_settings;
drop policy if exists "practices_select_authenticated" on public.practices;
drop policy if exists "practices_exec_insert" on public.practices;
drop policy if exists "practices_exec_update" on public.practices;
drop policy if exists "practices_exec_delete" on public.practices;

create policy "calendar_settings_exec_select" on public.calendar_settings for select using (public.is_exec());
create policy "calendar_settings_exec_insert" on public.calendar_settings for insert with check (public.is_exec());
create policy "calendar_settings_exec_update" on public.calendar_settings for update using (public.is_exec()) with check (public.is_exec());

create policy "practices_select_authenticated" on public.practices for select using (auth.uid() is not null);
create policy "practices_exec_insert" on public.practices for insert with check (public.is_exec());
create policy "practices_exec_update" on public.practices for update using (public.is_exec()) with check (public.is_exec());
create policy "practices_exec_delete" on public.practices for delete using (public.is_exec());

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.calendar_settings, public.practices to authenticated;
