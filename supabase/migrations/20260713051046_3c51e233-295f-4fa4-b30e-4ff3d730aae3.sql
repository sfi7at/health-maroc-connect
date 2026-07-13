UPDATE public.profiles
SET onesignal_external_user_id = id::text
WHERE onesignal_external_user_id IS DISTINCT FROM id::text;