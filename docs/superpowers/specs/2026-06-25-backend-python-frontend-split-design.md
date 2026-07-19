# Backend/Frontend Split: Python API + Next.js Frontend

**Date:** 2026-06-25
**Status:** Approved (design)

## Goal

Restructure the Uhambo codebase into a monorepo with a clear backend/frontend
separation:

- **Backend** — a standalone **Python (FastAPI)** service exposing the JSON API.
- **Frontend** — the existing **Next.js / TypeScript** app, unchanged in behavior.

**Hard constraint:** user-facing functioning must not change. Same routes, same
HTTP methods, same status codes, same request/response JSON shapes, same auth,
same Firestore reads/writes.

## Scope

### In scope

Port the only server-side code that exists today — the 4 API route handlers in
`app/api/*` — to Python/FastAPI, and split the repo into `frontend/` and
`backend/` directories.

Routes being ported:

- `app/api/bookings/route.ts` → `POST` + `GET /api/bookings`
- `app/api/bookings/[id]/route.ts` → `PATCH` + `DELETE /api/bookings/{id}`
- `app/api/inquiries/route.ts` → `POST` + `GET /api/inquiries`
- `app/api/inquiries/[id]/route.ts` → `PATCH /api/inquiries/{id}`

Plus the supporting server modules they depend on:

- `lib/firebase-admin.ts` (credential init + private-key formatting)
- `lib/validations/booking.ts`, `lib/validations/inquiry.ts` (Zod → Pydantic)

### Explicitly out of scope (stays in the frontend, unchanged)

These run **client-side** today and will continue to:

- `lib/pricing/estimate-trip.ts` — pricing logic, imported by React components.
- `lib/data/*` — static reference data (destinations, hotels, vehicles, etc.),
  imported directly by components.
- `lib/api/*` — client `fetch()` wrappers (unchanged; still call `/api/*`).
- `lib/firebase.ts`, hooks, Zod schemas used for **form** validation.

Moving any of these would change how the frontend fetches/computes data and would
violate the no-behavior-change constraint.

## Target repository layout

```
Uhambo/
├── frontend/                  # entire current Next.js app, moved here
│   ├── app/                   #   (app/api/bookings and app/api/inquiries DELETED)
│   ├── components/
│   ├── lib/                   #   data, pricing, api wrappers, firebase client — untouched
│   ├── public/  types/  stitch/
│   ├── package.json  package-lock.json
│   ├── tsconfig.json  next.config.ts  next-env.d.ts
│   ├── eslint.config.mjs  postcss.config.mjs
│   └── .env.local             #   NEXT_PUBLIC_* + BACKEND_API_URL
├── backend/                   # new FastAPI service
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py            # FastAPI app, router registration
│   │   ├── config.py          # env loading
│   │   ├── firebase.py        # credential init (port of lib/firebase-admin.ts)
│   │   ├── auth.py            # Bearer-token dependency (verify_id_token)
│   │   ├── schemas.py         # Pydantic models (port of Zod schemas)
│   │   └── routers/
│   │       ├── __init__.py
│   │       ├── bookings.py
│   │       └── inquiries.py
│   ├── tests/
│   │   ├── test_bookings.py
│   │   └── test_inquiries.py
│   ├── requirements.txt
│   ├── .env                   # FIREBASE_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY
│   └── .env.example
├── docs/                      # stays at root
├── README.md                  # updated with monorepo run instructions
└── .git/  .gitignore
```

The frontend keeps working after the move because its `@/` path alias resolves
relative to `frontend/`. Configs move with the app. Only the two `app/api/*`
route directories are deleted (replaced by the proxy below).

## Connection: Next.js rewrite proxy

`frontend/next.config.ts` gains a rewrite so the browser keeps making same-origin
`/api/*` requests while Next.js forwards them to FastAPI:

```ts
async rewrites() {
  return [
    {
      source: "/api/:path*",
      destination: `${process.env.BACKEND_API_URL}/api/:path*`,
    },
  ];
}
```

- `BACKEND_API_URL` defaults to `http://localhost:8000` in development.
- The `Authorization: Bearer <token>` header is forwarded unchanged.
- No CORS configuration is needed (requests are same-origin to the browser).
- No `lib/api/*` wrapper changes — they still call `fetch("/api/...")`.

## Backend behavior parity

The FastAPI service mirrors the exact contract. FastAPI's default 422 validation
behavior is **overridden** so validation failures return the existing 400 shape.

| Method & path | Auth | Behavior | Response |
|---|---|---|---|
| `POST /api/bookings` | none | validate body → add doc `{...data, status:"new", createdAt, updatedAt}` | `201 {success:true, message:"Booking submitted successfully", id}` |
| `GET /api/bookings` | Bearer | verify token → list `bookings` ordered by `createdAt desc`, each `{id, ...data}` | `200 {success:true, bookings}` |
| `PATCH /api/bookings/{id}` | Bearer | verify → update `{status, updatedAt}` | `200 {success:true, message:"Booking status updated successfully"}` |
| `DELETE /api/bookings/{id}` | Bearer | verify → delete doc | `200 {success:true, message:"Booking deleted successfully"}` |
| `POST /api/inquiries` | none | validate → add doc `{...data, status:"new", createdAt, updatedAt}` | `201 {success:true, message:"Inquiry submitted successfully", id}` |
| `GET /api/inquiries` | Bearer | verify → list `inquiries` ordered by `createdAt desc` | `200 {success:true, inquiries}` |
| `PATCH /api/inquiries/{id}` | Bearer | verify → update `{status, updatedAt}` | `200 {success:true, message:"Inquiry status updated successfully"}` |

### Error contract (preserved exactly)

- Validation failure → `400 {success:false, error:"Invalid booking data" | "Invalid inquiry data" | "Invalid status", details:<field errors>}`
- Missing/invalid Bearer token → `401 {success:false, error:"Unauthorized"}`
- Unexpected failure → `500 {success:false, error:"Failed to <action>"}` (matching
  the current per-route message strings), with the error logged server-side.

The `details` payload is best-effort field-level errors (the current frontend
`lib/api/*` wrappers only read `error`, not `details`, so its exact internal
shape is not behavior-critical — only the top-level contract is).

## Firestore & credentials

- **SDK:** `firebase-admin` Python package.
- **Init:** `credentials.Certificate({projectId, clientEmail, privateKey})` from the
  same `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` env
  vars used today. App initialized once (cached) at startup.
- **Private key handling:** port the cleanup from `lib/firebase-admin.ts` —
  trim, strip a single trailing comma, strip wrapping quotes, expand literal `\n`
  to newlines, and assert the PEM `BEGIN PRIVATE KEY` marker — so the existing
  `.env` value works without edits.
- **Timestamps:** `FieldValue.serverTimestamp()` → `firestore.SERVER_TIMESTAMP`.
- **Auth:** `getAdminAuth().verifyIdToken(token)` → `auth.verify_id_token(token)`,
  implemented as a FastAPI dependency that extracts the Bearer token and raises a
  401 in the documented shape on failure.

## Validation mapping (Zod → Pydantic)

**Booking create** (`createBookingSchema`):

- `fullName: str` (min length 2), `email: EmailStr`, `phone: str` (min 7)
- `destination: str` (min 2)
- `travelStartDate: str` (non-empty), `travelEndDate: str` (non-empty)
- `travellingWith: Literal["solo","couple","family","group"]`
- `bookingType: Literal["accommodation","transport","both"]`
- `numberOfTravellers: int >= 1`, `numberOfRooms: int >= 0` (Pydantic coerces from
  string, matching Zod's `z.coerce.number()`)
- `minimumBudget: float >= 0`, `maximumBudget: float >= 0`
- model validators: `maximumBudget >= minimumBudget`; `travelEndDate >= travelStartDate`

**Booking status** (`updateBookingStatusSchema`): `status: Literal["new","contacted","quoted","confirmed","cancelled","completed"]`

**Inquiry create** (`createInquirySchema`): `fullName: str` (min 2), `contact: str`
(min 7), `email: EmailStr`, `message: str` (min 10)

**Inquiry status** (`updateInquiryStatusSchema`): `status: Literal["new","read","replied","archived"]`

`EmailStr` requires `pydantic[email]` (email-validator).

## Dependencies

`backend/requirements.txt`:

- `fastapi`
- `uvicorn[standard]`
- `firebase-admin`
- `pydantic[email]`
- `python-dotenv`
- `pytest`, `httpx` (test client) — dev/test

Standard `venv` for environment management.

## Testing & verification

1. **Backend unit/contract tests (`pytest`):** mock Firestore (collection/doc) and
   `verify_id_token`. Assert, per endpoint: status code, success/error JSON shape,
   that the document written includes `status:"new"` + timestamp sentinels, that
   updates set `status` + `updatedAt`, that ordering uses `createdAt desc`, and
   that missing/invalid Bearer yields the 401 shape and bad bodies yield the 400
   shape.
2. **Manual end-to-end through the proxy:** run FastAPI (`uvicorn`) + `next dev`,
   then exercise the live flows — submit a booking and an inquiry (public), log in
   as admin, list bookings/inquiries, patch a status, delete a booking — and
   confirm identical behavior to before.

## Risks & mitigations

- **Private-key env quirks across languages** — mitigated by porting the exact
  TS cleanup logic and asserting the PEM marker.
- **Validation-shape drift (FastAPI 422 vs current 400)** — mitigated by a custom
  exception handler returning the existing 400 contract.
- **Forgotten frontend dependency on a moved file** — mitigated by deleting only
  the two `app/api/*` route dirs and leaving all `lib/*` in the frontend; a
  frontend build/lint after the move confirms nothing broke.

## Out-of-scope / non-goals

- No change to pricing, static data, UI, or client data-fetching behavior.
- No new endpoints, no schema changes, no auth-model changes.
- No deployment/infra automation beyond local run instructions in the README.
