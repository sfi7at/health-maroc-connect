-- Enforce appointment invariants in the database so they cannot be bypassed
-- by a modified client request.
CREATE OR REPLACE FUNCTION public.validate_appointment_service()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  service_provider uuid;
  online_allowed boolean;
BEGIN
  IF NEW.service_id IS NULL THEN
    IF NEW.consultation_type <> 'in_person' THEN
      RAISE EXCEPTION 'A remote appointment requires an eligible service'
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  SELECT provider_id, is_online_eligible
    INTO service_provider, online_allowed
  FROM public.provider_services
  WHERE id = NEW.service_id AND is_active = true;

  IF service_provider IS NULL THEN
    RAISE EXCEPTION 'The selected service does not exist or is inactive'
      USING ERRCODE = '23514';
  END IF;

  IF service_provider <> NEW.provider_id THEN
    RAISE EXCEPTION 'The selected service does not belong to this provider'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.consultation_type IN ('video', 'phone') AND NOT online_allowed THEN
    RAISE EXCEPTION 'This service is not eligible for remote consultation'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS appointments_validate_service ON public.appointments;
CREATE TRIGGER appointments_validate_service
BEFORE INSERT OR UPDATE OF provider_id, service_id, consultation_type
ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.validate_appointment_service();

REVOKE ALL ON FUNCTION public.validate_appointment_service() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_appointment_service() TO service_role;
