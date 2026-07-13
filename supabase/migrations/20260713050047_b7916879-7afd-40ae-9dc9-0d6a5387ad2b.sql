
-- Expand user-specific push notifications to more personal events.
-- Every notification insert already dispatches an OneSignal push via
-- trg_dispatch_notification_push, so we only need to insert notification
-- rows targeting the right user_id.

-- 1) New prescription → notify patient
CREATE OR REPLACE FUNCTION public.notify_prescription_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_provider_name text;
  v_target uuid;
BEGIN
  v_target := NEW.user_id;
  IF v_target IS NULL THEN RETURN NEW; END IF;

  SELECT name INTO v_provider_name FROM public.providers WHERE id = NEW.provider_id;

  INSERT INTO public.notifications(user_id, type, priority, title, body, action_url, action_label, data, dedupe_key)
  VALUES (
    v_target,
    'system',
    'high'::notification_priority,
    'Nouvelle ordonnance',
    COALESCE(v_provider_name, 'Votre médecin') || ' vous a délivré une ordonnance.',
    '/prescriptions/' || NEW.id::text,
    'Consulter',
    jsonb_build_object('prescription_id', NEW.id, 'kind', 'prescription_created'),
    'prescription:created:' || NEW.id::text
  )
  ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_prescription_created ON public.prescriptions;
CREATE TRIGGER trg_notify_prescription_created
AFTER INSERT ON public.prescriptions
FOR EACH ROW EXECUTE FUNCTION public.notify_prescription_created();

-- 2) Blood request response → notify requester on new response,
--    notify donor on status change to accepted/rejected.
CREATE OR REPLACE FUNCTION public.notify_blood_response_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_requester uuid;
  v_blood_group text;
  v_donor_name text;
BEGIN
  SELECT requester_id, blood_group INTO v_requester, v_blood_group
  FROM public.blood_requests WHERE id = NEW.request_id;

  IF TG_OP = 'INSERT' AND v_requester IS NOT NULL THEN
    SELECT COALESCE(full_name, 'Un donneur') INTO v_donor_name
    FROM public.profiles WHERE id = NEW.donor_id;

    INSERT INTO public.notifications(user_id, type, priority, title, body, action_url, action_label, data, dedupe_key)
    VALUES (
      v_requester,
      'blood_request',
      'urgent'::notification_priority,
      'Un donneur a répondu',
      v_donor_name || ' a répondu à votre demande de sang ' || COALESCE(v_blood_group, ''),
      '/blood/requests/' || NEW.request_id::text,
      'Voir la demande',
      jsonb_build_object('request_id', NEW.request_id, 'response_id', NEW.id, 'kind', 'response_created'),
      'blood:response:created:' || NEW.id::text
    )
    ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications(user_id, type, priority, title, body, action_url, action_label, data, dedupe_key)
    VALUES (
      NEW.donor_id,
      'blood_request',
      'high'::notification_priority,
      CASE NEW.status
        WHEN 'accepted' THEN 'Votre offre a été acceptée'
        WHEN 'rejected' THEN 'Offre non retenue'
        ELSE 'Mise à jour de votre offre'
      END,
      'Demande de sang ' || COALESCE(v_blood_group, ''),
      '/blood/requests/' || NEW.request_id::text,
      'Voir',
      jsonb_build_object('request_id', NEW.request_id, 'response_id', NEW.id, 'status', NEW.status, 'kind', 'response_status'),
      'blood:response:status:' || NEW.id::text || ':' || NEW.status
    )
    ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_blood_response_change ON public.blood_request_responses;
CREATE TRIGGER trg_notify_blood_response_change
AFTER INSERT OR UPDATE ON public.blood_request_responses
FOR EACH ROW EXECUTE FUNCTION public.notify_blood_response_change();

-- 3) New blood chat message → notify recipient
CREATE OR REPLACE FUNCTION public.notify_blood_chat_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sender_name text;
BEGIN
  IF NEW.recipient_id IS NULL OR NEW.recipient_id = NEW.sender_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(full_name, 'Nouveau message') INTO v_sender_name
  FROM public.profiles WHERE id = NEW.sender_id;

  INSERT INTO public.notifications(user_id, type, priority, title, body, action_url, action_label, data, dedupe_key)
  VALUES (
    NEW.recipient_id,
    'blood_request',
    'high'::notification_priority,
    'Nouveau message — don de sang',
    v_sender_name || ' : ' || LEFT(COALESCE(NEW.body, ''), 120),
    '/blood/chat/' || NEW.request_id::text,
    'Ouvrir',
    jsonb_build_object('request_id', NEW.request_id, 'message_id', NEW.id, 'kind', 'chat_message'),
    'blood:chat:' || NEW.id::text
  )
  ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_blood_chat_message ON public.blood_chat_messages;
CREATE TRIGGER trg_notify_blood_chat_message
AFTER INSERT ON public.blood_chat_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_blood_chat_message();

-- Restrict execute to service role only; triggers run as SECURITY DEFINER owner.
REVOKE EXECUTE ON FUNCTION public.notify_prescription_created() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_blood_response_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_blood_chat_message() FROM PUBLIC, anon, authenticated;
