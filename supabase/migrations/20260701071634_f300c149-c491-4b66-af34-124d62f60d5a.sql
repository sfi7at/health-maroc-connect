
DROP POLICY IF EXISTS metrics_insert_scoped ON public.api_metrics;
CREATE POLICY metrics_insert_scoped ON public.api_metrics
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS errors_insert_scoped ON public.error_reports;
CREATE POLICY errors_insert_scoped ON public.error_reports
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

GRANT INSERT ON public.api_metrics TO anon;
GRANT INSERT ON public.error_reports TO anon;
