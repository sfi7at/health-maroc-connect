# Doctor booking — integrated vs info-only

## Diagnosis

- Only 2 of 17 doctor/dentist providers have `owner_id` set. The rest are info-only listings that should not accept bookings.
- Today the `/doctors/$id` page always shows **"Prendre RDV"**, which links to `/appointments/book/$providerId` and inserts an `appointments` row regardless of whether the provider is truly integrated.
- Appointment RLS allows any authenticated patient to insert against any `provider_id` (fine), but inserts against info-only providers create orphan bookings no one will ever answer — that's the "booking doesn't work" symptom.
- Two overlapping booking routes exist: `appointments.book.$providerId.tsx` and `appointments.new.$providerId.tsx`. Only the first is linked from the doctor profile; the second is dead code and confuses the flow.

## Definition of "integrated"

A provider is bookable when **all** of:
- `category in ('doctor','dentist')`
- `owner_id is not null` (a real user account owns the profile)
- `is_active = true`
- `verification_status <> 'suspended'`

Everything else is **info-only**: show a Directions CTA instead of Book.

Expose this as a single helper `isBookable(provider)` in `src/lib/doctors.ts` so every surface uses the same rule.

## Changes

### 1. Shared helper — `src/lib/doctors.ts`
- Add `isBookable(p)` and `directionsUrl(p)` (prefer `google_maps_url`, fall back to `https://www.google.com/maps/search/?api=1&query=<lat>,<lng>` or to an address search).

### 2. Doctor profile — `src/routes/doctors.$id.tsx`
- Replace the hardcoded "Prendre RDV" button with a conditional:
  - `isBookable(doctor)` → keep the current Link to `/appointments/book/$providerId`.
  - Otherwise → render an anchor "Itinéraire" opening `directionsUrl(doctor)` in a new tab, plus a subtle note "Ce cabinet n'accepte pas encore la prise de RDV en ligne."
- Apply the same swap to any sticky mobile CTA on the page.

### 3. Doctor card — `src/components/doctors/DoctorCard.tsx` (and `src/components/cards/DoctorCard.tsx`)
- Same conditional: "Prendre RDV" for integrated, "Itinéraire" for info-only. Keeps list views honest.

### 4. Booking route hardening — `src/routes/_authenticated/appointments.book.$providerId.tsx`
- On load, if `!isBookable(doctor)`, render a friendly empty state ("Ce médecin n'est pas encore intégré à la prise de RDV en ligne") with a Directions button and a link back to the profile — no form.
- In the `create` mutation, before insert, refetch the provider and reject if not bookable, so a stale link can't create an orphan appointment.
- Improve error surfacing: show the Supabase error message in the toast (currently generic) so future RLS/constraint failures are visible.

### 5. Remove dead route
- Delete `src/routes/_authenticated/appointments.new.$providerId.tsx` (unused, duplicates `.book.`) to avoid two divergent booking flows.

### 6. Verification
- Manually verify against the currently viewed doctor (`fee82afb-…`, owner set): Book button shows and insert succeeds.
- Pick one info-only doctor (owner null) and confirm: Directions button shows, `/appointments/book/<id>` displays the blocked state.
- `tsgo` typecheck.

## Out of scope
- No schema change. `owner_id` is already the source of truth; no new `is_integrated` column needed.
- No changes to appointment RLS or notifications.
