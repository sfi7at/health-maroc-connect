
-- =========================================================
-- 1) blood_donors — restrict SELECT + expose a safe view
-- =========================================================
drop policy if exists "Donors listing (authenticated)" on public.blood_donors;

create policy "Donors sensitive read"
on public.blood_donors
for select
to authenticated
using (
  id = auth.uid()
  or public.has_role(auth.uid(), 'admin')
  or public.has_any_admin_role(auth.uid())
  or exists (
    select 1
    from public.blood_request_responses r
    join public.blood_requests br on br.id = r.request_id
    where r.donor_id = public.blood_donors.id
      and r.status = 'accepted'
      and br.requester_id = auth.uid()
  )
);

create or replace view public.blood_donors_public
with (security_invoker = false, security_barrier = true) as
select
  id, first_name, last_name, blood_group, gender, city_id, province_id,
  avatar_url, is_available, status, is_verified, total_donations,
  last_donation_at, last_active_at, created_at
from public.blood_donors;

revoke all on public.blood_donors_public from public;
grant select on public.blood_donors_public to anon, authenticated;

-- =========================================================
-- 2) provider_trust_scores — hide 'factors' from the public
-- =========================================================
drop policy if exists "trust public read" on public.provider_trust_scores;

create policy "trust admin read"
on public.provider_trust_scores
for select
to authenticated
using (public.has_any_admin_role(auth.uid()));

create or replace view public.provider_trust_scores_public
with (security_invoker = false, security_barrier = true) as
select provider_id, score, level, computed_at
from public.provider_trust_scores;

revoke all on public.provider_trust_scores_public from public;
grant select on public.provider_trust_scores_public to anon, authenticated;

-- =========================================================
-- 3) SECURITY DEFINER function execution — lock down grants
-- =========================================================

-- Policy helpers: needed by RLS policies at query time.
-- Revoke PUBLIC; keep authenticated only.
revoke execute on function public.has_role(uuid, public.app_role) from public;
revoke execute on function public.has_any_admin_role(uuid) from public;
revoke execute on function public.storage_first_folder_owns_provider(text, uuid) from public;
revoke execute on function public.owns_provider(uuid, uuid) from public;

grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.has_any_admin_role(uuid) to authenticated;
grant execute on function public.storage_first_folder_owns_provider(text, uuid) to authenticated;
grant execute on function public.owns_provider(uuid, uuid) to authenticated;

-- Trigger-only helpers: no direct callers, no EXECUTE for anyone.
revoke execute on function public.refresh_provider_rating(uuid) from public, anon, authenticated;
revoke execute on function public.reviews_require_completed_appointment() from public, anon, authenticated;
revoke execute on function public.tg_bump_review_report_count() from public, anon, authenticated;
revoke execute on function public.tg_refresh_provider_rating() from public, anon, authenticated;

-- Callable RPCs already restricted to authenticated stay as-is
-- (get_my_profile, get_my_blood_request, verify_prescription, etc.).
