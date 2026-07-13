
-- Undo the previous SECURITY DEFINER views and restrictive listing.
drop view if exists public.blood_donors_public;
drop view if exists public.provider_trust_scores_public;

drop policy if exists "Donors sensitive read" on public.blood_donors;
drop policy if exists "trust admin read" on public.provider_trust_scores;

-- ============================================================
-- blood_donors: permissive row-visibility, column-level lockdown
-- ============================================================

-- Permissive SELECT for signed-in users (row visibility).
create policy "Donors listing (authenticated)"
on public.blood_donors
for select
to authenticated
using (true);

-- Column-level privileges: hide sensitive PII from direct table reads.
revoke select on public.blood_donors from anon, authenticated;

grant select
  (id, first_name, last_name, blood_group, gender, city_id, province_id,
   avatar_url, is_available, status, is_verified, total_donations,
   last_donation_at, last_active_at, availability_radius_km,
   created_at, updated_at)
on public.blood_donors to authenticated;

-- Donors read their own full row through the existing SECURITY DEFINER RPC
-- public.get_my_donor_profile(); admins/requesters use dedicated RPCs.
-- Service role keeps full access for backend admin work.
grant select on public.blood_donors to service_role;

-- ============================================================
-- provider_trust_scores: hide internal 'factors' from direct reads
-- ============================================================

create policy "trust public read"
on public.provider_trust_scores
for select
to anon, authenticated
using (true);

revoke select on public.provider_trust_scores from anon, authenticated;

grant select (provider_id, score, level, computed_at)
on public.provider_trust_scores to anon, authenticated;

grant select on public.provider_trust_scores to service_role;
