-- SEC-08: policy_collaborators only had a SELECT policy for is_senate(),
-- so the "senate president or collaborators update policies" policy on
-- `policies` (which checks `EXISTS (... FROM policy_collaborators WHERE
-- user_id = auth.uid())`) could never see a collaborator's own row unless
-- they were already senate. That made the "collaborators can edit" grant
-- dead code for the exact people it was meant for. Add the missing
-- self-row SELECT so a collaborator can see (and therefore be recognized
-- as) their own collaborator entry.
CREATE POLICY "collaborators view own row" ON public.policy_collaborators
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));
