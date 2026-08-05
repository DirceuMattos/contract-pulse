-- Alerta "Employee-role mapping readable by every authenticated user":
-- feedz_alias_mappings tinha SELECT liberado a todo autenticado (USING true).
-- Alinha a leitura ao nível das escritas (c-level). has_role já reconhece
-- superadmin (migration 20260727213000). A edge function feedz-sync usa
-- service_role (ignora RLS), então não é afetada. 2026-08-01

DROP POLICY IF EXISTS "fam_select" ON public.feedz_alias_mappings;
CREATE POLICY "fam_select" ON public.feedz_alias_mappings AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'c-level'::public.app_role));
