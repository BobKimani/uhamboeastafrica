# Uhambo East Africa

> **"The Breath of the Savanna"** — Tailored safaris, transport, and stays across Kenya, Tanzania, Uganda, and Rwanda.

Uhambo is a travel platform that lets visitors plan multi-leg East Africa trips through a guided multi-step wizard, browse curated destinations and experiences, submit bookings and inquiries, pay for direct transport bookings, and manage all operations through a protected admin dashboard. It is structured as a **monorepo**: a Next.js / TypeScript **frontend** (`frontend/`) and a Python **FastAPI backend** (`backend/`). Bookings, inquiries, transport payments, hotels, and vehicles persist to AWS Aurora PostgreSQL through the FastAPI service; API traffic reaches the backend through the frontend API client and same-origin `/api/*` proxy.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| UI Components | Custom component library (Lucide React icons) |
| Forms | React Hook Form + Zod |
| Authentication | AWS Cognito Hosted UI + signed HTTP-only admin session cookies |
| Database | AWS Aurora PostgreSQL Serverless with IAM database authentication |
| Backend | [FastAPI](https://fastapi.tiangolo.com) (Python) + SQLAlchemy |
| Backend server | `uvicorn` |
| Server validation | Pydantic (frontend forms still use Zod) |
| Frontend → backend | `NEXT_PUBLIC_API_URL` client helpers + Next.js `rewrites()` proxy (`/api/*` → `BACKEND_API_URL`) |
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
│   │   ├── db/                # SQLAlchemy engine/session/models using Aurora IAM auth
│   │   ├── cognito.py         # Cognito OAuth client registration
│   │   ├── auth.py            # Signed admin-session cookie helpers
│   │   ├── schemas.py         # Pydantic models (ported from the Zod schemas)
│   │   ├── payments/          # Server-owned pricing + KCB Buni client/callback parser
│   │   └── routers/
│   │       ├── bookings.py    # POST/GET /api/bookings, PATCH/DELETE /api/bookings/{id}
│   │       ├── inquiries.py   # POST/GET /api/inquiries, PATCH /api/inquiries/{id}
│   │       ├── auth.py        # Cognito login, callback, /auth/me, logout
│   │       └── payments.py    # KCB Buni STK Push, callback, and payment status
│   ├── tests/                 # pytest contract tests
│   ├── requirements.txt
│   └── .env                   # server-only backend environment
├── docs/                  # Internal documentation (specs, plans)
└── README.md
```

### Frontend (`frontend/`)

```
frontend/
├── app/
│   ├── (public)/          # All public-facing routes (navbar + footer layout)
│   │   ├── page.tsx       # Homepage
│   │   ├── plan-trip/     # Multi-step trip wizard (4 steps)
│   │   │   ├── destination/
│   │   │   ├── basics/
│   │   │   ├── services/
│   │   │   └── review/
│   │   ├── results/       # Trip estimate, pricing, and booking request submission
│   │   ├── transport/     # Standalone transport booking with KCB payment
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
│   └── auth/              # Admin auth entry page
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
│   ├── transport/         # TransportForm, DirectTransportBooking
│   ├── payments/          # KCB payment module used by direct transport only
│   ├── contact/           # ContactForm (inquiry submit)
│   ├── admin/             # Sidebar, Header, MobileNav, MetricCard,
│   │                      # BookingsTable, InquiriesTable,
│   │                      # TransportManager, DataTable, Modal, StatusBadge
│   ├── shared/            # SectionHeader
│   └── ui/                # Button, Input, Card, Badge, Accordion
│
├── lib/
│   ├── auth.ts            # Cognito session helpers + useAuth hook
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
| **Plan Trip** | 4-step guided wizard: Destination → Basics → Services → Budget & Review |
| **Results** | Trip summary → all-in pricing estimate → contact details, submitted as a booking request to Aurora PostgreSQL. No payment module is shown here. |
| **Transport** | Standalone direct vehicle booking (Van, Alphard, Coaster, Land Cruiser, etc.) with KCB STK Push payment |
| **Destinations** | Filterable grid of East Africa destinations (country filter + search) |
| **Experiences** | Tabbed experience categories: Safari, Beach, Culture, City |
| **Contact** | Inquiry form that persists to Aurora PostgreSQL for follow-up |
| **About** | Company story |

### Admin Dashboard (`/admin`)

Protected by AWS Cognito admin login — unauthenticated users are redirected to `/auth`. The backend creates a signed HTTP-only session cookie after a successful Cognito callback, and `/auth/me` verifies that cookie before admin data is shown.

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
| 2 | `basics` | Start date, end date, group type, and pax count |
| 3 | `services` | Service scope plus accommodation and/or transport details |
| 4 | `review` | Budget range, defaulting to KSh display, plus full summary; continues to `/results` for submission |

---

## Bookings & Inquiries — API

All persistence flows through the **FastAPI backend** (`backend/app/routers/`). Public clients write through `POST`; only admins with a valid Cognito-backed session cookie can `GET`, `PATCH`, or `DELETE`.

| Method | Route | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/bookings` | Public | Submit a booking from the Results page |
| `GET` | `/api/bookings` | Admin | List bookings, newest first |
| `PATCH` | `/api/bookings/[id]` | Admin | Update a booking's status |
| `DELETE` | `/api/bookings/[id]` | Admin | Delete a booking |
| `POST` | `/api/inquiries` | Public | Submit a contact-form inquiry |
| `GET` | `/api/inquiries` | Admin | List inquiries, newest first |
| `PATCH` | `/api/inquiries/[id]` | Admin | Update an inquiry's status |
| `POST` | `/api/payments/kcb/stk-push` | Public | Initiate a direct transport booking's server-priced KCB payment |
| `POST` | `/api/payments/kcb/callback` | KCB Buni | Receive the asynchronous STK Push result |
| `GET` | `/api/payments/kcb/status/[booking_id]` | Public | Return only payment status and receipt for UI polling |

**Validation.** Every request body is parsed through a Pydantic model (`backend/app/schemas.py`) before it touches Aurora PostgreSQL. Public POST routes accept only user-supplied fields — `status`, `createdAt`, and `updatedAt` are set server-side. (The frontend forms still validate with the matching Zod schemas in `frontend/lib/validations/`.)

**Auth.** Admin pages call `/auth/me` with `credentials: "include"`. The backend reads the signed admin session cookie, confirms the user belongs to an allowed Cognito admin group, and returns 401 only when the cookie is missing, invalid, expired, or not an admin session.

**Payments.** KCB payment UI is intentionally limited to the standalone Transport page. The trip-planning Results page submits a booking request for follow-up and does not show a payment module. Direct transport bookings calculate the payable KES amount from the selected vehicle type, daily rate, number of days, and USD→KES rate; the frontend does not send a test amount override.

**Database.** The backend uses SQLAlchemy with the `postgresql+psycopg` driver. Aurora PostgreSQL access uses IAM database authentication; no permanent database password is required or stored.

---

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.11+
- An AWS Cognito user pool with a hosted UI app client
- An Aurora PostgreSQL database user configured for IAM database authentication

The dev setup runs **two processes**: the FastAPI backend on `:8000` and the Next.js frontend on `:3000`. The frontend proxies `/api/*` requests to `BACKEND_API_URL` and calls admin auth endpoints through `NEXT_PUBLIC_API_URL` (both default to `http://localhost:8000` locally), so both processes must be running together.

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
# Admin authentication (AWS Cognito)
COGNITO_CLIENT_ID=<cognito_app_client_id>
COGNITO_CLIENT_SECRET=<cognito_app_client_secret>
COGNITO_USER_POOL_ID=<cognito_user_pool_id>
COGNITO_REGION=eu-north-1
COGNITO_DOMAIN=https://<your-cognito-domain>.auth.eu-north-1.amazoncognito.com
COGNITO_METADATA_URL=https://cognito-idp.eu-north-1.amazonaws.com/<cognito_user_pool_id>/.well-known/openid-configuration
COGNITO_REDIRECT_URI=http://localhost:8000/auth/callback
COGNITO_LOGOUT_REDIRECT_URI=http://localhost:3000/auth
COGNITO_ADMIN_GROUPS=admin,admins
SESSION_SECRET=<long-random-session-secret>
SESSION_COOKIE_NAME=uhambo_admin_session
OAUTH_STATE_COOKIE_NAME=uhambo_oauth_state
SESSION_MAX_AGE_SECONDS=86400
SESSION_HTTPS_ONLY=false
FRONTEND_URL=http://localhost:3000
CORS_ALLOWED_ORIGINS=http://localhost:3000

# Aurora PostgreSQL IAM auth
DB_HOST=<aurora-writer-endpoint>
DB_PORT=5432
DB_NAME=<aurora_database_name>
DB_USER=<iam_database_user>
DB_SSLMODE=require
AWS_REGION=eu-north-1
S3_BUCKET=uhambo-s3-bucket
S3_PUBLIC_BASE_URL=https://uhambo-s3-bucket.s3.eu-north-1.amazonaws.com

# Currency conversion
DEFAULT_USD_TO_KES_RATE=129.0
CURRENCY_CACHE_SECONDS=21600

# KCB Buni M-Pesa Express (server-only)
KCB_ENVIRONMENT=sandbox
KCB_BASE_URL=https://uat.buni.kcbgroup.com/mm/api/request/1.0.0
KCB_TOKEN_URL=https://uat.buni.kcbgroup.com/token?grant_type=client_credentials
KCB_CONSUMER_KEY=<consumer_key_from_kcb>
KCB_CONSUMER_SECRET=<consumer_secret_from_kcb>
KCB_ROUTE_CODE=207
KCB_OPERATION=STKPush
KCB_SHARED_SHORTCODE=true
KCB_TILL_NUMBER=<actual_kcb_till_number>
KCB_ORG_SHORTCODE=
KCB_ACCOUNT_REFERENCE=7698390
KCB_ORG_PASSKEY=
KCB_CALLBACK_URL=https://your-public-domain.example/api/payments/kcb/callback
```

The callback URL must be publicly reachable over HTTPS. The attached KCB contract
uses the UAT host and shared-shortcode mode by default. For production, set
`KCB_ENVIRONMENT=production` and replace the token URL, base URL, credentials,
and merchant identifiers with those assigned to your KCB Buni application. The
backend refuses to start in production mode if UAT/sandbox hosts or a localhost
callback are configured.
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
# Points the /api/* proxy and browser auth/payment API calls at FastAPI
BACKEND_API_URL=http://localhost:8000
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_MEDIA_URL=https://your-distribution.cloudfront.net
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

Admin authentication is handled through **AWS Cognito Hosted UI**. The frontend auth helpers ([`frontend/lib/auth.ts`](frontend/lib/auth.ts)) send admins to `http://localhost:8000/auth/login?redirect=/admin` during local development, call `/auth/me` with `credentials: "include"`, and send logout requests to the backend.

After Cognito redirects back to `/auth/callback`, the FastAPI backend creates a signed HTTP-only session cookie (`uhambo_admin_session` by default) with local-development settings of `secure=false`, `samesite="lax"`, `path="/"`, and no `localhost` domain attribute. `/auth/me` returns the authenticated admin user only when that cookie is present, valid, unexpired, and tied to an allowed Cognito admin group.

---

## Image Hosting

Remote images are sourced from **Unsplash** (`images.unsplash.com` and `source.unsplash.com`) and the configured media/CDN host, permitted in `frontend/next.config.ts`.

---

## Pricing Engine

[`frontend/lib/pricing/estimate-trip.ts`](frontend/lib/pricing/estimate-trip.ts) computes a trip cost from the wizard state:

- Hotel nightly rate × number of nights (if accommodation selected)
- Vehicle daily rate × number of days (if transport selected)
- Fixed safari permits & fees: **$420**
- 10% service charge on the subtotal

Currency display respects the traveller's selected currency (KES / USD). The plan-trip review step starts in KSh by default.

KCB payment is not part of the plan-trip Results page. It only appears in the standalone Transport page, where the amount charged is the real transport total based on the selected vehicle type, vehicle daily rate, booking days, and the USD→KES conversion rate.
