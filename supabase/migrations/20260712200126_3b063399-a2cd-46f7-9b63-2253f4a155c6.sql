
-- ============================================================================
-- Wave A: Reviews moderation + eligibility
-- ============================================================================

-- 1) Extend reviews table
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS moderation_reason text,
  ADD COLUMN IF NOT EXISTS moderated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz,
  ADD COLUMN IF NOT EXISTS report_count integer NOT NULL DEFAULT 0;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_status_check'
  ) THEN
    ALTER TABLE public.reviews
      ADD CONSTRAINT reviews_status_check
      CHECK (status IN ('pending','approved','hidden','rejected'));
  END IF;
END $$;

-- Replace uniqueness so a patient can review each visit once
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_provider_id_author_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS reviews_unique_per_visit
  ON public.reviews (provider_id, author_id, COALESCE(appointment_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_appointment ON public.reviews(appointment_id);

-- 2) Eligibility trigger — must have a completed appointment with this provider
CREATE OR REPLACE FUNCTION public.reviews_require_completed_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok boolean := false;
BEGIN
  -- Admins bypass eligibility check
  IF public.has_role(auth.uid(), 'admin') OR public.has_any_admin_role(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF NEW.appointment_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = NEW.appointment_id
        AND a.patient_id = NEW.author_id
        AND a.provider_id = NEW.provider_id
        AND a.status = 'completed'
    ) INTO v_ok;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.patient_id = NEW.author_id
        AND a.provider_id = NEW.provider_id
        AND a.status = 'completed'
    ) INTO v_ok;
  END IF;

  IF NOT v_ok THEN
    RAISE EXCEPTION 'You can only review a doctor after completing an appointment.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reviews_require_completed ON public.reviews;
CREATE TRIGGER trg_reviews_require_completed
BEFORE INSERT OR UPDATE OF rating, comment, appointment_id, provider_id ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.reviews_require_completed_appointment();

-- 3) Provider rating cache
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='providers' AND column_name='rating') THEN
    ALTER TABLE public.providers ADD COLUMN rating numeric(3,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='providers' AND column_name='review_count') THEN
    ALTER TABLE public.providers ADD COLUMN review_count integer NOT NULL DEFAULT 0;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.refresh_provider_rating(_provider uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.providers p SET
    rating = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM public.reviews WHERE provider_id = _provider AND status = 'approved'), NULL),
    review_count = COALESCE((SELECT COUNT(*) FROM public.reviews WHERE provider_id = _provider AND status = 'approved'), 0)
  WHERE p.id = _provider;
$$;

CREATE OR REPLACE FUNCTION public.tg_refresh_provider_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_provider_rating(OLD.provider_id);
    RETURN OLD;
  ELSE
    PERFORM public.refresh_provider_rating(NEW.provider_id);
    IF TG_OP = 'UPDATE' AND OLD.provider_id IS DISTINCT FROM NEW.provider_id THEN
      PERFORM public.refresh_provider_rating(OLD.provider_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_reviews_refresh_rating ON public.reviews;
CREATE TRIGGER trg_reviews_refresh_rating
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.tg_refresh_provider_rating();

-- Backfill existing ratings
UPDATE public.providers p SET
  rating = sub.avg_r,
  review_count = sub.cnt
FROM (
  SELECT provider_id, ROUND(AVG(rating)::numeric, 2) AS avg_r, COUNT(*) AS cnt
  FROM public.reviews WHERE status = 'approved' GROUP BY provider_id
) sub
WHERE p.id = sub.provider_id;

-- 4) RLS policies — rebuild
DROP POLICY IF EXISTS "reviews readable" ON public.reviews;
DROP POLICY IF EXISTS "reviews author insert" ON public.reviews;
DROP POLICY IF EXISTS "reviews author delete" ON public.reviews;
DROP POLICY IF EXISTS "reviews author or provider update" ON public.reviews;

-- Public + author read
CREATE POLICY "reviews public read approved"
  ON public.reviews FOR SELECT
  USING (status = 'approved');

CREATE POLICY "reviews author read own"
  ON public.reviews FOR SELECT
  TO authenticated
  USING (author_id = auth.uid());

CREATE POLICY "reviews admin read all"
  ON public.reviews FOR SELECT
  TO authenticated
  USING (public.has_any_admin_role(auth.uid()));

-- Insert: author only
CREATE POLICY "reviews author insert"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

-- Update: author within 30 days (edit content), or admin (moderation), or doctor updating only their response
CREATE POLICY "reviews author update recent"
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid() AND created_at > now() - interval '30 days')
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "reviews admin update"
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (public.has_any_admin_role(auth.uid()))
  WITH CHECK (public.has_any_admin_role(auth.uid()));

CREATE POLICY "reviews provider respond"
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (public.owns_provider(auth.uid(), provider_id))
  WITH CHECK (public.owns_provider(auth.uid(), provider_id));

-- Delete: author (recent) or admin
CREATE POLICY "reviews author delete recent"
  ON public.reviews FOR DELETE
  TO authenticated
  USING (author_id = auth.uid() AND created_at > now() - interval '30 days');

CREATE POLICY "reviews admin delete"
  ON public.reviews FOR DELETE
  TO authenticated
  USING (public.has_any_admin_role(auth.uid()));

-- ============================================================================
-- 5) Review reports table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.review_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','dismissed','actioned')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, reporter_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_reports TO authenticated;
GRANT ALL ON public.review_reports TO service_role;

ALTER TABLE public.review_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports self read"
  ON public.review_reports FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid() OR public.has_any_admin_role(auth.uid()));

CREATE POLICY "reports self insert"
  ON public.review_reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "reports admin update"
  ON public.review_reports FOR UPDATE
  TO authenticated
  USING (public.has_any_admin_role(auth.uid()))
  WITH CHECK (public.has_any_admin_role(auth.uid()));

CREATE POLICY "reports admin delete"
  ON public.review_reports FOR DELETE
  TO authenticated
  USING (public.has_any_admin_role(auth.uid()));

DROP TRIGGER IF EXISTS trg_review_reports_updated ON public.review_reports;
CREATE TRIGGER trg_review_reports_updated
BEFORE UPDATE ON public.review_reports
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Bump report_count on new report
CREATE OR REPLACE FUNCTION public.tg_bump_review_report_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.reviews SET report_count = report_count + 1 WHERE id = NEW.review_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_review_reports_bump ON public.review_reports;
CREATE TRIGGER trg_review_reports_bump
AFTER INSERT ON public.review_reports
FOR EACH ROW EXECUTE FUNCTION public.tg_bump_review_report_count();

-- Grant EXECUTE on new SECURITY DEFINER helpers narrowly
REVOKE ALL ON FUNCTION public.reviews_require_completed_appointment() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.tg_refresh_provider_rating() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.tg_bump_review_report_count() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refresh_provider_rating(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_provider_rating(uuid) TO service_role;
