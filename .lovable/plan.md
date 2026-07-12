## Context

Wave A (reviews + doctor content parity) is already shipped:
- 5-star review with optional comment, gated to citizens with a **completed** appointment (DB trigger enforced).
- Average rating + review count auto-refreshed on `providers` via trigger, shown on the public doctor profile.
- Doctors cannot edit reviews (only respond); admin moderation live at `/admin/reviews` with reports queue.
- Public doctor profile (`/doctors/$id`) already renders cover, avatar, bio, specialties, education, certifications, gallery, services, insurance, accessibility, WhatsApp, website, fees, hours, address, map, FAQ.

This plan covers **Wave B** (functional audit) and **Wave C** (mobile-first + UI polish).

## Wave B — Functional audit of the Citizen Portal

Route-by-route pass on citizen-facing surfaces. For each route: verify data loads, every button navigates or performs an action, forms validate + submit, empty/error/loading states are correct, and links resolve to real routes.

Scope (citizen side only — provider/admin portals are out of scope):

1. **Home & Shell** — `/`, `TopNav`, `BottomNav`, `Sidebar`, `GlobalSearchDialog`, `RoleSwitch`, favorites toggle, language + theme toggles.
2. **Doctors** — `/doctors`, `/doctors/search`, `/doctors/specialties`, `/doctors/specialty/$slug`, `/doctors/$id` (all tabs + share/call/directions/favorite).
3. **Booking** — `/appointments/new/$providerId` (service → slot → confirm), `/appointments`, `/appointments/calendar`, `/appointments/$id` (cancel/reschedule).
4. **Pharmacies / Hospitals / Laboratories** — list, search, map, on-duty/emergency, provider sheet CTAs.
5. **Blood** — `/blood`, `/blood/donors`, `/blood/centers`, `/blood/campaigns`, `/blood/request`, `/blood/map`, `/blood/me`, `/blood/history`, `/blood/chat/$requestId`, become-donor.
6. **Map** — `/map` filters, marker click, sheet CTAs, geolocation.
7. **Content & static** — `/content`, `/content/$slug`, `/faq`, `/about`, `/contact`, `/privacy`, `/terms`.
8. **Account** — `/profile`, `/settings`, `/notifications`, `/favorites`, `/ai-assistant`.
9. **Auth** — `/auth` (sign-in, sign-up, Google), `/reset-password`, email-verify banner.

**Method**: read each route in batches, patch real breakage (dead buttons, wrong `to=`, missing empty states, unhandled errors, RLS/permission errors from console/network). No cosmetic changes in this wave.

## Wave C — Mobile-first + UI polish

Focused, framework-wide changes (not per-route restyle):

- **Safe-area insets**: bottom nav respects `env(safe-area-inset-bottom)`; sticky headers respect `env(safe-area-inset-top)`.
- **Touch targets**: enforce ≥44px on all icon-only buttons in cards, sheets, and nav.
- **Responsive header pattern**: apply the grid + `min-w-0` + `shrink-0` rule to `PageHeader`, `DoctorCard`, provider hero, appointment cards.
- **Bottom nav**: hide on scroll-down, show on scroll-up (mobile) so it doesn't cover CTAs.
- **Sheet/Dialog**: full-height on mobile, centered on desktop; body scroll-lock; close on route change.
- **Empty/loading/error states**: unified `EmptyState` usage; consistent skeleton widths.
- **Typography scale**: single `text-*` scale (`text-xs/sm/base/lg/xl/2xl/3xl`) — remove ad-hoc sizes.
- **Icon sizing**: 14px inline, 16px buttons, 20px section headers, 24px hero — one convention.
- **Motion**: `prefers-reduced-motion` respected; framer transitions capped at 200ms.
- **Doctor card / provider card**: unify layout so `/doctors`, `/pharmacies`, `/hospitals`, `/laboratories` share the same visual rhythm.

## Delivery order

1. Wave B: shell + doctors + booking (highest-traffic paths).
2. Wave B: blood + map + pharmacies/hospitals/labs.
3. Wave B: account + content + auth.
4. Wave C: framework-wide polish in one pass.

At the end of each step I'll report exactly what was broken and what I fixed, then move on. Reply **"go"** to start, or tell me which slice to prioritize (e.g. "booking + doctors only").
