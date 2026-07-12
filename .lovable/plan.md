# Citizen Portal — Production Polish (3 Waves)

Scope reaffirmed. I'll ship in three waves so each is reviewable and reversible. I'll start Wave A immediately after you approve.

## Wave A — Reviews + Doctor Content Parity

**Reviews (DB-enforced)**
- Migration on `public.reviews`:
  - Add `status` (`pending` | `approved` | `rejected` | `hidden`, default `approved` for now — flip to `pending` if you want pre-moderation), `moderation_reason`, `appointment_id` (FK to `appointments`, nullable for legacy rows), `updated_at`.
  - Trigger `reviews_require_completed_appointment` on INSERT/UPDATE: rejects unless an `appointments` row exists with `patient_id = auth.uid()`, `provider_id = NEW.provider_id`, `status = 'completed'`, and (if `appointment_id` set) matches. Info-only providers → no completed appointments → no reviews possible. This is the "must have consulted" rule.
  - Unique `(provider_id, patient_id, appointment_id)` so one review per visit; edits allowed by author within 30 days, then locked.
  - RLS: public SELECT only `status='approved'`; author SELECT/UPDATE/DELETE own; admins/moderators full access via `has_any_admin_role`. Doctors have no UPDATE/DELETE on reviews (already the case; verified).
- View `provider_review_stats` (provider_id, avg_rating, review_count) over approved reviews, plus a `refresh_provider_rating()` trigger updating `providers.rating` + `providers.review_count` for fast card reads.
- Server fns in `src/lib/reviews.functions.ts`: `getProviderReviews`, `getMyReviewableAppointments`, `submitReview`, `updateMyReview`, `deleteMyReview`, `adminModerateReview`.

**Citizen surfaces**
- On `/appointments` completed tab: "Laisser un avis" CTA per eligible appointment.
- New `ReviewDialog` (1–5 stars + optional 1000-char comment, zod-validated).
- On `/doctors/$id` public profile: dedicated Reviews section — avg + count, distribution bars, paginated list, "Signaler" (report) action.

**Admin moderation**
- New route `_authenticated/admin/reviews.tsx` (gated by `has_any_admin_role`): queue of reported/pending reviews with Approve / Hide / Delete + reason, wired to audit log.

**Doctor content parity on `/doctors/$id`**
- Rewrite `src/routes/doctors.$id.tsx` to render every field the doctor manages:
  - Hero: cover image, profile picture, name, specialties badges, verification + trust level, avg rating.
  - Sections: Bio, Services + fees, Consultation types, Insurance accepted, Languages, Opening hours, Address + map, Gallery (clinic photos), Certificates (when `show_certificates` on), Contact (respecting visibility flags), Sub-specialties, Equipment.
  - Sticky booking CTA (integrated) or Directions/Call (info-only), matching the existing rule.
- Uses a single server fn `getPublicProviderProfile(idOrSlug)` that joins all safe public fields in one round-trip; realtime channel on `providers` + `provider_services` + `provider_schedules` + `reviews` so the page updates immediately after a doctor edit.

## Wave B — Functional Audit (citizen routes)

Route-by-route pass on every citizen-facing surface, fixing real breakage rather than a blind rewrite:

```text
/ (home)                     /search                 /doctors, /doctors/$id
/pharmacies, /pharmacies/*   /hospitals, /hospitals/*   /labs, /labs/*
/emergency                   /blood/*                /articles, /articles/$slug
/map                         /appointments (+ detail)   /notifications
/favorites                   /profile, /profile/edit    /settings, /settings/*
/medical (profile, docs, allergies, conditions, vaccinations)
/auth (+ callback, reset)
```

For each: buttons resolve, links go somewhere real, forms validate + submit, modals open/close/trap focus, empty states, error boundaries, loading skeletons, permission errors surfaced clearly. I'll log every fix in the response so you can spot-check.

## Wave C — Mobile-First + UI Polish

- Bottom-nav safe-area (`env(safe-area-inset-bottom)`), 44px min touch targets, thumb-reachable primary actions.
- Mobile-specific patterns: sheet-based filters instead of scaled desktop dropdowns, sticky booking bar on doctor profile, swipeable image gallery, pull-to-refresh on lists.
- Design-token sweep: replace any lingering hardcoded colors with semantic tokens; unify card, input, modal styles; verify RTL (Arabic) and dark mode across every citizen route.
- Framer Motion: consistent enter/exit on route/section changes, respect `prefers-reduced-motion`.

## Delivery order

1. Wave A migration (needs your approval to run).
2. Wave A server fns + citizen UI + admin moderation.
3. Verify with Playwright (submit review → see it on profile → moderate → hidden).
4. Wave B audit — I'll send fixes in batches so you can review as we go.
5. Wave C polish pass with before/after screenshots on mobile + desktop.

## Open decisions (default I'll take if you don't answer)

- **Moderation model**: default `approved` on submit + report-driven takedown (fast, standard). Reply "pre-moderate" to flip to `pending`-until-approved.
- **Review edit window**: 30 days after submission, then locked. Reply with a different number to change.
- **Info-only doctors**: no reviews at all (they have no completed appointments on the platform). Confirmed by your rule; leaving it as-is.

Reply **"go"** and I'll start Wave A with the migration.
