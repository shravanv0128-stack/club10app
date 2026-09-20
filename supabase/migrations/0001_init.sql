-- Club10 auth + RLS foundation: profiles, captain_assignments, audit_log

create extension if not exists "pgcrypto";

create type public.app_role as enum ('pending', 'member', 'captain', 'exec');

-- =========================================================================
-- profiles
-- =========================================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role public.app_role not null default 'pending',
  tier text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================================
-- captain_assignments
-- =========================================================================
create table public.captain_assignments (
  id uuid primary key default gen_random_uuid(),
  captain_id uuid not null references public.profiles (id) on delete cascade,
  roster_group text not null,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- audit_log
-- =========================================================================
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- Helper functions (SECURITY DEFINER to avoid recursive RLS on profiles)
-- =========================================================================
create or replace function public.current_role()
returns public.app_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_exec()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select role from public.profiles where id = auth.uid()) = 'exec', false);
$$;

create or replace function public.is_captain()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select role from public.profiles where id = auth.uid()) = 'captain', false);
$$;

-- =========================================================================
-- auth.users -> profiles provisioning trigger
-- =========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    'pending'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- profiles: block self role/tier escalation + audit role changes
-- =========================================================================
create or replace function public.enforce_profile_update_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_exec() then
    if new.role is distinct from old.role then
      raise exception 'Only exec can change role';
    end if;
    if new.tier is distinct from old.tier then
      raise exception 'Only exec can change tier';
    end if;
  end if;

  if new.role is distinct from old.role then
    insert into public.audit_log (actor_id, action, target_type, target_id, old_value, new_value)
    values (
      auth.uid(),
      'role_change',
      'profiles',
      new.id::text,
      jsonb_build_object('role', old.role),
      jsonb_build_object('role', new.role)
    );
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger on_profile_update_enforce_and_audit
  before update on public.profiles
  for each row execute function public.enforce_profile_update_rules();

-- =========================================================================
-- RLS
-- =========================================================================
alter table public.profiles enable row level security;
alter table public.captain_assignments enable row level security;
alter table public.audit_log enable row level security;

-- profiles policies
create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles_select_exec_all"
  on public.profiles for select
  using (public.is_exec());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_update_exec_all"
  on public.profiles for update
  using (public.is_exec())
  with check (true);

-- captain_assignments policies
create policy "captain_assignments_select_own"
  on public.captain_assignments for select
  using (captain_id = auth.uid());

create policy "captain_assignments_exec_select_all"
  on public.captain_assignments for select
  using (public.is_exec());

create policy "captain_assignments_exec_insert"
  on public.captain_assignments for insert
  with check (public.is_exec());

create policy "captain_assignments_exec_update"
  on public.captain_assignments for update
  using (public.is_exec())
  with check (public.is_exec());

create policy "captain_assignments_exec_delete"
  on public.captain_assignments for delete
  using (public.is_exec());

-- audit_log policies
create policy "audit_log_select_exec"
  on public.audit_log for select
  using (public.is_exec());

create policy "audit_log_insert_exec"
  on public.audit_log for insert
  with check (public.is_exec());
