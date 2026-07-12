
-- 1) Backfill default Mon-Sat schedules for integrated doctors/dentists lacking any
INSERT INTO public.provider_schedules (provider_id, weekday, start_time, end_time, slot_minutes, break_start, break_end, is_active)
SELECT p.id, wd, '09:00'::time, '18:00'::time, 30, '13:00'::time, '14:00'::time, true
FROM public.providers p
CROSS JOIN generate_series(1, 6) AS wd
WHERE p.owner_id IS NOT NULL
  AND p.category IN ('doctor','dentist')
  AND p.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.provider_schedules s WHERE s.provider_id = p.id);

-- 2) Backfill a default consultation service for the same doctors
INSERT INTO public.provider_services (provider_id, name, description, duration_minutes, price_mad, is_active, is_online_eligible, sort_order)
SELECT p.id, 'Consultation générale', 'Consultation médicale standard', 30, NULL, true, false, 0
FROM public.providers p
WHERE p.owner_id IS NOT NULL
  AND p.category IN ('doctor','dentist')
  AND p.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.provider_services s WHERE s.provider_id = p.id);

-- 3) Appointment lifecycle notifications
CREATE OR REPLACE FUNCTION public.notify_appointment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_provider_owner uuid;
  v_provider_name  text;
  v_patient_name   text;
  v_when_txt       text;
  v_action_url     text;
  v_status         text;
BEGIN
  SELECT owner_id, name INTO v_provider_owner, v_provider_name
  FROM public.providers WHERE id = COALESCE(NEW.provider_id, OLD.provider_id);

  SELECT COALESCE(full_name, 'Un patient') INTO v_patient_name
  FROM public.profiles WHERE id = COALESCE(NEW.patient_id, OLD.patient_id);

  v_when_txt := to_char(NEW.scheduled_for AT TIME ZONE 'Africa/Casablanca', 'DD/MM/YYYY HH24:MI');
  v_action_url := '/appointments/' || NEW.id::text;

  IF TG_OP = 'INSERT' THEN
    -- Notify the doctor (if platform-integrated)
    IF v_provider_owner IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, type, priority, title, body, action_url, action_label, data)
      VALUES (v_provider_owner, 'appointment', 'high',
        'Nouvelle demande de rendez-vous',
        v_patient_name || ' — ' || v_when_txt,
        v_action_url, 'Voir la demande',
        jsonb_build_object('appointment_id', NEW.id, 'status', NEW.status, 'kind', 'created'));
    END IF;
    -- Confirm reception to the patient
    INSERT INTO public.notifications(user_id, type, priority, title, body, action_url, action_label, data)
    VALUES (NEW.patient_id, 'appointment', 'normal',
      'Demande envoyée',
      'Votre demande auprès de ' || COALESCE(v_provider_name,'le cabinet') || ' pour le ' || v_when_txt || ' a été envoyée.',
      v_action_url, 'Suivre',
      jsonb_build_object('appointment_id', NEW.id, 'status', NEW.status, 'kind', 'created'));
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    v_status := NEW.status::text;

    -- Always notify the patient of a status change
    INSERT INTO public.notifications(user_id, type, priority, title, body, action_url, action_label, data)
    VALUES (
      NEW.patient_id, 'appointment',
      CASE WHEN v_status IN ('approved','rescheduled') THEN 'high'
           WHEN v_status IN ('rejected','cancelled','no_show') THEN 'high'
           ELSE 'normal' END,
      CASE v_status
        WHEN 'approved'    THEN 'Rendez-vous confirmé'
        WHEN 'rejected'    THEN 'Rendez-vous refusé'
        WHEN 'cancelled'   THEN 'Rendez-vous annulé'
        WHEN 'completed'   THEN 'Rendez-vous terminé'
        WHEN 'no_show'     THEN 'Absence enregistrée'
        WHEN 'rescheduled' THEN 'Rendez-vous reprogrammé'
        ELSE 'Mise à jour du rendez-vous'
      END,
      COALESCE(v_provider_name,'Le cabinet') || ' — ' || v_when_txt,
      v_action_url, 'Voir le rendez-vous',
      jsonb_build_object('appointment_id', NEW.id, 'status', v_status, 'kind', 'status_change')
    );

    -- Also notify the provider when the patient cancels
    IF v_provider_owner IS NOT NULL AND v_status = 'cancelled' THEN
      INSERT INTO public.notifications(user_id, type, priority, title, body, action_url, action_label, data)
      VALUES (v_provider_owner, 'appointment', 'high',
        'Rendez-vous annulé par le patient',
        v_patient_name || ' — ' || v_when_txt,
        v_action_url, 'Voir',
        jsonb_build_object('appointment_id', NEW.id, 'status', v_status, 'kind', 'patient_cancelled'));
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS trg_notify_appointment_change ON public.appointments;
CREATE TRIGGER trg_notify_appointment_change
AFTER INSERT OR UPDATE OF status ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.notify_appointment_change();
