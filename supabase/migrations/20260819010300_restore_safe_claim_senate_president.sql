-- claim_senate_president() was dropped in 20260710012436 because any
-- authenticated user could call it and become Senate President for the
-- whole org as long as no one had claimed it yet ("first caller wins").
-- That left no self-service way to bootstrap a fresh deployment at all.
--
-- Restore it with the race closed two ways:
--   1. Only an existing legacy admin (has_role 'admin') may call it, not
--      any approved member.
--   2. A partial unique index enforces at most one senate_president row
--      at the database level, so two concurrent admins racing to claim
--      it can't both succeed no matter what the function body checks.
CREATE UNIQUE INDEX IF NOT EXISTS admin_assignments_one_senate_president
  ON public.admin_assignments (role)
  WHERE role = 'senate_president';

CREATE OR REPLACE FUNCTION public.senate_president_exists()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_assignments WHERE role = 'senate_president');
$$;
REVOKE ALL ON FUNCTION public.senate_president_exists() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.senate_president_exists() TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_senate_president()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only an existing admin can claim Senate President';
  END IF;
  BEGIN
    INSERT INTO public.admin_assignments(user_id, role, unit_id) VALUES (auth.uid(), 'senate_president', NULL);
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Senate President already exists';
  END;
END; $$;

REVOKE ALL ON FUNCTION public.claim_senate_president() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_senate_president() TO authenticated;
