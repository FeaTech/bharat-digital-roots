-- Governance audit trail. The hierarchical admin system lets a
-- senate_president grant/revoke admin power over any unit, and legacy
-- admins approve members and place them into branches, with zero record of
-- who did what when. Written exclusively by service_role (server functions
-- log best-effort via supabaseAdmin after the privileged action succeeds);
-- readable by admins/senate for accountability.
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_log_created_idx ON public.audit_log(created_at DESC);

REVOKE ALL ON public.audit_log FROM anon, authenticated;
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins and senate read audit log" ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'admin') OR public.is_senate((select auth.uid())));
