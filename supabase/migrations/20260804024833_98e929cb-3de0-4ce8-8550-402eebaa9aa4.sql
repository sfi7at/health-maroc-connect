-- Appointment messaging
CREATE TABLE IF NOT EXISTS public.appointment_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_appointment_messages_appointment ON public.appointment_messages(appointment_id, created_at);

GRANT SELECT, INSERT ON public.appointment_messages TO authenticated;
GRANT ALL ON public.appointment_messages TO service_role;
ALTER TABLE public.appointment_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read appointment messages"
ON public.appointment_messages FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.appointments a
  WHERE a.id = appointment_messages.appointment_id
    AND (a.patient_id = auth.uid() OR public.owns_provider(auth.uid(), a.provider_id))
));

CREATE POLICY "Participants can send appointment messages"
ON public.appointment_messages FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid() AND EXISTS (
  SELECT 1 FROM public.appointments a
  WHERE a.id = appointment_messages.appointment_id
    AND (a.patient_id = auth.uid() OR public.owns_provider(auth.uid(), a.provider_id))
));

-- Family profiles
CREATE TABLE IF NOT EXISTS public.family_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 120),
  relation TEXT NOT NULL CHECK (char_length(relation) BETWEEN 2 AND 50),
  date_of_birth DATE,
  blood_group public.blood_group,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_family_members_owner ON public.family_members(owner_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_members TO authenticated;
GRANT ALL ON public.family_members TO service_role;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own family members"
ON public.family_members FOR ALL TO authenticated
USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- Secure video room identifier for teleconsultations
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS video_room_id TEXT;
UPDATE public.appointments SET video_room_id = 'vytalma-' || replace(id::text, '-', '')
WHERE video_room_id IS NULL AND consultation_type = 'video';