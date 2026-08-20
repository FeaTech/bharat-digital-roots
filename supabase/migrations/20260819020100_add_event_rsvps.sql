-- Event RSVPs: posts already carry event_starts_at/event_location but there
-- was no way for a member to signal attendance or for an organizer to see
-- interest. One row per (post, user).
CREATE TABLE IF NOT EXISTS public.event_rsvps (
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS event_rsvps_post_idx ON public.event_rsvps(post_id);

GRANT SELECT, INSERT, DELETE ON public.event_rsvps TO authenticated;
GRANT ALL ON public.event_rsvps TO service_role;
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

-- Visible only for posts the caller can already see (posts RLS is enforced
-- transitively when this subquery runs under the caller's role).
CREATE POLICY "view rsvps for visible posts" ON public.event_rsvps
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = event_rsvps.post_id));

CREATE POLICY "rsvp to visible events" ON public.event_rsvps
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND EXISTS (SELECT 1 FROM public.posts p WHERE p.id = event_rsvps.post_id AND p.kind = 'event')
  );

CREATE POLICY "cancel own rsvp" ON public.event_rsvps
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));
