
-- Allow any authenticated user to insert their own access log sessions
DROP POLICY IF EXISTS "als_insert" ON public.access_log_sessions;
CREATE POLICY "als_insert" ON public.access_log_sessions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own sessions (for ending sessions, tracking navigation)
CREATE POLICY "als_update_own" ON public.access_log_sessions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Keep existing SELECT policy for c-level only (already exists)
-- Also allow users to select their own logs
DROP POLICY IF EXISTS "als_select" ON public.access_log_sessions;
CREATE POLICY "als_select" ON public.access_log_sessions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'c-level'::app_role));
