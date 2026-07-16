CREATE TABLE IF NOT EXISTS public.maintenance_user_locks (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  locked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  locked_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_user_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS maintenance_user_locks_select ON public.maintenance_user_locks;
CREATE POLICY maintenance_user_locks_select ON public.maintenance_user_locks
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'));

DROP POLICY IF EXISTS maintenance_user_locks_modify ON public.maintenance_user_locks;
CREATE POLICY maintenance_user_locks_modify ON public.maintenance_user_locks
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'))
WITH CHECK (public.has_role(auth.uid(), 'superadmin'));
