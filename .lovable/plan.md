# Pharmacy Provider Portal — Full Build Plan

This is a large multi-slice feature. I'll break it into shippable slices so each one is testable. Confirm scope and I'll start with Slice 1.

## Scope summary

Bring the Pharmacy Portal to parity with the Doctor Portal, then layer a full e-commerce system: product catalog, cart, checkout, prescription upload/validation, order lifecycle, notifications, admin moderation.

## Out of scope (confirm)

- **Online payments**: I'll build checkout with `payment_method = cash_on_delivery | pay_at_pharmacy` only. Card/Stripe/Paddle is a separate enablement step — tell me if you want me to wire it now.
- **Delivery logistics / courier integration**: pickup + "delivery by pharmacy" flag only; no third-party courier.
- **Insurance reimbursement flows**.

## Data model (new tables, all RLS + GRANTs)

```text
product_categories(id, slug, name_fr, name_ar, name_en, parent_id, icon, sort)
pharmacy_products(
  id, pharmacy_id→providers, category_id, name, slug, description,
  price_mad, compare_at_price_mad, stock, is_active, is_featured,
  requires_prescription bool, dosage_form, brand, sku,
  images jsonb, metadata jsonb, avg_rating, reviews_count)
pharmacy_product_reviews(id, product_id, user_id, rating, comment, status)
pharmacy_promotions(id, pharmacy_id, product_id?, percent_off, starts_at, ends_at)
carts(id, user_id UNIQUE)
cart_items(id, cart_id, product_id, qty, unit_price_snapshot)
orders(
  id, order_number, user_id, pharmacy_id, status enum,
  subtotal, discount, total, fulfillment enum(pickup|delivery),
  delivery_address, contact_phone, notes,
  requires_prescription bool, prescription_status enum,
  created_at, updated_at)
order_items(id, order_id, product_id, name_snapshot, unit_price, qty, requires_prescription)
order_prescriptions(id, order_id, file_path, mime, uploaded_by, reviewed_by, review_status, review_notes)
order_events(id, order_id, actor_id, from_status, to_status, note)
```

Order status enum: `pending_prescription | pending_review | approved | rejected | preparing | ready_for_pickup | out_for_delivery | delivered | cancelled`.

Storage buckets: `pharmacy-products` (public read, pharmacist write for own folder), `order-prescriptions` (private, owner + pharmacy staff of that order via helper fn).

## Slices

### Slice 1 — Pharmacy Portal shell + profile parity
- New `PharmacyPortalShell` (mirrors `PortalShell` used by doctors) with nav: Dashboard, Profile, Gallery, Products, Orders, Reviews, Statistics, Settings.
- Route tree under `src/routes/_authenticated/pharmacy.*` (index, profile, gallery, hours, services, reviews, verification, statistics, settings) — reuse existing pharmacy-dashboard code, split by tab.
- Public profile route `src/routes/pharmacies.$id.tsx` upgraded to doctor-profile level: cover, logo, gallery carousel, map, hours, services, languages, emergency badge, socials, share URL, reviews. Add `slug` on providers (reuse existing slug system).

### Slice 2 — Product catalog (pharmacist side)
- Migrations for `product_categories`, `pharmacy_products`, promotions, storage bucket `pharmacy-products` + RLS.
- Routes: `pharmacy.products.index`, `pharmacy.products.new`, `pharmacy.products.$id.edit`.
- Full CRUD form: images (multi), category, description, price/compare price, stock, `requires_prescription`, featured, promo dates.
- Seed ~10 pharmacy categories.

### Slice 3 — Product browsing (citizen side)
- `pharmacies.$id.products` tab on public profile.
- Global `medicaments` already exists — add new `products.$id` public page per product with badges (OTC / Ordonnance requise), stock, price, add-to-cart, pharmacy card, reviews.
- Search + category filter across all pharmacies' products.

### Slice 4 — Cart + checkout + prescription upload
- `carts` + `cart_items` tables, `useCart` hook (auth-gated), cart drawer + `/cart` route.
- Checkout wizard: contact/address → pickup vs delivery → if any item `requires_prescription` → upload prescription (image/PDF to `order-prescriptions`) → review → confirm.
- Server fn `createOrder` (createServerFn + requireSupabaseAuth): snapshot prices, decrement stock atomically, insert order + items + prescription row, notify pharmacy.

### Slice 5 — Order management (both sides)
- Pharmacist: `pharmacy.orders.index` (kanban by status) + `pharmacy.orders.$id` (review prescription, approve/reject with note, advance status, print).
- Citizen: `orders.index` + `orders.$id` timeline + status.
- Status transitions via server fn with role check + `order_events` log.
- Push + in-app notifications on every transition (hook into existing notification dispatcher).

### Slice 6 — Reviews, stats, admin
- Product reviews (only after `delivered`).
- Pharmacist statistics: revenue, top products, low stock, order funnel.
- Admin routes: `admin.pharmacy-products` (moderate/flag), `admin.orders` (monitor), `admin.prescriptions` (spot-check).

### Slice 7 — Polish
- Real-time (`supabase_realtime` on `orders`, `cart_items`, `pharmacy_products.stock`).
- Mobile responsive audit, empty states, loading skeletons, error boundaries.
- SEO head() for product + pharmacy pages incl. JSON-LD `Product` schema.

## Technical notes

- All new `public` tables get GRANTs + RLS in the same migration.
- RLS: products readable by anon when `is_active`; writable by pharmacy owners via existing `owns_provider()`. Orders readable by buyer OR pharmacy owner. Prescriptions readable by buyer OR pharmacy owner of the linked order (helper fn).
- Storage RLS: `order-prescriptions` fully private, signed URLs only, 24h expiry.
- Stock decrement in a SECURITY DEFINER fn with row lock to prevent oversell.
- Notifications reuse existing `notifications` table + push trigger already wired.
- No changes to auth, roles, or existing doctor code.

## Delivery order

I'll ship Slice 1 first (portal shell + public profile parity) so you can see the structure, then proceed slice by slice. Each slice ends in a working, testable state.

**Confirm and I'll start with Slice 1**, or tell me to reorder / drop slices / include payments now.