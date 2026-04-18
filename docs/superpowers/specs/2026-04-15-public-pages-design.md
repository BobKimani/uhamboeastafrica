# Uhambo — Public Pages Design

**Date:** 2026-04-15
**Scope:** Results, Transport, Destinations, Experiences, About, Contact
**Out of scope:** Admin Dashboard, real form/booking backends, wizard validation audit, analytics, deep-link prefill into wizard

---

## Guiding principles

- **Inert CTAs.** Every "action" button (Select, Request, Explore, Learn More, Submit, Request Booking, Contact Advisor) renders as a styled `<Button>` with no `onClick` and no `href`. The user will wire these up after seeing the UI.
- **Real navigation stays real.** Links between existing pages (e.g. Results → Edit trip → wizard) remain working `<Link>`s. Homepage country cards keep their current behavior.
- **Reuse the existing design system** — `components/ui/*`, the "sunset-gradient" utility, the tokens already applied in the homepage and wizard shell. No new design language.
- **Client vs server components:** static pages (About) are server components; pages with filters/forms/wizard-store consumption are client components.
- **All pages land under `app/(public)/`** so they inherit the existing navbar + footer layout.

---

## 1. Results page — `app/(public)/results/page.tsx`

Client component. Reads wizard state via `useWizard()`.

### Hydration + empty-state guard

The store hydrates from `sessionStorage` on mount. Currently there's no exported hydration flag. Add one: extend `WizardContextValue` with `hydrated: boolean` so consumers can render skeletons until hydrated.

- While `!hydrated` → render a minimal loading shell (matches wizard shell padding) so the page doesn't flash an empty state.
- After hydration, if `state.destination` is empty → render a "Start by telling us where you're going" card with a real Link to `/plan-trip/destination`.
- Otherwise render the full results view.

### Layout

Single centered column, max-w-5xl, same padding rhythm as the wizard shell.

1. **Summary panel** (`components/results/summary-panel.tsx`)
   - Displays destination name, formatted date range, group label + pax, service type
   - "Edit trip" button → real `<Link href="/plan-trip/destination">` (real nav, not inert)

2. **Hotel recommendations** (`components/results/hotel-card.tsx`)
   - Hidden when `state.serviceType === "transport"`
   - Source: `HOTELS.filter(h => h.destination === state.destination)`; if the filter yields zero, fall back to showing all hotels (matches the existing `estimateTrip` fallback behavior so pricing and cards agree)
   - Card: image, name, region, rating, price/night, tag chips, description, inert "Select" and "Request" buttons
   - Section header: "Where you'll stay"

3. **Transport recommendations** (`components/results/vehicle-card.tsx`)
   - Hidden when `state.serviceType === "accommodation"`
   - Source: `VEHICLES.filter(v => v.capacity >= state.paxCount)`, sorted so the item whose `type === state.transport?.vehicleType` comes first
   - Card: image, name, capacity, "Best for" tag, feature chips, price/day, inert "Select" button
   - Section header: "How you'll move"

4. **Pricing summary** (`components/results/pricing-summary.tsx`)
   - Calls `estimateTrip(state)` from existing `lib/pricing/estimate-trip.ts`
   - Renders each `line` (label + amount), then subtotal, service charge, total in big type
   - Currency pulled from `state.budget.currency`

5. **Action section**
   - Two inert buttons: "Request Booking" (primary/sunset gradient), "Contact Advisor" (secondary)
   - Small helper text above: "Review your trip and we'll take it from here."

### Notes

- No selection state — per the decision to go with option C, cards are purely display.
- The pricing summary and the card lists can diverge visually (pricing uses the first match, list shows many). That's acceptable for this build.

---

## 2. Transport page — `app/(public)/transport/page.tsx`

Client component. Self-contained; does not touch the wizard store.

### Layout

Hero strip at top ("Book your ride across East Africa" + short blurb), then two-column on desktop / stacked on mobile:

- **Left/top — Transport form** (`components/transport/transport-form.tsx`)
  - Fields: `from` (text), `to` (text), `days` (number, min 1, default 3), `people` (number, min 1, default 2), `vehicleType` (select: "Any" + the distinct `type` values from `VEHICLES`)
  - Local `useState` for each field
  - No validation gating; bad inputs just produce an empty result list
  - "Search vehicles" button: scrolls to results section on click (this is UX affordance, not a dummy redirect — it's a real scroll)

- **Right/below — Results grid**
  - `VEHICLES.filter(v => v.capacity >= people)` then stable-sort so `v.type === vehicleType` (if set and not "Any") comes first
  - Each card uses the same `vehicle-card.tsx` used on Results, but with `price = pricePerDay * days` computed from form state
  - Card CTA: inert "Request" button
  - **Empty state:** if filter yields zero, render a card that reads "No vehicles fit that group size — try a larger type."

### Component decision

`vehicle-card.tsx` lives under `components/results/` as first home. Transport page imports it from there. If it gains a transport-specific variant later, lift to `components/shared/`. Accepting a `price` prop means the card is agnostic to how the caller computed it.

---

## 3. Destinations page — `app/(public)/destinations/page.tsx`

Client component for filter interactivity.

### Layout

1. **Page header**: title "Destinations" + short subtitle
2. **Filter bar** (`components/destinations/filter-bar.tsx`) — sticky under the navbar
   - Country pills: `All`, `Kenya`, `Tanzania`, `Uganda`, `Rwanda` (sourced from `COUNTRIES`); active pill uses primary/sunset styling
   - Search input: matches `name`, `region`, or any `tag` substring (case-insensitive)
3. **Results grid** (`components/destinations/destination-card.tsx`)
   - Responsive 1 / 2 / 3 columns
   - Card: image, country pill, name, region, description, tag chips, inert "Explore" button
4. **Empty state**: "No destinations match that search. Try clearing filters."

### Query param support

On mount, read `?country=<slug>` from `useSearchParams()` and set the initial active country pill. This makes the existing homepage country cards deep-link here correctly. Changing pill via UI updates the local state only (does not push URL) — simplest correct behavior.

---

## 4. Experiences page — `app/(public)/experiences/page.tsx`

Client component for category tabs.

### Layout

1. **Page header**: title "Experiences" + subtitle
2. **Category tabs** (`components/experiences/category-tabs.tsx`)
   - Tabs: `All`, `Safari`, `Beach`, `Culture`, `City`
   - Same pill styling as destinations filter, for visual consistency
3. **Results grid** (`components/experiences/experience-card.tsx`)
   - Responsive 1 / 2 / 3 columns
   - Card: image, category pill, duration, location, title, description, inert "Learn more" button
4. **Empty state**: "Nothing in this category yet."

---

## 5. About page — `app/(public)/about/page.tsx`

Server component. Content static and inline.

### Sections

1. **Hero strip**: headline + one-paragraph mission blurb over a supporting image with gradient overlay (visual language matches the homepage hero)
2. **Mission / Vision** — two-column card layout
3. **Our story** — long-form text paired with a supporting image (side-by-side on desktop, stacked on mobile)
4. **Values strip** — three items, each an icon from `lucide-react` + short label + one-line description
5. **Closing CTA band** — "Ready to explore East Africa?" with two inert buttons ("Plan my trip", "Talk to us")

### Copy draft

I'll write the copy to match the brand voice of the homepage hero ("Explore East Africa, your way"):

- **Hero blurb:** "Uhambo means 'journey' in Swahili. We build those journeys for travelers who want East Africa on their own terms — guided by people who grew up on these roads."
- **Mission:** "Make East Africa effortless to explore — without stripping away the texture that makes it worth exploring in the first place."
- **Vision:** "A continent where the traveler and the host both leave richer for the meeting."
- **Story (~150 words):** founding story emphasizing local expertise, family roots in the region, and the tension between package tourism and authentic travel — written freshly, not templated.
- **Values:** "Rooted" (local knowledge), "Honest" (transparent pricing), "Effortless" (we handle the logistics).
- **Closing band:** short, action-oriented.

Final copy will be written during implementation; the spec reserves the slots.

---

## 6. Contact page — `app/(public)/contact/page.tsx`

Client component (because the form uses local state), though there's no submit handler yet.

### Layout

Two columns on desktop, stacked on mobile:

- **Left — Contact form** (`components/contact/contact-form.tsx`)
  - Fields: Name, Email, Phone, Message (textarea)
  - Local `useState` for each field; inputs are controlled
  - Submit button is inert: no `onClick`, no `onSubmit` on the form. The form element uses `onSubmit={(e) => e.preventDefault()}` purely to prevent a browser GET navigation — that's a no-op, not a dummy redirect.
- **Right — Info panel**
  - Phone number, email, office hours, social icons (reuse icons/data from the existing footer if present; otherwise inline literals)
  - A small styled card placeholder where a map would later live (no map SDK)

---

## Shared / new components

```
components/
  results/
    summary-panel.tsx
    hotel-card.tsx
    vehicle-card.tsx       (used by Results AND Transport)
    pricing-summary.tsx
  transport/
    transport-form.tsx
  destinations/
    filter-bar.tsx
    destination-card.tsx
  experiences/
    category-tabs.tsx
    experience-card.tsx
  contact/
    contact-form.tsx
```

About page sections stay inline in `app/(public)/about/page.tsx` unless any one section grows past ~60 lines.

---

## Wizard store change

`lib/wizard/store.tsx`:
- Add `hydrated: boolean` to `WizardContextValue`
- Expose it from the provider so Results can render a loading state until the sessionStorage read completes

No change to `types.ts` or the existing step pages.

---

## Navbar verification

During implementation I'll confirm `components/layout/navbar.tsx` links point to the new routes (`/destinations`, `/experiences`, `/transport`, `/about`, `/contact`) and fix any that don't. The navbar itself is not being redesigned.

---

## Testing

No automated tests for this batch (the codebase has none to extend). Verification is manual: start `npm run dev`, walk each page, confirm:

1. Results shows correctly after completing the wizard; shows empty-state on direct nav
2. Transport form filters vehicles by capacity and sorts by selected type
3. Destinations filters by country pill and search input; `?country=kenya` deep-link works
4. Experiences tabs swap the grid contents
5. About renders without layout breakage at mobile/tablet/desktop
6. Contact form fields accept input; submit button is visibly inert
7. No TypeScript errors: `npm run typecheck` (or `next build` if no typecheck script)
8. No console errors in the browser on any page

---

## Not doing (reconfirmed)

- Admin dashboard
- Real submission for Contact or Results booking actions
- Wizard step audit / validation hardening (will fix issues opportunistically while wiring Results)
- Destinations "Explore" deep-linking into wizard
- Map embeds on Contact
- New design tokens or UI primitives beyond what `components/ui/*` already provides
