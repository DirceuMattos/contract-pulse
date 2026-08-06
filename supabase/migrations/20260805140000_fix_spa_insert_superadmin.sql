-- P1 (Erro ao alocar item): a policy de INSERT de subproject_allocations não
-- incluía 'superadmin' no array (as policies de SELECT/UPDATE/DELETE incluíam).
-- Como has_any_role pode ter sido sobrescrita sem o reconhecimento automático de
-- superadmin, o INSERT era bloqueado para superadmin. Torna explícito no array.
-- 2026-08-05

DROP POLICY IF EXISTS spa_insert ON public.subproject_allocations;
CREATE POLICY spa_insert ON public.subproject_allocations
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY[
      'c-level'::public.app_role,
      'intermediario'::public.app_role,
      'lider_tribo'::public.app_role,
      'superadmin'::public.app_role
    ])
  );
