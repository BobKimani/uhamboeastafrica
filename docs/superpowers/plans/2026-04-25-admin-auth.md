# Admin Auth Plan

## Goal

Use Firebase Auth for the admin authentication module while preserving the existing admin login, reset-password, and protected-route UI.

## Implementation

- Create `lib/firebase.ts` with the Firebase app configuration and browser-only analytics guard.
- Replace the previous admin auth helper in `lib/auth.ts` with Firebase Auth methods.
- Keep compatibility helpers for the current UI: `signIn`, `signOutUser`, `sendResetEmail`, and `onAuthChange`.
- Expose a `useAuth` hook with `user`, `loading`, `signUp`, `signIn`, `signOut`, and `resetPassword`.
- Keep route protection client-side through `components/auth/auth-guard.tsx`.

## Verification

- `npm run lint`
- `npm run build`
- Search the codebase for old auth provider imports or environment variable references.
