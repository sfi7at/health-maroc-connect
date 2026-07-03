## Doctor Access Module — HealthLink Maroc

Complete "Doctor Access" workflow built on top of the existing `providers`, `appointments`, `prescriptions`, and `user_roles` tables. Nothing is created from scratch when a table already covers the need — we extend and wire it end to end.

---

### 1. Database (migration)

Additions only; existing schema is preserved.

- **`app_role` enum**: add `'doctor'` value (if missing) alongside existing `admin`, `user`, etc.
- **`providers`**: add `google_maps_url text`, `clinic_logo_url text`, `prescription_header jsonb` (name, title, RPPS/INPE, address, phone, email, specialty snapshot for PDF).
- **`profiles`**: add `active_role text default 'citizen'` to persist the citizen ↔ pro toggle across sessions.
- **`prescriptions`** (already exists): confirm columns `provider_id`, `patient_name`, `patient_age`, `patient_gender`, `diagnosis`, `items jsonb`, `notes`, `prescribed_at`, `expires_at`, `pdf_url`, `verification_token`. Add any missing.
- **RPC `admin_create_doctor(payload jsonb)`** (SECURITY DEFINER, admin-gated via `has_role`):
  1. Calls `auth.admin.createUser` equivalent via service role (invoked from a server fn — the RPC just prepares the provider row).
  2. Actually: split into (a) server fn `adminCreateDoctor` that uses `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata })` + generates temp password, (b) inserts `providers` row (category `doctor`, `owner_id = new user`), (c) grants `doctor` role in `user_roles`, (d) sends invite email with credentials via `auth.admin.generateLink('invite')`.
- **GRANTs** on any new columns rely on existing table grants; no new tables needed.

### 2. Server functions (`src/lib/doctor-admin.functions.ts`, `src/lib/prescriptions.functions.ts`)

- `adminCreateDoctor` — admin-only, creates auth user + provider + role + sends invite. Returns temp credentials once.
- `adminResendDoctorInvite` — regenerates invite link.
- `createPrescription` / `updatePrescription` — doctor-owned, writes to `prescriptions`, generates `verification_token`, returns row.
- `renderPrescriptionPdf` — server fn using `pdf-lib` (Workers-safe) to compose header (logo + doctor details) + patient block + Rx items + signature + QR code (verification URL) → uploads to `prescriptions` bucket, returns signed URL.

### 3. Admin back-office

- New page `src/routes/_authenticated/admin.doctors.new.tsx`: multi-section form (Identity, Contact & clinic, Specialty & languages, Insurances, Publish options). Submits to `adminCreateDoctor`, shows generated credentials in a copyable dialog + "Send invite" button.
- `admin.providers.tsx` gets a "+ Add doctor" primary CTA linking to the new form.
- Public directory auto-updates: the provider row is created with `is_active=true`, so it appears immediately in `/doctors` search (already wired via `doctorsQuery`).

### 4. Citizen ↔ Pro toggle

- `src/hooks/use-active-role.ts`: reads `profiles.active_role`, exposes `switchRole('citizen' | 'pro')` which updates the profile and navigates.
- `TopNav.tsx` gets a `<RoleSwitch />` button — visible only when the user has the `doctor` role (`has_role` check via a cached query). One click swaps between `/` (citizen) and `/provider` (pro workspace, already exists).

### 5. Doctor dashboard (reuse + extend `/provider`)

The existing `_authenticated/provider.*` routes already cover overview, profile, gallery, hours, services, appointments, reviews, stats, notifications, verification, subscription, messages, settings. We only add:

- **Prescriptions** tab: `src/routes/_authenticated/provider.prescriptions.tsx` (list) + `provider.prescriptions.new.tsx` (composer) + `provider.prescriptions.$id.tsx` (view/print).
- **Real-time public profile sync**: `provider.profile.tsx` already writes to `providers`; add fields for `google_maps_url` and `clinic_logo_url` + upload widget. Invalidate `doctorsQuery` on save so citizen search reflects instantly.

### 6. Prescription generator UI

`ProvenerPrescriptionComposer`:
- Header preview (live) built from `providers` row + editable overrides stored in `prescription_header`.
- Patient block (name, age, gender, weight, allergies free-text).
- Repeatable Rx line items: drug name (autocomplete against a small local list to start), dosage, form, frequency, duration, notes.
- Free-text diagnosis + recommendations.
- Actions: **Save draft**, **Generate PDF** (calls `renderPrescriptionPdf`), **Download**, **Copy verification link**.
- Print layout mirrors PDF for browser print fallback.

### 7. UI structure summary

```
Admin
  /admin/providers           → "+ Add doctor"
  /admin/doctors/new         → creation form → credentials dialog

Doctor (after login)
  /                          → Citizen home (default)
  [TopNav: Switch to Pro]    → toggles active_role, routes to /provider
  /provider                  → Overview + KPIs
  /provider/appointments     → Calendar & list
  /provider/profile          → Public listing editor (logo, maps, contacts)
  /provider/prescriptions    → List + "New"
  /provider/prescriptions/new→ Composer + live PDF preview
```

### 8. Out of scope for this pass

- SMS delivery of credentials (email invite only; SMS can plug into an existing notification path later).
- E-signature / CNOM cryptographic signing.
- Drug interaction checker (composer stays free-form + autocomplete).

---

### Deliverables in this implementation

1. Migration adding the new columns, enum value, and helper function.
2. Server functions for admin doctor creation and prescription PDF generation.
3. Admin "Add doctor" form + credentials dialog.
4. Role switcher wired into `TopNav`.
5. Prescription list / composer / viewer routes under `/provider/prescriptions`.
6. Real-time public-profile sync (logo, Google Maps, contacts) reflected in `/doctors` search.