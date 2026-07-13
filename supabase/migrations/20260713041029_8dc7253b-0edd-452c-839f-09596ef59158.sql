
revoke execute on function public.has_role(uuid, public.app_role) from anon, public;
revoke execute on function public.has_any_admin_role(uuid) from anon, public;
revoke execute on function public.storage_first_folder_owns_provider(text, uuid) from anon, public;
revoke execute on function public.owns_provider(uuid, uuid) from anon, public;

-- Ensure authenticated retains what it needs (idempotent).
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.has_any_admin_role(uuid) to authenticated;
grant execute on function public.storage_first_folder_owns_provider(text, uuid) to authenticated;
grant execute on function public.owns_provider(uuid, uuid) to authenticated;
