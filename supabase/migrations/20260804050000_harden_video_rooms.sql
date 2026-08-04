ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS video_room_id text;

CREATE OR REPLACE FUNCTION public.assign_video_room()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.consultation_type = 'video' AND NEW.video_room_id IS NULL THEN
    NEW.video_room_id := 'room-' || replace(gen_random_uuid()::text, '-', '');
    NEW.meeting_provider := 'jaas';
    NEW.meeting_url := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS appointments_assign_video_room ON public.appointments;
CREATE TRIGGER appointments_assign_video_room
BEFORE INSERT OR UPDATE OF consultation_type ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.assign_video_room();

UPDATE public.appointments
SET video_room_id = 'room-' || replace(gen_random_uuid()::text, '-', ''),
    meeting_provider = 'jaas',
    meeting_url = NULL
WHERE consultation_type = 'video' AND video_room_id IS NULL;
