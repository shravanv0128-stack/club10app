-- Idempotent re-apply of RLS + policies (0001 can partially apply when pasted
-- into the SQL editor in pieces; this is safe to run any number of times).
alter table public.profiles enable row level security;
alter table public.captain_assignments enable row level security;
alter table public.audit_log enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_exec_all" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_update_exec_all" on public.profiles;
drop policy if exists "captain_assignments_select_own" on public.captain_assignments;
drop policy if exists "captain_assignments_exec_select_all" on public.captain_assignments;
drop policy if exists "captain_assignments_exec_insert" on public.captain_assignments;
drop policy if exists "captain_assignments_exec_update" on public.captain_assignments;
drop policy if exists "captain_assignments_exec_delete" on public.captain_assignments;
drop policy if exists "audit_log_select_exec" on public.audit_log;
drop policy if exists "audit_log_insert_exec" on public.audit_log;

create policy "profiles_select_own" on public.profiles for select using (id = auth.uid());
create policy "profiles_select_exec_all" on public.profiles for select using (public.is_exec());
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_update_exec_all" on public.profiles for update using (public.is_exec()) with check (true);

create policy "captain_assignments_select_own" on public.captain_assignments for select using (captain_id = auth.uid());
create policy "captain_assignments_exec_select_all" on public.captain_assignments for select using (public.is_exec());
create policy "captain_assignments_exec_insert" on public.captain_assignments for insert with check (public.is_exec());
create policy "captain_assignments_exec_update" on public.captain_assignments for update using (public.is_exec()) with check (public.is_exec());
create policy "captain_assignments_exec_delete" on public.captain_assignments for delete using (public.is_exec());

create policy "audit_log_select_exec" on public.audit_log for select using (public.is_exec());
create policy "audit_log_insert_exec" on public.audit_log for insert with check (public.is_exec());

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles, public.captain_assignments, public.audit_log to authenticated;
