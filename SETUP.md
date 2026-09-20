# Setup

## 1. Create a Supabase project

Create a project at https://supabase.com.

## 2. Run the migration

Either:

- `supabase link --project-ref <ref>` then `supabase db push`, or
- open the SQL editor in the Supabase dashboard and paste the contents of
  `supabase/migrations/0001_init.sql`.

This creates `profiles`, `captain_assignments`, `audit_log`, their RLS
policies, and the `auth.users` trigger that provisions a `profiles` row
(role `pending`) on first sign-in.

Run `0002_exec_titles.sql` and `0003_rls_policies_repair.sql` the same way.
If a paste ever runs partially (a syntax error or "already exists" aborts
the batch), re-run `0003` — it is idempotent and restores every policy.
Symptom of missing policies: the app treats everyone as unapproved and
`profiles` queries return zero rows with no error.

## 3. Configure Google OAuth

In Supabase Dashboard → Authentication → Providers → Google:

- Enable the provider and set the Google OAuth client ID/secret.
- Set Site URL and the redirect URL (`<your-app-origin>/auth/callback`)
  under Authentication → URL Configuration.

Google's `hd` (hosted domain) query param is passed client-side as a hint
to restrict the account picker to `princeton.edu`, but that is UI-only and
can be bypassed. The real enforcement is server-side: `/auth/callback`
checks the signed-in user's email domain and signs them out immediately
(redirecting to `/login?error=domain`) if it isn't `@princeton.edu`.

## 4. Promote your first exec

New sign-ins land in `profiles` with `role = 'pending'` and are routed to
`/pending-approval`. Promote the first exec manually in the SQL editor.

The `on_profile_update_enforce_and_audit` trigger blocks any role change
where `is_exec()` is false — and in the SQL editor there is no logged-in
session, so `auth.uid()` is null and `is_exec()` is always false. Disable
the trigger for this one bootstrap update, then re-enable it immediately:

```sql
alter table public.profiles disable trigger on_profile_update_enforce_and_audit;

update public.profiles set role = 'exec' where email = 'you@princeton.edu';

alter table public.profiles enable trigger on_profile_update_enforce_and_audit;
```

Every promotion after this first one should go through the app's Roster
page instead (exec approving a pending signup), since that runs with a
real exec session and the trigger applies normally.

## 5. Env vars

Copy `.env.local.example` to `.env.local` and fill in your project's URL
and anon key from Supabase Dashboard → Project Settings → API.
