CREATE OR REPLACE FUNCTION public.appointments_autofill_video_room()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.consultation_type = 'video' AND (NEW.video_room_id IS NULL OR length(trim(NEW.video_room_id)) = 0) THEN
    NEW.video_room_id := 'vytalma-' || replace(COALESCE(NEW.id, gen_random_uuid())::text, '-', '');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_appointments_video_room ON public.appointments;
CREATE TRIGGER trg_appointments_video_room
BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.appointments_autofill_video_room();

UPDATE public.appointments
SET video_room_id = 'vytalma-' || replace(id::text, '-', '')
WHERE consultation_type = 'video' AND (video_room_id IS NULL OR length(trim(video_room_id)) = 0);