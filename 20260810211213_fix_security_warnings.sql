/*
# Fix security warnings on helper functions

1. Revoke EXECUTE on handle_new_user from anon and authenticated (trigger-only function)
2. Set search_path on update_updated_at to avoid mutable search_path warning
*/

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
ALTER FUNCTION public.update_updated_at() SET search_path = public;
