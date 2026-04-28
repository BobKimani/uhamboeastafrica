# Admin Auth Design

Admin authentication is handled on the client with Supabase Auth.

## Architecture

- `src/lib/supabase/client.ts` creates the reusable browser client from `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- `lib/auth.ts` exposes the admin auth abstraction: `user`, `session`, `loading`, `signUp`, `signIn`, `signOut`, and `resetPassword`.
- `components/auth/auth-guard.tsx` subscribes to Supabase session state and redirects unauthenticated users to `/auth`.
- `app/auth/auth-form.tsx` keeps the existing admin sign-in and reset UI while using Supabase email/password auth underneath.

## Client Flow

1. The auth guard resolves the current session with `supabase.auth.getSession()`.
2. The guard stays in a loading state until the first session result arrives.
3. Auth state changes are tracked with `supabase.auth.onAuthStateChange`.
4. Unauthenticated admin visitors are redirected to `/auth?redirect=<admin-path>`.
5. Successful sign-in sends the operator back to the requested admin route.

Only publishable Supabase browser credentials are used in frontend code. Service role keys must stay server-only and are not needed for the admin sign-in flow.
