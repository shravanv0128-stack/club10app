-- Exec board titles (display-only; RLS still keys off profiles.role)
alter table public.profiles add column title text;
