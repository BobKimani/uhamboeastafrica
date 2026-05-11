# Uhambo East Africa

> **"The Breath of the Savanna"** — Tailored safaris, transport, and stays across Kenya, Tanzania, Uganda, and Rwanda.

Uhambo is a full-stack travel platform that lets visitors plan multi-leg East Africa trips through a guided multi-step wizard, browse curated destinations and experiences, book transport, and manage all operations through a protected admin dashboard.

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
│   │   ├── results/       # Trip recommendations & pricing
│   │   ├── transport/     # Standalone transport booking
│   │   ├── destinations/  # Browseable destination grid
│   │   ├── experiences/   # Categorised experience listings
│   │   ├── about/
│   │   └── contact/
│   ├── admin/             # Protected admin dashboard
│   │   ├── page.tsx       # Metrics overview
│   │   ├── bookings/      # Bookings table with filters
│   │   └── transport/     # Vehicle fleet manager
│   └── auth/              # Sign-in / Sign-up / Password reset
│
├── components/
│   ├── home/              # Hero, CountryBentoGrid, ServicesSection,
│   │                      # FeaturedExperiences, TrendingScroller,
│   │                      # Testimonials, FAQSection
│   ├── layout/            # Navbar, Footer, ThemeToggle
│   ├── wizard/            # WizardShell (progress bar + step transitions)
│   ├── results/           # HotelCard, VehicleCard, SummaryPanel, PricingSummary
│   ├── destinations/      # DestinationCard, FilterBar
│   ├── experiences/       # ExperienceCard, CategoryTabs
│   ├── transport/         # TransportForm
│   ├── contact/           # ContactForm
│   ├── admin/             # Sidebar, Header, MobileNav, MetricCard,
│   │                      # BookingsTable, TransportManager,
│   │                      # DataTable, Modal, StatusBadge
│   ├── shared/            # SectionHeader
│   └── ui/                # Button, Input, Card, Badge, Accordion
│
├── lib/
│   ├── firebase.ts        # Firebase app + browser analytics setup
│   ├── auth.ts            # Auth helpers + useAuth hook
│   ├── wizard/
│   │   ├── types.ts       # WizardState type, STEPS constant, enums
│   │   └── store.tsx      # Wizard context / state store
│   ├── pricing/
│   │   └── estimate-trip.ts  # Trip cost estimation logic
│   ├── data/              # Static seed data (hotels, vehicles, destinations,
│   │                      # experiences, bookings, countries, FAQs)
│   ├── images.ts          # Centralised image URL helpers
│   └── utils.ts           # nightsBetween, formatCurrency, formatDateRange, cn
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
| **Results** | Personalised hotel + vehicle recommendation cards with a live pricing summary |
| **Transport** | Standalone form for direct vehicle booking (Van, Alphard, Coaster, Land Cruiser, etc.) |
| **Destinations** | Filterable grid of East Africa destinations (country filter + search) |
| **Experiences** | Tabbed experience categories: Safari, Beach, Culture, City |
| **About / Contact** | Company story and contact form |

### Admin Dashboard (`/admin`)

Protected by Firebase Auth — unauthenticated users are redirected to `/auth`.

| Section | Functionality |
|---|---|
| **Overview** | Metric cards: Total Bookings, Revenue, Active Trips, Conversion Rate |
| **Bookings** | Full bookings table with status/date filters |
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
| 7 | `review` | Full summary before submission |

---

## Getting Started

### Prerequisites

- Node.js 20+
- A Firebase project with Email/Password authentication enabled

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root (never commit this):

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=<your-api-key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<your-auth-domain>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<your-project-id>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<your-storage-bucket>
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<your-messaging-sender-id>
NEXT_PUBLIC_FIREBASE_APP_ID=<your-app-id>
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=<your-measurement-id>
```

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

Authentication is handled via **Firebase Auth** using email + password. The `useAuth` hook (`lib/auth.ts`) exposes `signIn`, `signUp`, `signOut`, and `resetPassword`, plus reactive `user` and `loading` state. The admin layout redirects unauthenticated users to `/auth`.

---

## Image Hosting

Remote images are sourced from **Unsplash** (`images.unsplash.com` and `source.unsplash.com`), permitted in `next.config.ts`.

---

## Pricing Engine

`lib/pricing/estimate-trip.ts` computes a trip cost from the wizard state:

- Hotel nightly rate × number of nights (if accommodation selected)
- Vehicle daily rate × number of days (if transport selected)
- Fixed safari permits & fees: **$420**
- 10% service charge on the subtotal

Currency display respects the traveller's selected currency (USD / KES / EUR).
