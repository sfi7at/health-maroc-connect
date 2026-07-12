CREATE OR REPLACE FUNCTION public.notify_appointment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_provider_owner uuid;
  v_provider_name  text;
  v_patient_name   text;
  v_when_txt       text;
  v_action_url     text;
  v_status         text;
BEGIN
  SELECT owner_id, name INTO v_provider_owner, v_provider_name
  FROM public.providers
  WHERE id = COALESCE(NEW.provider_id, OLD.provider_id);

  SELECT COALESCE(full_name, 'Un patient') INTO v_patient_name
  FROM public.profiles
  WHERE id = COALESCE(NEW.patient_id, OLD.patient_id);

  v_when_txt := to_char(NEW.scheduled_for AT TIME ZONE 'Africa/Casablanca', 'DD/MM/YYYY HH24:MI');
  v_action_url := '/appointments/' || NEW.id::text;

  IF TG_OP = 'INSERT' THEN
    IF v_provider_owner IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, type, priority, title, body, action_url, action_label, data, dedupe_key)
      VALUES (
        v_provider_owner,
        'appointment',
        'high',
        'Nouvelle demande de rendez-vous',
        v_patient_name || ' — ' || v_when_txt,
        v_action_url,
        'Voir la demande',
        jsonb_build_object('appointment_id', NEW.id, 'status', NEW.status, 'kind', 'created'),
        'appointment:doctor:created:' || NEW.id::text
      )
      ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
    END IF;

    INSERT INTO public.notifications(user_id, type, priority, title, body, action_url, action_label, data, dedupe_key)
    VALUES (
      NEW.patient_id,
      'appointment',
      'normal',
      'Demande envoyée',
      'Votre demande auprès de ' || COALESCE(v_provider_name, 'le cabinet') || ' pour le ' || v_when_txt || ' a été envoyée.',
      v_action_url,
      'Suivre',
      jsonb_build_object('appointment_id', NEW.id, 'status', NEW.status, 'kind', 'created'),
      'appointment:patient:created:' || NEW.id::text
    )
    ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    v_status := NEW.status::text;

    INSERT INTO public.notifications(user_id, type, priority, title, body, action_url, action_label, data, dedupe_key)
    VALUES (
      NEW.patient_id,
      'appointment',
      CASE WHEN v_status IN ('approved', 'rescheduled', 'rejected', 'cancelled', 'no_show') THEN 'high' ELSE 'normal' END,
      CASE v_status
        WHEN 'approved' THEN 'Rendez-vous confirmé'
        WHEN 'rejected' THEN 'Rendez-vous refusé'
        WHEN 'cancelled' THEN 'Rendez-vous annulé'
        WHEN 'completed' THEN 'Rendez-vous terminé'
        WHEN 'no_show' THEN 'Absence enregistrée'
        WHEN 'rescheduled' THEN 'Rendez-vous reprogrammé'
        ELSE 'Mise à jour du rendez-vous'
      END,
      COALESCE(v_provider_name, 'Le cabinet') || ' — ' || v_when_txt,
      v_action_url,
      'Voir le rendez-vous',
      jsonb_build_object('appointment_id', NEW.id, 'status', v_status, 'kind', 'status_change'),
      'appointment:patient:status:' || NEW.id::text || ':' || v_status
    )
    ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;

    IF v_provider_owner IS NOT NULL AND v_status = 'cancelled' THEN
      INSERT INTO public.notifications(user_id, type, priority, title, body, action_url, action_label, data, dedupe_key)
      VALUES (
        v_provider_owner,
        'appointment',
        'high',
        'Rendez-vous annulé par le patient',
        v_patient_name || ' — ' || v_when_txt,
        v_action_url,
        'Voir',
        jsonb_build_object('appointment_id', NEW.id, 'status', v_status, 'kind', 'patient_cancelled'),
        'appointment:doctor:cancelled:' || NEW.id::text
      )
      ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.notify_appointment_change() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_appointment_change() TO service_role;