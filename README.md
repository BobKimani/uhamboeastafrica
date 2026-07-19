# Uhambo East Africa

> **"The Breath of the Savanna"** — Tailored safaris, transport, and stays across Kenya, Tanzania, Uganda, and Rwanda.

Uhambo is a travel platform that lets visitors plan multi-leg East Africa trips through a guided multi-step wizard, browse curated destinations and experiences, submit bookings and inquiries, and manage all operations through a protected admin dashboard. It is structured as a **monorepo**: a Next.js / TypeScript **frontend** (`frontend/`) and a Python **FastAPI backend** (`backend/`). Bookings and inquiries persist to Cloud Firestore through the FastAPI service; the frontend reaches it via a same-origin `/api/*` proxy, so the browser experience is unchanged.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| UI Components | Custom component library (Lucide React icons) |
| Forms | React Hook Form + Zod |
| Authentication | [Firebase Auth](https://firebase.google.com/docs/auth) |
| Database | [Cloud Firestore](https://firebase.google.com/docs/firestore) |
| Backend | [FastAPI](https://fastapi.tiangolo.com) (Python) + `firebase-admin` |
| Backend server | `uvicorn` |
| Server validation | Pydantic (frontend forms still use Zod) |
| Frontend → backend | Next.js `rewrites()` proxy (`/api/*` → `BACKEND_API_URL`) |
| Fonts | Plus Jakarta Sans · Manrope (Google Fonts via `next/font`) |
| Theme | `next-themes` (light / dark) |
| Date utilities | `date-fns` |

---

## Project Structure

The repository is a monorepo with two top-level apps:

```
/
├── frontend/              # Next.js / TypeScript app (see detailed tree below)
├── backend/               # FastAPI (Python) service
│   ├── app/
│   │   ├── main.py            # FastAPI app + HTTPException handler + router registration
│   │   ├── config.py          # env loading (python-dotenv)
│   │   ├── firebase.py        # Admin credential init + get_db() (port of lib/firebase-admin.ts)
│   │   ├── auth.py            # Bearer-token dependency (verify_id_token)
│   │   ├── schemas.py         # Pydantic models (ported from the Zod schemas)
│   │   ├── payments/          # Server-owned pricing + KCB Buni client/callback parser
│   │   └── routers/
│   │       ├── bookings.py    # POST/GET /api/bookings, PATCH/DELETE /api/bookings/{id}
│   │       ├── inquiries.py   # POST/GET /api/inquiries, PATCH /api/inquiries/{id}
│   │       └── payments.py    # KCB Buni STK Push, callback, and payment status
│   ├── tests/                 # pytest contract tests (Firestore + auth mocked)
│   ├── requirements.txt
│   └── .env                   # FIREBASE_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY
├── docs/                  # Internal documentation (specs, plans)
└── README.md
```

### Frontend (`frontend/`)

```
frontend/
├── app/
│   ├── (public)/          # All public-facing routes (navbar + footer layout)
│   │   ├── page.tsx       # Homepage
│   │   ├── plan-trip/     # Multi-step trip wizard (7 steps)
│   │   │   ├── destination/
│   │   │   ├── dates/
│   │   │   ├── travelers/
│   │   │   ├── service/
│   │   │   ├── details/
│   │   │   ├── budget/
│   │   │   └── review/
│   │   ├── results/       # Trip estimate, pricing, and booking submission
│   │   ├── transport/     # Standalone transport booking
│   │   ├── destinations/  # Browseable destination grid
│   │   ├── experiences/   # Categorised experience listings
│   │   ├── about/
│   │   └── contact/       # Public inquiry form
│   ├── admin/             # Protected admin dashboard
│   │   ├── page.tsx       # Live metrics overview
│   │   ├── bookings/      # Bookings table with filters + status updates
│   │   ├── inquiries/     # Inquiries table with status updates
│   │   └── transport/     # Vehicle fleet manager
│   │                      # (the former app/api/* handlers now live in backend/)
│   └── auth/              # Sign-in / Sign-up / Password reset
│
├── components/
│   ├── home/              # Hero, CountryBentoGrid, ServicesSection,
│   │                      # FeaturedExperiences, TrendingScroller,
│   │                      # Testimonials, FAQSection
│   ├── layout/            # Navbar, Footer, ThemeToggle
│   ├── wizard/            # WizardShell (progress bar + step transitions)
│   ├── results/           # SummaryPanel, PricingSummary,
│   │                      # ContactDetailsCard (booking submit)
│   ├── destinations/      # DestinationCard, FilterBar
│   ├── experiences/       # ExperienceCard, CategoryTabs
│   ├── transport/         # TransportForm
│   ├── contact/           # ContactForm (inquiry submit)
│   ├── admin/             # Sidebar, Header, MobileNav, MetricCard,
│   │                      # BookingsTable, InquiriesTable,
│   │                      # TransportManager, DataTable, Modal, StatusBadge
│   ├── shared/            # SectionHeader
│   └── ui/                # Button, Input, Card, Badge, Accordion
│
├── lib/
│   ├── firebase.ts        # Firebase client app + Firestore + analytics
│   ├── firebase-admin.ts  # (legacy) Admin SDK init — superseded by backend/app/firebase.py; no longer imported
│   ├── auth.ts            # Auth helpers + useAuth hook
│   ├── api/
│   │   ├── bookings.ts    # Client helpers: submit, fetch, update status
│   │   └── inquiries.ts
│   ├── validations/
│   │   ├── booking.ts     # Zod schemas (create + status update)
│   │   └── inquiry.ts
│   ├── wizard/
│   │   ├── types.ts       # WizardState type, STEPS constant, enums
│   │   └── store.tsx      # Wizard context / state store
│   ├── pricing/
│   │   └── estimate-trip.ts  # Trip cost estimation logic
│   ├── data/              # Static seed data (hotels, vehicles, destinations,
│   │                      # experiences, countries, FAQs)
│   ├── images.ts          # Centralised image URL helpers
│   └── utils.ts           # nightsBetween, formatCurrency, formatDateRange,
│                          # formatTimestamp, cn
│
├── types/                 # Shared domain types
│   ├── booking.ts         # Booking, BookingStatus, CreateBookingInput
│   └── inquiry.ts         # Inquiry, InquiryStatus, CreateInquiryInput
│
├── docs/                  # Internal documentation
├── next.config.ts         # Remote image hosts (Unsplash)
├── tsconfig.json
└── package.json
```

---

## Key Features

### Public Site

| Page | Description |
|---|---|
| **Homepage** | Hero section, country bento grid (Kenya, Tanzania, Uganda, Rwanda), service cards, featured experiences, trending scroller, testimonials, and FAQ accordion |
| **Plan Trip** | 7-step guided wizard: Destination → Dates → Travel Group → Service Type → Details → Budget → Review |
| **Results** | Trip summary → all-in pricing estimate → contact details, submitted as a real booking to Firestore |
| **Transport** | Standalone form for direct vehicle booking (Van, Alphard, Coaster, Land Cruiser, etc.) |
| **Destinations** | Filterable grid of East Africa destinations (country filter + search) |
| **Experiences** | Tabbed experience categories: Safari, Beach, Culture, City |
| **Contact** | Inquiry form that persists to Firestore for follow-up |
| **About** | Company story |

### Admin Dashboard (`/admin`)

Protected by Firebase Auth — unauthenticated users are redirected to `/auth`. All admin endpoints verify a Firebase ID token via `firebase-admin` before returning data.

| Section | Functionality |
|---|---|
| **Overview** | Live metric cards: Total Bookings, Active Trips, Conversion Rate |
| **Bookings** | Bookings table with search, status filters, inline status updates (optimistic) |
| **Inquiries** | Inquiries table with search, status filters, inline status updates |
| **Transport** | Add, edit, delete vehicle entries with USD/KSh display switching |

---

## Trip Wizard — Step Reference

| Step | Slug | What it collects |
|---|---|---|
| 1 | `destination` | Country / destination selection |
| 2 | `dates` | Start and end date (validated, no past dates) |
| 3 | `travelers` | Group type (Solo / Couple / Family / Group) + pax count |
| 4 | `service` | Service scope: Accommodation, Transport, or Both |
| 5 | `details` | Hotel region & room type **and/or** transport route & vehicle |
| 6 | `budget` | Currency (USD / KES / EUR) + budget range |
| 7 | `review` | Full summary; continues to `/results` for submission |

---

## Bookings & Inquiries — API

All persistence flows through the **FastAPI backend** (`backend/app/routers/`), reached from the browser via the same-origin `/api/*` proxy. Public clients write through `POST`; only admins (verified by Firebase ID token) can `GET`, `PATCH`, or `DELETE`. The HTTP contract (paths, methods, status codes, and JSON shapes) is identical to the previous Next.js Route Handlers.

| Method | Route | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/bookings` | Public | Submit a booking from the Results page |
| `GET` | `/api/bookings` | Admin | List bookings, newest first |
| `PATCH` | `/api/bookings/[id]` | Admin | Update a booking's status |
| `DELETE` | `/api/bookings/[id]` | Admin | Delete a booking |
| `POST` | `/api/inquiries` | Public | Submit a contact-form inquiry |
| `GET` | `/api/inquiries` | Admin | List inquiries, newest first |
| `PATCH` | `/api/inquiries/[id]` | Admin | Update an inquiry's status |
| `POST` | `/api/payments/kcb/stk-push` | Public | Initiate the booking's server-priced KCB payment |
| `POST` | `/api/payments/kcb/callback` | KCB Buni | Receive the asynchronous STK Push result |
| `GET` | `/api/payments/kcb/status/[booking_id]` | Public | Return only payment status and receipt for UI polling |

**Validation.** Every request body is parsed through a Pydantic model (`backend/app/schemas.py`) before it touches Firestore. Public POST routes accept only user-supplied fields — `status`, `createdAt`, and `updatedAt` are set server-side. (The frontend forms still validate with the matching Zod schemas in `frontend/lib/validations/`.)

**Auth.** Admin routes read `Authorization: Bearer <id-token>`, call `verify_id_token()` on the `firebase-admin` Python SDK, and reject with 401 if missing or invalid. The browser helpers in `frontend/lib/api/*` attach the current Firebase user's ID token automatically; the proxy forwards the header unchanged.

**Firestore collections.**

| Collection | Document shape | Status values |
|---|---|---|
| `bookings` | `CreateBookingInput` + `status`, `createdAt`, `updatedAt` | `new`, `contacted`, `quoted`, `confirmed`, `cancelled`, `completed` |
| `inquiries` | `CreateInquiryInput` + `status`, `createdAt`, `updatedAt` | `new`, `read`, `replied`, `archived` |

**Firestore security rules.** Because every read and write goes through the Admin SDK (which bypasses rules), the database can be fully locked down:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.11+
- A Firebase project with Email/Password authentication **and** Cloud Firestore (Native mode) enabled
- A Firebase service-account JSON for the Admin SDK (Project settings → Service accounts → Generate new private key)

The dev setup runs **two processes**: the FastAPI backend on `:8000` and the Next.js frontend on `:3000`. The frontend proxies all `/api/*` requests to `BACKEND_API_URL` (default `http://localhost:8000`), so both must be running together.

### 1. Backend (FastAPI)

```bash
cd backend
python3 -m venv uhambo
source uhambo/bin/activate          # Windows: uhambo\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Create `backend/.env` (never commit — see [`backend/.env.example`](backend/.env.example)):

```env
# Firebase Admin SDK (server-only)
FIREBASE_PROJECT_ID=<your-project-id>
FIREBASE_CLIENT_EMAIL=<service-account@your-project.iam.gserviceaccount.com>
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"

# KCB Buni M-Pesa Express (server-only)
KCB_BASE_URL=https://uat.buni.kcbgroup.com/mm/api/request/1.0.0
KCB_ACCESS_TOKEN=<oauth-access-token>
KCB_API_KEY=<application-api-key>
KCB_USERNAME=<application-user>
KCB_PASSWORD=<application-user-password>
KCB_ROUTE_CODE=207
KCB_OPERATION=STKPush
KCB_SHARED_SHORTCODE=true
KCB_ORG_SHORTCODE=
KCB_ORG_PASSKEY=
KCB_CALLBACK_URL=https://your-public-domain.example/api/payments/kcb/callback
```

The private key **must** be wrapped in double quotes; the `\n` escape sequences are converted to real newlines at runtime.

The callback URL must be publicly reachable over HTTPS. The attached KCB contract
uses the UAT host and shared-shortcode mode by default. For production, replace
the base URL and credentials with those assigned to your KCB Buni application.
The UI keeps Paybill `522522` / account `7698390` available as a manual-payment
fallback.

Run the backend tests with `python -m pytest` from the `backend/` directory.

### 2. Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Create `frontend/.env.local` (never commit):

```env
# Firebase Web SDK (client-side, safe to expose)
NEXT_PUBLIC_FIREBASE_API_KEY=<your-api-key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<your-auth-domain>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<your-project-id>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<your-storage-bucket>
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<your-messaging-sender-id>
NEXT_PUBLIC_FIREBASE_APP_ID=<your-app-id>
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=<your-measurement-id>

# Points the /api/* proxy at the FastAPI backend
BACKEND_API_URL=http://localhost:8000
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available scripts

**Frontend** (run from `frontend/`):

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | Run ESLint |

**Backend** (run from `backend/`, venv active):

| Command | Description |
|---|---|
| `uvicorn app.main:app --reload --port 8000` | Start the API |
| `python -m pytest` | Run the contract tests |

---

## Authentication

Authentication is handled via **Firebase Auth** using email + password. The `useAuth` hook ([`frontend/lib/auth.ts`](frontend/lib/auth.ts)) exposes `signIn`, `signUp`, `signOut`, and `resetPassword`, plus reactive `user` and `loading` state. The admin layout redirects unauthenticated users to `/auth`, and the backend's admin endpoints require a verified Firebase ID token.

---

## Image Hosting

Remote images are sourced from **Unsplash** (`images.unsplash.com` and `source.unsplash.com`), permitted in `frontend/next.config.ts`.

---

## Pricing Engine

[`frontend/lib/pricing/estimate-trip.ts`](frontend/lib/pricing/estimate-trip.ts) computes a trip cost from the wizard state:

- Hotel nightly rate × number of nights (if accommodation selected)
- Vehicle daily rate × number of days (if transport selected)
- Fixed safari permits & fees: **$420**
- 10% service charge on the subtotal

Currency display respects the traveller's selected currency (USD / KES / EUR).
