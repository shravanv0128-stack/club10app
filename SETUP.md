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
`/pending-approval`. Promote the first exec manually in the SQL editor:

```sql
update public.profiles set role = 'exec' where email = 'you@princeton.edu';
```

(The `profiles` RLS policy blocks anyone but an exec from changing `role`,
including via the app, so this first promotion must be done directly in
the database.)

## 5. Env vars

Copy `.env.local.example` to `.env.local` and fill in your project's URL
and anon key from Supabase Dashboard → Project Settings → API.
