# Admin Authentication — Design

**Date:** 2026-04-25
**Status:** Approved (awaiting spec review)
**Scope:** Sign-in + password reset (no signup, no sign-out UI)

## Goal

Add a Firebase-backed sign-in page at `/auth` that gates the existing `/admin` area. Unauthenticated users hitting any `/admin/*` route are redirected to `/auth`; on successful sign-in they land on the originally requested admin page (or `/admin` by default).

## Non-goals

- Account creation / signup
- Social sign-in (Google, etc.)
- Sign-out UI (helper will be exported from `lib/auth.ts`; wiring it into the admin sidebar is a separate task)
- Server-side session cookies / Firebase Admin SDK
- Email allowlists or role-based access (any Firebase-authenticated user can reach `/admin`; access is controlled by who is provisioned in the Firebase console)

## Architecture

Client-side guard pattern. Firebase Auth's session lives in IndexedDB via `browserLocalPersistence` (default). A small `<AuthGuard>` client component subscribes to `onAuthStateChanged` and either renders children, shows a spinner, or redirects to `/auth`.

### File changes

**New files:**

- `app/auth/page.tsx` — split-screen sign-in page (client component)
- `app/auth/layout.tsx` — minimal layout (no admin sidebar, no public header/footer)
- `lib/auth.ts` — exports `auth` instance and helpers `signIn`, `signOutUser`, `sendResetEmail`, `onAuthChange`
- `components/auth/auth-guard.tsx` — client wrapper that gates children behind an authenticated user

**Modified files:**

- `lib/firebase.ts` — export `app`; guard `getAnalytics` so it only runs in the browser (`typeof window !== "undefined"` check)
- `app/admin/layout.tsx` — wrap `{children}` in `<AuthGuard>`

No new npm dependencies. `firebase/auth` is included in the already-installed `firebase` package.

## UI design — `/auth` page

### Desktop (`lg` and up)

Two-column grid, full viewport height, 50/50 split.

**Left panel (image):**

- `next/image` with `fill`, `priority`, `object-cover`, `sizes="50vw"`
- Source: `/assets/serengeti.jpg`
- Dark gradient overlay: `bg-gradient-to-b from-black/40 via-transparent to-black/60`
- Top-left wordmark: "Uhambo" in `font-display`, white, generous padding
- Bottom-left tagline: "The breath of the savanna." in light italic, white/80

**Right panel (form):**

- Centered, `max-w-[400px]`, generous vertical padding
- Surface: `bg-background`
- Form contents top-to-bottom:
  1. Eyebrow label: "Admin" — uppercase, tracked, `text-on-surface-variant`
  2. Heading: "Welcome back." — `text-3xl font-display`
  3. Subtext: "Sign in to manage Uhambo." — muted, single line
  4. Email field — `<Label>Email</Label>` + `<Input type="email" required autoComplete="email">`
  5. Password field — `<Label>Password</Label>` + `<Input type="password" required autoComplete="current-password">` with inline show/hide toggle (`lucide-react` Eye / EyeOff icon, absolutely positioned right inside the input). On the right of the label row: a small "Forgot password?" `<button type="button">` link (`text-xs text-on-surface-variant hover:text-primary`) that swaps the form into reset mode.
  6. Inline error slot — appears below password on failure: `text-sm text-red-500`, single sentence; reserved space so layout doesn't jump
  7. Primary submit: `<Button variant="primary" size="lg" className="w-full">` — label "Sign in" / "Signing in…" while pending; disabled while pending
  8. Footer: "Authorised personnel only." — muted, centered, small

### Reset-password mode (same page, swapped form)

When the user clicks "Forgot password?", the right panel swaps in place — the image, wordmark, eyebrow, and footer stay; the form contents become:

1. Heading: "Reset your password." — `text-3xl font-display`
2. Subtext: "We'll email you a reset link." — muted, single line
3. Email field — pre-filled from sign-in form if entered
4. Inline message slot — error (red) on failure, success (`text-sm text-on-surface-variant`) on send: "If that email exists, a reset link is on its way."
5. Primary submit: "Send reset link" / "Sending…"
6. Secondary link below: "Back to sign in" — `<button type="button">` that swaps back to sign-in mode

State held via a single `mode: "signIn" | "reset"` local state. No route change. No URL parameter (refresh returns to sign-in mode).

### Mobile (below `lg`)

Single column.

- Image becomes a 220px hero band on top with the wordmark overlaid
- Form sits below on `bg-background` with horizontal padding

### Tokens / components

Reuses existing `Button`, `Input`, `Label` from `components/ui/`. Reuses existing color tokens (`bg-background`, `text-on-surface`, `text-on-surface-variant`, etc.) and font variables (`font-display`, `font-body`). No new design tokens.

## Auth flow

### Sign-in

1. User lands on `/auth` (direct, or redirected from `/admin/*` with `?redirect=<encodedOriginalPath>`)
2. User submits form → call `signInWithEmailAndPassword(auth, email, password)`
3. On success:
   - Read `redirect` from `useSearchParams()`
   - Validate it starts with `/admin` (prevent open-redirect); fall back to `/admin` otherwise
   - `router.replace(target)`
4. On failure:
   - Catch `FirebaseError`
   - Map error code to friendly message (see table below)
   - Set inline error state; do not clear the form

### Password reset

1. User clicks "Forgot password?" → `setMode("reset")`
2. User submits email → call `sendPasswordResetEmail(auth, email)`
3. On success: show the generic success message (always the same wording regardless of whether the email exists — prevents email enumeration). Disable submit briefly (3 seconds) to prevent spam clicks.
4. On failure: map error code to friendly message and show inline. `auth/user-not-found` is **not** treated as an error — show the generic success message instead, again for enumeration safety.

### Already-signed-in user visits `/auth`

The auth page subscribes to `onAuthStateChanged` once on mount. If a user is already present, immediately `router.replace(redirect ?? '/admin')`. While the subscription is resolving, the form is rendered normally (no flash-of-loader needed; the redirect happens in microseconds when a session exists).

### Error mapping

| Firebase error code           | User-facing message                         |
| ----------------------------- | ------------------------------------------- |
| `auth/invalid-credential`     | "Invalid email or password."                |
| `auth/wrong-password`         | "Invalid email or password."                |
| `auth/user-not-found`         | "Invalid email or password."                |
| `auth/invalid-email`          | "Invalid email or password."                |
| `auth/too-many-requests`      | "Too many attempts. Try again in a moment." |
| `auth/network-request-failed` | "Network error. Check your connection."     |
| (anything else)               | "Something went wrong. Please try again."   |

Note: `user-not-found` and `wrong-password` are deliberately collapsed to the same message to prevent email enumeration. Modern Firebase tends to return `auth/invalid-credential` for both anyway.

### Reset-password error mapping

| Firebase error code           | User-facing message                                          |
| ----------------------------- | ------------------------------------------------------------ |
| `auth/user-not-found`         | (silently treated as success — show the generic success message) |
| `auth/invalid-email`          | "Please enter a valid email address."                        |
| `auth/too-many-requests`      | "Too many attempts. Try again in a moment."                  |
| `auth/network-request-failed` | "Network error. Check your connection."                      |
| (anything else)               | "Something went wrong. Please try again."                    |

## AuthGuard flow

`<AuthGuard>` wraps `{children}` in `app/admin/layout.tsx`.

1. Local state: `status: "loading" | "authed" | "unauthed"`, initial `"loading"`
2. On mount, `onAuthStateChanged(auth, user => setStatus(user ? "authed" : "unauthed"))`
3. Render based on status:
   - `"loading"` → centered spinner on `bg-background`, full viewport height; no admin chrome visible
   - `"unauthed"` → `router.replace('/auth?redirect=' + encodeURIComponent(pathname))` inside an effect; render `null`
   - `"authed"` → render `{children}`
4. Cleanup: unsubscribe on unmount

`pathname` comes from `usePathname()`. `router` from `useRouter()` (`next/navigation`).

## Persistence

Firebase default — `browserLocalPersistence`. Session survives tab close and browser restart until the user signs out or the token is revoked from the Firebase console. No explicit configuration needed.

## Provisioning the admin user

Out of band: the admin user is created manually in the Firebase console (Authentication → Users → Add user). This spec assumes Email/Password sign-in is enabled in the Firebase console (Authentication → Sign-in method).

## Testing

Manual verification only (no test suite exists in the project):

- Visit `/admin` while signed out → redirects to `/auth?redirect=%2Fadmin`
- Visit `/admin/bookings` while signed out → redirects to `/auth?redirect=%2Fadmin%2Fbookings`
- Sign in with valid credentials → lands on the original `redirect` target
- Sign in with bad credentials → inline error appears, form retains email
- Click "Forgot password?" → form swaps to reset mode; click "Back to sign in" → form swaps back
- Submit reset for a real email → success message appears; check inbox for Firebase reset email
- Submit reset for a non-existent email → same success message (no enumeration leak)
- Visit `/auth` while signed in → redirects to `/admin`
- Reload `/admin/hotels` while signed in → loader briefly shows, then content renders (no redirect)
- Open-redirect attempt: `/auth?redirect=https://evil.com` → falls back to `/admin`

## Risks & open questions

- **Brief loader flash on admin pages**: acceptable for an internal tool. If it becomes annoying, upgrade to middleware + session cookie (separate spec).
- **No sign-out UI**: explicitly out of scope. `signOutUser` helper is exported from `lib/auth.ts` so a future task can wire it into the admin sidebar in one line.
- **Analytics on server**: `lib/firebase.ts` currently calls `getAnalytics(app)` at module top level, which throws on the server because `window` is undefined. We're guarding it as part of this work since `lib/auth.ts` will import from this file from a client component.
