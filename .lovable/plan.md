
## Goal

Fix inconsistent button placement, cramped hero areas, wrapping CTAs, and misaligned action rows across the entire platform so every page reads cleanly on mobile (≤430px), tablet (≥640px), and desktop (≥1024px).

## Root causes found

1. **Hero rows use `flex flex-wrap` without `min-w-0` / `shrink-0`** — avatar, badges, and title collide on mobile (visible on `/doctors/:id`). Same pattern is copy-pasted into pharmacy/hospital/lab/provider profiles.
2. **CTA rows use `flex flex-wrap gap-2`** with 3–5 buttons — wraps into a ragged 2+1+2 grid on narrow screens instead of a clean stack.
3. **No mobile sticky action bar** for the primary CTA (Prendre RDV / Itinéraire) — user must scroll back up.
4. **BottomNav offset inconsistent** — some pages use `pb-28`, others don't, so sticky bars overlap the tab bar.
5. **Card action grids** (`DoctorCard`, `PharmacyCard`, `HospitalCard`, `LaboratoryCard`) use `grid-cols-2` even when only one CTA is meaningful → half-width orphan buttons.
6. **Portal & Admin headers** wrap title + filter + action buttons without the grid guard, so buttons drop below and misalign.

## Slices (I'll ship them in order, one message each)

**Slice A — Shared responsive primitives**
- Add `src/components/layout/PageHero.tsx`: standardized responsive hero (avatar + title + badges + CTAs) using `grid-cols-[auto_minmax(0,1fr)]` on mobile → `flex` on `sm:`, with `min-w-0` / `shrink-0` / `truncate` baked in.
- Add `src/components/layout/ActionBar.tsx`: primary + secondary + icon actions, auto-stacks on mobile, inline on `sm:`.
- Add `src/components/layout/StickyMobileCTA.tsx`: fixed bottom bar above BottomNav (safe-area aware, `pb-[env(safe-area-inset-bottom)]`, `bottom-16 lg:hidden`).
- Normalize `AppShell` main padding to `pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-12`.

**Slice B — Public profile heroes (fixes the screenshot)**
- Refactor `doctors.$id.tsx`, `providers.$id.tsx`, and the pharmacy/hospital/lab profile pages to use `PageHero` + `ActionBar` + `StickyMobileCTA`.
- Badges wrap under the title on mobile; avatar shrinks from 112px → 80px < 400px.
- Single primary CTA is full-width on mobile, inline on tablet+.

**Slice C — Cards (list pages)**
- `DoctorCard`, `PharmacyCard`, `HospitalCard`, `LaboratoryCard`, `ProviderCard`, `PlaceCard`, `ServiceCard`: switch action row to a single primary CTA full-width on mobile with the secondary as a ghost link; keep dual-CTA only when both actions are equally important.
- Ensure 44×44 tap targets and consistent 12px card padding on mobile → 20px on desktop.

**Slice D — Portal & Admin headers**
- `PortalShell` and `AdminShell` page headers: apply the grid guard so title truncates and action buttons stay right-aligned; on mobile, action group wraps below the title on its own row, not squeezed beside it.
- Provider dashboard cards & appointment list: standardize action button widths and add sticky "New appointment" FAB on mobile.

**Slice E — Discovery/list pages & filters**
- Search bars + filter buttons on `/doctors`, `/pharmacies`, `/hospitals`, `/laboratories`, `/blood/*`: filter chip row scrolls horizontally on mobile instead of wrapping into 3 lines; search input is full-width, filter button icon-only on mobile.

**Slice F — Global polish pass**
- Sweep for `pb-28` vs `pb-24` mismatches, missing `safe-area` on fixed elements, `h-screen` → `h-dvh`, and icon-only buttons missing `aria-label`.
- Verify with Playwright at 390×764 (mobile), 820×1180 (tablet), 1440×900 (desktop) on 6 representative routes.

## Technical notes

- All changes live in `src/components/layout/*` and presentation files; no business logic, no DB, no auth changes.
- Tailwind v4 tokens only (no hardcoded colors). Uses existing shadcn Button/Badge/Avatar.
- Sticky CTA respects existing `BottomNav` height (`h-16`) + `env(safe-area-inset-bottom)`.
- Grid-guard pattern from the project's `responsive-layout-patterns` rule:
  ```
  grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3
  sm:flex sm:flex-wrap sm:items-center sm:justify-between
  ```
- No route file renames; no route tree changes.

## Deliverable this turn

Slice A (shared primitives) + Slice B (public profile heroes, including the doctor page in your screenshot). Reply "continue" after review to roll through C → F.
