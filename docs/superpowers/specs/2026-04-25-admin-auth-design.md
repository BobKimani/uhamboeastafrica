# Admin Auth Design

Admin authentication is handled on the client with Firebase Auth.

## Architecture

- `lib/firebase.ts` creates the reusable Firebase app from `NEXT_PUBLIC_FIREBASE_*` variables and guards analytics to the browser.
- `lib/auth.ts` exposes the admin auth abstraction: `user`, `loading`, `signUp`, `signIn`, `signOut`, and `resetPassword`.
- `components/auth/auth-guard.tsx` subscribes to Firebase auth state and redirects unauthenticated users to `/auth`.
- `app/auth/auth-form.tsx` keeps the existing admin sign-in and reset UI while using Firebase email/password auth underneath.

## Client Flow

1. The auth guard resolves the current user through Firebase Auth.
2. The guard stays in a loading state until the first auth result arrives.
3. Auth state changes are tracked with `onAuthStateChanged`.
4. Unauthenticated admin visitors are redirected to `/auth?redirect=<admin-path>`.
5. Successful sign-in sends the operator back to the requested admin route.

Only Firebase web app configuration values are used in frontend code. Server-side admin credentials are not needed for the admin sign-in flow.
