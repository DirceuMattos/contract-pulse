CREATE TABLE public.maintenance_user_locks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  locked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  locked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.maintenance_user_locks TO authenticated;
GRANT ALL ON public.maintenance_user_locks TO service_role;

ALTER TABLE public.maintenance_user_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can view maintenance locks"
  ON public.maintenance_user_locks
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'::app_role));