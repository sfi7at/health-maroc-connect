CREATE TABLE IF NOT EXISTS public.family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 120),
  relation text NOT NULL CHECK (char_length(relation) BETWEEN 2 AND 50),
  date_of_birth date,
  blood_group public.blood_group,
  notes text CHECK (notes IS NULL OR char_length(notes) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS family_members_owner_idx ON public.family_members(owner_id);
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_members TO authenticated;
GRANT ALL ON public.family_members TO service_role;
DROP POLICY IF EXISTS family_members_owner_all ON public.family_members;
CREATE POLICY family_members_owner_all ON public.family_members FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
DROP TRIGGER IF EXISTS family_members_set_updated ON public.family_members;
CREATE TRIGGER family_members_set_updated BEFORE UPDATE ON public.family_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.appointment_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS appointment_messages_thread_idx ON public.appointment_messages(appointment_id, created_at);
ALTER TABLE public.appointment_messages ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.appointment_messages TO authenticated;
GRANT ALL ON public.appointment_messages TO service_role;

DROP POLICY IF EXISTS appointment_messages_participant_read ON public.appointment_messages;
CREATE POLICY appointment_messages_participant_read ON public.appointment_messages FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.appointments a
  WHERE a.id = appointment_id
    AND (a.patient_id = auth.uid() OR public.owns_provider(auth.uid(), a.provider_id) OR public.has_role(auth.uid(), 'admin'))
));
DROP POLICY IF EXISTS appointment_messages_participant_insert ON public.appointment_messages;
CREATE POLICY appointment_messages_participant_insert ON public.appointment_messages FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid() AND EXISTS (
  SELECT 1 FROM public.appointments a
  WHERE a.id = appointment_id
    AND (a.patient_id = auth.uid() OR public.owns_provider(auth.uid(), a.provider_id))
    AND a.status NOT IN ('cancelled', 'rejected')
));

DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.appointment_messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

CREATE OR REPLACE FUNCTION public.assign_video_room()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.consultation_type = 'video' AND NEW.meeting_url IS NULL THEN
    NEW.meeting_provider := 'meet.jit.si';
    NEW.meeting_url := 'https://meet.jit.si/vytalma-' || replace(gen_random_uuid()::text, '-', '');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS appointments_assign_video_room ON public.appointments;
CREATE TRIGGER appointments_assign_video_room
BEFORE INSERT OR UPDATE OF consultation_type ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.assign_video_room();
