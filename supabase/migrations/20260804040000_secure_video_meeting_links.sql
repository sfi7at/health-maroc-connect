ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS meeting_url text,
  ADD COLUMN IF NOT EXISTS meeting_provider text,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'not_required'
    CHECK (payment_status IN ('not_required', 'pending', 'paid', 'failed', 'refunded'));

ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_meeting_url_https;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_meeting_url_https
  CHECK (meeting_url IS NULL OR meeting_url ~ '^https://');

COMMENT ON COLUMN public.appointments.meeting_url IS
  'Provider-supplied HTTPS URL for an approved remote consultation, protected by appointment RLS.';
