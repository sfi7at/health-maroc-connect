
ALTER TYPE public.appointment_status ADD VALUE IF NOT EXISTS 'rescheduled';

CREATE TABLE IF NOT EXISTS public.provider_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  duration_minutes int NOT NULL DEFAULT 30 CHECK (duration_minutes BETWEEN 5 AND 480),
  price_mad numeric(10,2),
  preparation text,
  category text,
  is_active boolean NOT NULL DEFAULT true,
  is_online_eligible boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS provider_services_provider_idx ON public.provider_services(provider_id) WHERE is_active;
GRANT SELECT ON public.provider_services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_services TO authenticated;
GRANT ALL ON public.provider_services TO service_role;
ALTER TABLE public.provider_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY ps_public_read ON public.provider_services FOR SELECT USING (true);
CREATE POLICY ps_owner_insert ON public.provider_services FOR INSERT TO authenticated WITH CHECK (public.owns_provider(auth.uid(), provider_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY ps_owner_update ON public.provider_services FOR UPDATE TO authenticated USING (public.owns_provider(auth.uid(), provider_id) OR public.has_role(auth.uid(),'admin')) WITH CHECK (public.owns_provider(auth.uid(), provider_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY ps_owner_delete ON public.provider_services FOR DELETE TO authenticated USING (public.owns_provider(auth.uid(), provider_id) OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER provider_services_set_updated BEFORE UPDATE ON public.provider_services FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.provider_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  slot_minutes int NOT NULL DEFAULT 30 CHECK (slot_minutes BETWEEN 5 AND 240),
  break_start time,
  break_end time,
  max_per_day int,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);
CREATE INDEX IF NOT EXISTS provider_schedules_provider_weekday_idx ON public.provider_schedules(provider_id, weekday);
GRANT SELECT ON public.provider_schedules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_schedules TO authenticated;
GRANT ALL ON public.provider_schedules TO service_role;
ALTER TABLE public.provider_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY psched_public_read ON public.provider_schedules FOR SELECT USING (true);
CREATE POLICY psched_owner_write ON public.provider_schedules FOR ALL TO authenticated
  USING (public.owns_provider(auth.uid(), provider_id) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.owns_provider(auth.uid(), provider_id) OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER provider_schedules_set_updated BEFORE UPDATE ON public.provider_schedules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.provider_blocked_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_at > start_at)
);
CREATE INDEX IF NOT EXISTS provider_blocked_dates_idx ON public.provider_blocked_dates(provider_id, start_at);
GRANT SELECT ON public.provider_blocked_dates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_blocked_dates TO authenticated;
GRANT ALL ON public.provider_blocked_dates TO service_role;
ALTER TABLE public.provider_blocked_dates ENABLE ROW LEVEL SECURITY;
CREATE POLICY pbd_public_read ON public.provider_blocked_dates FOR SELECT USING (true);
CREATE POLICY pbd_owner_write ON public.provider_blocked_dates FOR ALL TO authenticated
  USING (public.owns_provider(auth.uid(), provider_id) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.owns_provider(auth.uid(), provider_id) OR public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.appointment_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.provider_services(id) ON DELETE SET NULL,
  preferred_date date,
  preferred_period text CHECK (preferred_period IN ('morning','afternoon','evening','any')),
  notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','notified','converted','cancelled')),
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS waitlist_provider_status_idx ON public.appointment_waitlist(provider_id, status);
CREATE INDEX IF NOT EXISTS waitlist_patient_idx ON public.appointment_waitlist(patient_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_waitlist TO authenticated;
GRANT ALL ON public.appointment_waitlist TO service_role;
ALTER TABLE public.appointment_waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY wl_patient_read ON public.appointment_waitlist FOR SELECT TO authenticated
  USING (patient_id = auth.uid() OR public.owns_provider(auth.uid(), provider_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY wl_patient_insert ON public.appointment_waitlist FOR INSERT TO authenticated WITH CHECK (patient_id = auth.uid());
CREATE POLICY wl_patient_update ON public.appointment_waitlist FOR UPDATE TO authenticated
  USING (patient_id = auth.uid() OR public.owns_provider(auth.uid(), provider_id) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (patient_id = auth.uid() OR public.owns_provider(auth.uid(), provider_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY wl_patient_delete ON public.appointment_waitlist FOR DELETE TO authenticated
  USING (patient_id = auth.uid() OR public.owns_provider(auth.uid(), provider_id) OR public.has_role(auth.uid(),'admin'));

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.provider_services(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS location_text text,
  ADD COLUMN IF NOT EXISTS rescheduled_from uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS consultation_type text NOT NULL DEFAULT 'in_person' CHECK (consultation_type IN ('in_person','video','phone')),
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_24h_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_2h_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_30m_sent_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS appointments_no_double_book
  ON public.appointments(provider_id, scheduled_for)
  WHERE status IN ('pending','approved');
CREATE INDEX IF NOT EXISTS appointments_provider_scheduled_idx ON public.appointments(provider_id, scheduled_for);
CREATE INDEX IF NOT EXISTS appointments_patient_scheduled_idx ON public.appointments(patient_id, scheduled_for);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname='appt_provider_owner_read' AND polrelid='public.appointments'::regclass) THEN
    CREATE POLICY appt_provider_owner_read ON public.appointments FOR SELECT TO authenticated
      USING (public.owns_provider(auth.uid(), provider_id) OR public.has_role(auth.uid(),'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname='appt_provider_owner_update' AND polrelid='public.appointments'::regclass) THEN
    CREATE POLICY appt_provider_owner_update ON public.appointments FOR UPDATE TO authenticated
      USING (public.owns_provider(auth.uid(), provider_id) OR public.has_role(auth.uid(),'admin'))
      WITH CHECK (public.owns_provider(auth.uid(), provider_id) OR public.has_role(auth.uid(),'admin'));
  END IF;
END $$;

DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.provider_services; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.provider_schedules; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.provider_blocked_dates; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.appointment_waitlist; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
