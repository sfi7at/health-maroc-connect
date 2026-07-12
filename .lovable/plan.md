# Doctor Portal — Redesign & Functional Audit

The Doctor Portal today spans ~15 routes under `_authenticated/provider.*` plus `doctor-dashboard.tsx`. Layout, navigation, and several actions are inconsistent. This plan redesigns the shell, then audits and repairs each surface in prioritized waves so you can validate progressively.

## 1. New Doctor Portal Shell (design system)

Rebuild `provider.tsx` as a dedicated portal layout — separate from the citizen `AppShell` — with a consistent design language across every provider page.

Desktop:
- Collapsible left sidebar (shadcn `Sidebar`, `collapsible="icon"`) with grouped sections: **Aujourd'hui**, **Cabinet**, **Patients**, **Contenu**, **Compte**.
- Sticky top bar: breadcrumbs, global search (patients + appointments), quick "Nouveau" menu (RDV, ordonnance, message), notifications bell, role switcher, avatar.
- Right-hand context panel on wide screens (next appointment, unread messages count).

Mobile:
- Bottom nav (5 icons: Agenda, RDV, Patients, Msgs, Plus) — thumb-reachable, 44px targets.
- Sticky top: page title + contextual action button.
- Slide-over drawer for secondary nav ("Plus" → Profil, Ordonnances, Stats, Vérification, Abonnement, Paramètres).
- Sheet-based forms instead of full-page modals.

Design tokens:
- Introduce a `doctor` semantic scope in `styles.css` (surface, accent, muted, ring) so provider pages have a distinct but on-brand identity vs the citizen app.
- Standardized components: `PortalPage`, `PortalHeader`, `PortalSection`, `PortalStat`, `PortalEmpty`, `PortalActionBar`.

## 2. Functional Audit — Route-by-Route

Each row = a route I'll fix in place. Marked severity based on quick scan.

| Route | Focus | Severity |
| --- | --- | --- |
| `provider.index` | Overview: today's RDV, next patient, alerts, quick actions | high |
| `provider.appointments` | List/filter/status transitions, approve/reject/reschedule, patient sheet | high |
| `provider-calendar` + `appointments.calendar` | Merge into one calendar view with week/day, drag-reschedule, blocked dates | high |
| `provider.hours` | Weekly schedule editor + blocked dates CRUD, live validation | high |
| `provider.services` | Consultation types CRUD, price/duration, active toggle | high |
| `provider.profile` | Identity, specialties, insurance, gallery cover, slug, map picker | high |
| `provider.gallery` | Upload/reorder/delete via `providers` bucket | medium |
| `provider.prescriptions` (list/new/$id) | Create → PDF, sign, share link, revoke, search | high |
| `provider.messages` | Threads with patients (uses blood_chat pattern extended to `appointment_chat`) | medium |
| `provider.reviews` | Read + reply + report | medium |
| `provider.notifications` | List + preferences | medium |
| `provider.statistics` | KPIs (RDV/week, revenue est., no-show %, ratings trend) | medium |
| `provider.verification` | Doc upload, status timeline | medium |
| `provider.subscription` | Current plan, invoices, upgrade CTA (Stripe stub if not enabled) | low |
| `provider.settings` | Notifications, calendar sync (ICS export), delete account | medium |

For each route the audit covers:
- Data fetch shape (TanStack Query keys, `requireSupabaseAuth` where user-scoped).
- RLS grants on the underlying tables (verify SELECT/INSERT/UPDATE for `authenticated`).
- All CTAs wired (no dead buttons); confirmations for destructive ops.
- Optimistic updates + invalidation on mutations.
- Realtime channel per relevant table (appointments, notifications, messages) with unique channel name per mount.
- Empty / loading / error states.
- Mobile layout with `grid-cols-[minmax(0,1fr)_auto]` header pattern; no horizontal overflow.
- Keyboard & a11y (focus rings, aria-labels, dialog focus trap already via shadcn).

## 3. Backend & Security

- Add missing tables/columns discovered during audit (likely: `appointment_messages`, `provider_documents` if not covering verification, `provider_preferences`).
- Verify every provider-scoped table has an `owner_id`/`provider_id` RLS policy using `owns_provider(auth.uid(), provider_id)` and matching `authenticated` grants.
- Ensure realtime is enabled on `appointments`, `notifications`, `appointment_messages`.
- Server functions (in `src/lib/*.functions.ts`) for: bulk status updates, prescription sign+PDF, ICS export, stats aggregation. All guarded by `requireSupabaseAuth` + `owns_provider` check.

## 4. Delivery waves

I'll ship in 4 approvable waves so you can validate as we go:

1. **Shell + navigation** — new `provider.tsx` layout, sidebar, mobile bottom nav, tokens, breadcrumbs, global search. Every existing route rendered inside it unchanged.
2. **Core workflow** — `index`, `appointments`, unified `calendar`, `hours`, `services`. Fix RLS/grants, realtime, all CTAs.
3. **Patient-facing artifacts** — `profile` (with map picker + slug + gallery), `prescriptions` (create/sign/PDF/verify), `messages`.
4. **Insights & account** — `statistics`, `reviews`, `notifications`, `verification`, `subscription`, `settings`.

After each wave I'll run a Playwright smoke pass (login as a provider seed account, click through every CTA, screenshot) and hand back results.

## Out of scope (unless you say otherwise)

- Paid integrations (real Stripe billing, SMS reminders, WhatsApp).
- Native app packaging beyond the existing PWA.
- AI-generated content in prescriptions/notes.

## Confirm to proceed

Reply **"go"** to start Wave 1 (shell + navigation). If you'd rather reorder waves, or skip any route in the table, tell me which and I'll adjust.
