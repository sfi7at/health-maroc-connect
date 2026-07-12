CREATE OR REPLACE FUNCTION public.get_provider_booked_slots(_provider_id uuid, _from timestamptz, _to timestamptz)
RETURNS TABLE(scheduled_for timestamptz, duration_minutes integer, status public.appointment_status)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT a.scheduled_for, a.duration_minutes, a.status
  FROM public.appointments a
  WHERE a.provider_id = _provider_id
    AND a.scheduled_for >= _from
    AND a.scheduled_for <= _to
    AND a.status IN ('pending', 'approved', 'rescheduled')
  ORDER BY a.scheduled_for;
$function$;

REVOKE ALL ON FUNCTION public.get_provider_booked_slots(uuid, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_provider_booked_slots(uuid, timestamptz, timestamptz) TO authenticated;

CREATE UNIQUE INDEX IF NOT EXISTS appointments_provider_active_slot_uidx
ON public.appointments(provider_id, scheduled_for)
WHERE status IN ('pending', 'approved', 'rescheduled');