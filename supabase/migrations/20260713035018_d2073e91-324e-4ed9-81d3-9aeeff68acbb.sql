UPDATE public.profiles p
SET onesignal_external_user_id = u.email
FROM auth.users u
WHERE p.id = u.id
  AND u.email IS NOT NULL
  AND (p.onesignal_external_user_id IS NULL OR p.onesignal_external_user_id = '');