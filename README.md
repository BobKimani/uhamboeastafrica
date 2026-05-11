# Uhambo East Africa

> **"The Breath of the Savanna"** — Tailored safaris, transport, and stays across Kenya, Tanzania, Uganda, and Rwanda.

Uhambo is a full-stack travel platform that lets visitors plan multi-leg East Africa trips through a guided multi-step wizard, browse curated destinations and experiences, submit bookings and inquiries, and manage all operations through a protected admin dashboard. Bookings and inquiries persist to Cloud Firestore via Next.js Route Handlers — no separate backend service required.

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
| Backend | Next.js Route Handlers (FaaS-style) + `firebase-admin` |
| Server validation | Zod |
| Fonts | Plus Jakarta Sans · Manrope (Google Fonts via `next/font`) |
| Theme | `next-themes` (light / dark) |
| Date utilities | `date-fns` |

---

## Project Structure

```
/
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
│   ├── api/               # Serverless Route Handlers
│   │   ├── bookings/
│   │   │   ├── route.ts        # POST (public) / GET (admin)
│   │   │   └── [id]/route.ts   # PATCH (admin) — status update
│   │   └── inquiries/
│   │       ├── route.ts        # POST (public) / GET (admin)
│   │       └── [id]/route.ts   # PATCH (admin) — status update
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
│   ├── firebase-admin.ts  # Lazy Admin SDK init (server-only)
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
├── stitch/                # UI screenshot references / design tokens
├── PRD.md                 # Full product requirements document
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

All persistence flows through serverless Route Handlers under `app/api/`. Public clients write through `POST`; only admins (verified by Firebase ID token) can `GET` or `PATCH`.

| Method | Route | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/bookings` | Public | Submit a booking from the Results page |
| `GET` | `/api/bookings` | Admin | List bookings, newest first |
| `PATCH` | `/api/bookings/[id]` | Admin | Update a booking's status |
| `POST` | `/api/inquiries` | Public | Submit a contact-form inquiry |
| `GET` | `/api/inquiries` | Admin | List inquiries, newest first |
| `PATCH` | `/api/inquiries/[id]` | Admin | Update an inquiry's status |

**Validation.** Every request body is parsed through a Zod schema (`lib/validations/`) before it touches Firestore. Public POST routes accept only user-supplied fields — `status`, `createdAt`, and `updatedAt` are set server-side.

**Auth.** Admin routes read `Authorization: Bearer <id-token>`, call `verifyIdToken()` on the Admin SDK, and reject with 401 if missing or invalid. The browser helpers in `lib/api/*` attach the current Firebase user's ID token automatically.

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
- A Firebase project with Email/Password authentication **and** Cloud Firestore (Native mode) enabled
- A Firebase service-account JSON for the Admin SDK (Project settings → Service accounts → Generate new private key)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root (never commit this):

```env
# Firebase Web SDK (client-side, safe to expose)
NEXT_PUBLIC_FIREBASE_API_KEY=<your-api-key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<your-auth-domain>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<your-project-id>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<your-storage-bucket>
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<your-messaging-sender-id>
NEXT_PUBLIC_FIREBASE_APP_ID=<your-app-id>
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=<your-measurement-id>

# Firebase Admin SDK (server-only — never prefix with NEXT_PUBLIC)
FIREBASE_PROJECT_ID=<your-project-id>
FIREBASE_CLIENT_EMAIL=<service-account@your-project.iam.gserviceaccount.com>
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

The private key **must** be wrapped in double quotes; the `\n` escape sequences are converted to real newlines at runtime. A sanitised template lives in [`.env.example`](.env.example).

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | Run ESLint |

---

## Authentication

Authentication is handled via **Firebase Auth** using email + password. The `useAuth` hook ([`lib/auth.ts`](lib/auth.ts)) exposes `signIn`, `signUp`, `signOut`, and `resetPassword`, plus reactive `user` and `loading` state. The admin layout redirects unauthenticated users to `/auth`, and admin API routes require a verified Firebase ID token.

---

## Image Hosting

Remote images are sourced from **Unsplash** (`images.unsplash.com` and `source.unsplash.com`), permitted in `next.config.ts`.

---

## Pricing Engine

[`lib/pricing/estimate-trip.ts`](lib/pricing/estimate-trip.ts) computes a trip cost from the wizard state:

- Hotel nightly rate × number of nights (if accommodation selected)
- Vehicle daily rate × number of days (if transport selected)
- Fixed safari permits & fees: **$420**
- 10% service charge on the subtotal

Currency display respects the traveller's selected currency (USD / KES / EUR).
