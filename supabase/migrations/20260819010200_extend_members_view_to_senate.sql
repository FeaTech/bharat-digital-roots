-- SEC-09: the "view members" policy on `members` only recognized the
-- legacy flat `has_role(admin)` role. The hierarchical senate/caucus roles
-- added later (admin_assignments + is_senate()) were never granted read
-- access, so a senate_president using the member picker on /portal/units
-- or /portal/policies would only ever see their own row (RLS silently
-- filtered everything else), making those admin flows non-functional for
-- anyone who isn't also a legacy admin. Extend the policy to include
-- is_senate().
DROP POLICY IF EXISTS "view members" ON public.members;
CREATE POLICY "view members"
  ON public.members FOR SELECT TO authenticated
  USING (
    (select auth.uid()) = user_id
    OR public.has_role((select auth.uid()), 'admin')
    OR public.is_senate((select auth.uid()))
  );
