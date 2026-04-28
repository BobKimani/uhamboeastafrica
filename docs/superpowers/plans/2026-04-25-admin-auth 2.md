# Admin Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Firebase email/password sign-in at `/auth` (with inline password reset) and gate the existing `/admin` area so unauthenticated visitors are redirected to `/auth?redirect=<path>` and bounced back on success.

**Architecture:** Client-side guard using Firebase Auth's `onAuthStateChanged`. A small `<AuthGuard>` wraps `app/admin/layout.tsx` children — it shows a loader while resolving, redirects to `/auth` if no user, otherwise renders the admin content. The `/auth` page is a split-screen client component that calls `signInWithEmailAndPassword` (or `sendPasswordResetEmail` in reset mode) and `router.replace`s to the admin target on success.

**Tech Stack:** Next.js 16 App Router, React 19, Firebase 12 (`firebase/auth`), Tailwind v4, existing UI primitives (`Button`, `Input`, `Label`), `lucide-react` for icons.

**Spec:** [`docs/superpowers/specs/2026-04-25-admin-auth-design.md`](../specs/2026-04-25-admin-auth-design.md)

**Note on testing:** This project has no test framework. Each task ends with explicit manual verification steps (run dev server, navigate, observe). Do not skip them — they are the equivalent of running tests.

---

## File map

**New files:**
- `lib/auth.ts` — Firebase Auth wrapper: exports `auth` instance + helpers `signIn`, `signOutUser`, `sendResetEmail`, `onAuthChange`
- `components/auth/auth-guard.tsx` — Client component gating children behind a Firebase user
- `app/auth/layout.tsx` — Minimal layout for the auth route (no admin chrome, no public header)
- `app/auth/page.tsx` — Server component that renders a `<Suspense>` boundary around the client form
- `app/auth/auth-form.tsx` — `"use client"` form with sign-in / reset-password modes

**Modified files:**
- `lib/firebase.ts` — Export `app`; guard `getAnalytics` so it only runs in the browser
- `app/admin/layout.tsx` — Wrap `{children}` in `<AuthGuard>`

---

## Task 1: Fix `lib/firebase.ts` (export `app`, guard analytics)

**Why:** `lib/auth.ts` (next task) needs `app`. Also, `getAnalytics(app)` currently runs at module top level — it throws on the server because `window` is undefined, and it breaks any server component that transitively imports this module.

**Files:**
- Modify: `lib/firebase.ts`

- [ ] **Step 1: Replace the file contents**

```ts
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export let analytics: Analytics | null = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) analytics = getAnalytics(app);
  });
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `lib/firebase.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/firebase.ts
git commit -m "fix(firebase): export app and gate analytics to browser"
```

---

## Task 2: Create `lib/auth.ts`

**Why:** Single import surface for everything the UI needs from Firebase Auth, plus a typed `friendlyAuthError` helper that maps Firebase error codes to user-facing strings (used by both sign-in and reset paths).

**Files:**
- Create: `lib/auth.ts`

- [ ] **Step 1: Write the file**

```ts
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  type User,
  type Auth,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { app } from "@/lib/firebase";

export const auth: Auth = getAuth(app);

export function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function signOutUser() {
  return signOut(auth);
}

export function sendResetEmail(email: string) {
  return sendPasswordResetEmail(auth, email);
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export function friendlySignInError(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
      case "auth/invalid-email":
        return "Invalid email or password.";
      case "auth/too-many-requests":
        return "Too many attempts. Try again in a moment.";
      case "auth/network-request-failed":
        return "Network error. Check your connection.";
    }
  }
  return "Something went wrong. Please try again.";
}

export function friendlyResetError(error: unknown): string | null {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/user-not-found":
        return null; // treat as success — enumeration safety
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/too-many-requests":
        return "Too many attempts. Try again in a moment.";
      case "auth/network-request-failed":
        return "Network error. Check your connection.";
    }
  }
  return "Something went wrong. Please try again.";
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `lib/auth.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/auth.ts
git commit -m "feat(auth): add Firebase auth wrapper with friendly error mapping"
```

---

## Task 3: Create `components/auth/auth-guard.tsx`

**Why:** Reusable client wrapper that we'll drop into `app/admin/layout.tsx`. Subscribes to auth state, shows a loader while resolving, redirects on no-user, renders children when authed.

**Files:**
- Create: `components/auth/auth-guard.tsx`

- [ ] **Step 1: Write the file**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { onAuthChange } from "@/lib/auth";

type Status = "loading" | "authed" | "unauthed";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setStatus(user ? "authed" : "unauthed");
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (status === "unauthed") {
      router.replace(`/auth?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [status, router, pathname]);

  if (status === "loading") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-on-surface-variant" />
      </div>
    );
  }

  if (status === "unauthed") return null;

  return <>{children}</>;
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `components/auth/auth-guard.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/auth/auth-guard.tsx
git commit -m "feat(auth): add AuthGuard client component"
```

---

## Task 4: Create `app/auth/layout.tsx` and `app/auth/page.tsx`

**Why:** The `/auth` route needs its own layout (no admin sidebar, no public header). The page itself is a server component that wraps the client form in `<Suspense>` — required by Next.js 16 because the form uses `useSearchParams`.

**Files:**
- Create: `app/auth/layout.tsx`
- Create: `app/auth/page.tsx`

- [ ] **Step 1: Write `app/auth/layout.tsx`**

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in — Uhambo Admin",
  description: "Authorised personnel only.",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
```

- [ ] **Step 2: Write `app/auth/page.tsx`**

```tsx
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AuthForm } from "./auth-form";

function AuthFallback() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-on-surface-variant" />
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthFallback />}>
      <AuthForm />
    </Suspense>
  );
}
```

- [ ] **Step 3: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: an error about `./auth-form` not existing — that's fine, we create it next. No other errors.

- [ ] **Step 4: Commit**

```bash
git add app/auth/layout.tsx app/auth/page.tsx
git commit -m "feat(auth): scaffold /auth route with Suspense boundary"
```

---

## Task 5: Create `app/auth/auth-form.tsx` (the split-screen form)

**Why:** The actual UI — split-screen layout, sign-in mode, reset-password mode, error/success messaging, loading state, redirect on success, redirect-when-already-signed-in.

**Files:**
- Create: `app/auth/auth-form.tsx`

- [ ] **Step 1: Write the file**

```tsx
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import {
  signIn,
  sendResetEmail,
  onAuthChange,
  friendlySignInError,
  friendlyResetError,
} from "@/lib/auth";

type Mode = "signIn" | "reset";

const RESET_SUCCESS_MESSAGE = "If that email exists, a reset link is on its way.";

function safeRedirect(target: string | null): string {
  if (target && target.startsWith("/admin")) return target;
  return "/admin";
}

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = safeRedirect(searchParams.get("redirect"));

  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      if (user) router.replace(redirectTarget);
    });
    return unsubscribe;
  }, [router, redirectTarget]);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setResetSuccess(false);
  }

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await signIn(email, password);
      router.replace(redirectTarget);
    } catch (err) {
      setError(friendlySignInError(err));
      setPending(false);
    }
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResetSuccess(false);
    setPending(true);
    try {
      await sendResetEmail(email);
      setResetSuccess(true);
    } catch (err) {
      const friendly = friendlyResetError(err);
      if (friendly === null) {
        setResetSuccess(true); // enumeration safety
      } else {
        setError(friendly);
      }
    }
    setTimeout(() => setPending(false), 3000);
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="relative h-[220px] lg:h-auto">
        <Image
          src="/assets/serengeti.jpg"
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
        <div className="absolute top-6 left-6 lg:top-10 lg:left-10">
          <span className="font-display text-2xl lg:text-3xl text-white tracking-tight">
            Uhambo
          </span>
        </div>
        <div className="hidden lg:block absolute bottom-10 left-10 right-10">
          <p className="font-display italic text-white/80 text-lg">
            The breath of the savanna.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12 lg:py-0">
        <div className="w-full max-w-[400px]">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">
            Admin
          </p>

          {mode === "signIn" ? (
            <SignInView
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              error={error}
              pending={pending}
              onSubmit={handleSignIn}
              onForgot={() => switchMode("reset")}
            />
          ) : (
            <ResetView
              email={email}
              setEmail={setEmail}
              error={error}
              success={resetSuccess}
              pending={pending}
              onSubmit={handleReset}
              onBack={() => switchMode("signIn")}
            />
          )}

          <p className="mt-10 text-center text-xs text-on-surface-variant">
            Authorised personnel only.
          </p>
        </div>
      </div>
    </div>
  );
}

function SignInView(props: {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  error: string | null;
  pending: boolean;
  onSubmit: (e: FormEvent) => void;
  onForgot: () => void;
}) {
  return (
    <>
      <h1 className="font-display text-3xl text-on-surface mb-2">Welcome back.</h1>
      <p className="text-sm text-on-surface-variant mb-8">
        Sign in to manage Uhambo.
      </p>

      <form onSubmit={props.onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={props.email}
            onChange={(e) => props.setEmail(e.target.value)}
            disabled={props.pending}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <button
              type="button"
              onClick={props.onForgot}
              className="text-xs text-on-surface-variant hover:text-primary transition-colors"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={props.showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={props.password}
              onChange={(e) => props.setPassword(e.target.value)}
              disabled={props.pending}
              className="pr-12"
            />
            <button
              type="button"
              onClick={() => props.setShowPassword(!props.showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
              aria-label={props.showPassword ? "Hide password" : "Show password"}
            >
              {props.showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="min-h-[20px]">
          {props.error && (
            <p className="text-sm text-red-500" role="alert">
              {props.error}
            </p>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={props.pending}
        >
          {props.pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </>
  );
}

function ResetView(props: {
  email: string;
  setEmail: (v: string) => void;
  error: string | null;
  success: boolean;
  pending: boolean;
  onSubmit: (e: FormEvent) => void;
  onBack: () => void;
}) {
  return (
    <>
      <h1 className="font-display text-3xl text-on-surface mb-2">Reset your password.</h1>
      <p className="text-sm text-on-surface-variant mb-8">
        We&apos;ll email you a reset link.
      </p>

      <form onSubmit={props.onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="reset-email">Email</Label>
          <Input
            id="reset-email"
            type="email"
            required
            autoComplete="email"
            value={props.email}
            onChange={(e) => props.setEmail(e.target.value)}
            disabled={props.pending}
          />
        </div>

        <div className="min-h-[20px]">
          {props.error && (
            <p className="text-sm text-red-500" role="alert">
              {props.error}
            </p>
          )}
          {props.success && (
            <p className="text-sm text-on-surface-variant">{RESET_SUCCESS_MESSAGE}</p>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={props.pending}
        >
          {props.pending ? "Sending…" : "Send reset link"}
        </Button>

        <button
          type="button"
          onClick={props.onBack}
          className="block w-full text-center text-sm text-on-surface-variant hover:text-primary transition-colors"
        >
          Back to sign in
        </button>
      </form>
    </>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/auth/auth-form.tsx
git commit -m "feat(auth): add split-screen sign-in form with reset mode"
```

---

## Task 6: Wrap admin layout in `<AuthGuard>`

**Why:** This is the gate. Once this lands, every `/admin/*` route requires a Firebase user.

**Files:**
- Modify: `app/admin/layout.tsx`

- [ ] **Step 1: Update `app/admin/layout.tsx`**

Replace the entire file with:

```tsx
import type { Metadata } from "next";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AuthGuard } from "@/components/auth/auth-guard";

export const metadata: Metadata = {
  title: "Uhambo Admin",
  description: "Operator dashboard for Uhambo East Africa.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <AdminSidebar />
        <div className="lg:pl-64 flex flex-col min-h-screen">{children}</div>
      </div>
    </AuthGuard>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/admin/layout.tsx
git commit -m "feat(admin): gate admin routes behind AuthGuard"
```

---

## Task 7: Manual verification

**Why:** No test framework — these checks are how we know the feature works.

**Prerequisites (one-time setup, not part of this codebase):**
- In the Firebase console for this project: Authentication → Sign-in method → enable "Email/Password"
- Authentication → Users → Add user with a known email + password (this is the admin account)
- Confirm `.env.local` has `NEXT_PUBLIC_FIREBASE_*` set

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: server starts on `http://localhost:3000`, no compile errors.

- [ ] **Step 2: Visit `/admin` while signed out**

Open: `http://localhost:3000/admin` in a private window.
Expected: brief loader, then redirected to `http://localhost:3000/auth?redirect=%2Fadmin`. The split-screen form is visible.

- [ ] **Step 3: Visit a deeper admin route while signed out**

Open: `http://localhost:3000/admin/bookings` in a private window.
Expected: redirected to `http://localhost:3000/auth?redirect=%2Fadmin%2Fbookings`.

- [ ] **Step 4: Submit bad credentials**

In the form, enter `wrong@example.com` / `wrongpassword` and click "Sign in".
Expected: button shows "Signing in…" briefly, then inline red error "Invalid email or password." appears. Email and password fields are not cleared.

- [ ] **Step 5: Submit valid credentials**

Enter the admin account credentials and click "Sign in".
Expected: button shows "Signing in…", then redirected to `/admin/bookings` (the original target). Admin sidebar visible, content renders.

- [ ] **Step 6: Reload an admin page while signed in**

Reload `/admin/bookings`.
Expected: brief loader, then content renders. No redirect.

- [ ] **Step 7: Visit `/auth` while signed in**

Open: `http://localhost:3000/auth`.
Expected: form may flash for a moment, then redirected to `/admin`.

- [ ] **Step 8: Open-redirect safety**

Open: `http://localhost:3000/auth?redirect=https://evil.com`.
Sign in.
Expected: redirected to `/admin` (not to `evil.com`).

- [ ] **Step 9: Password reset — happy path**

Sign out (clear browser storage or use a private window), visit `/auth`, click "Forgot password?".
Expected: form swaps to reset view in place. Image, eyebrow, footer unchanged. Heading is "Reset your password.".

Enter the admin email, click "Send reset link".
Expected: button shows "Sending…", then success message "If that email exists, a reset link is on its way." appears. Check the inbox — Firebase reset email should arrive.

- [ ] **Step 10: Password reset — enumeration safety**

Click "Back to sign in", then "Forgot password?" again. Enter `nobody@example.com` and click "Send reset link".
Expected: same success message — no error revealing whether the email exists.

- [ ] **Step 11: Show/hide password toggle**

In sign-in mode, type a password and click the eye icon.
Expected: password becomes visible. Click again, becomes hidden.

- [ ] **Step 12: Mobile layout**

Resize browser to ~390px wide (or use device emulation).
Expected: image becomes a hero band on top (~220px), form below, both fit without horizontal scroll.

- [ ] **Step 13: Final commit if any verification fixes were needed**

If any step above required code changes, commit them with a clear message.

---

## Self-review notes

- ✅ **Spec coverage:** sign-in flow (Task 5), reset flow (Task 5), AuthGuard (Task 3), open-redirect protection (`safeRedirect` in Task 5), enumeration safety (sign-in error mapping in Task 2, reset null-return in Task 2, sign-in error verification in Step 4, reset enumeration verification in Step 10), already-signed-in redirect (effect in Task 5), Suspense around `useSearchParams` (Task 4).
- ✅ **Placeholder scan:** no TODOs/TBDs; all code is complete and runnable.
- ✅ **Type consistency:** `Mode`, `Status`, helper signatures all consistent across tasks. `friendlySignInError` returns `string`, `friendlyResetError` returns `string | null` — the `null` case is handled in `handleReset` and documented inline.
- ✅ **Sign-out:** `signOutUser` is exported from `lib/auth.ts` per spec; wiring it into the sidebar is explicitly out of scope.
