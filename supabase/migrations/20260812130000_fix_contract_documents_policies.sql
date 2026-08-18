-- Correção — Documentos de contrato: superadmin bloqueado em toda a escrita
--
-- SINTOMA
-- Superadmin recebe "new row violates row-level security policy" ao anexar
-- documento em contrato. Consegue LER (docs_select inclui superadmin desde
-- 22/06) mas não consegue GRAVAR.
--
-- CAUSA
-- As policies de escrita foram escritas em 24/03 e 01/04 com lista literal de
-- perfis — ['c-level','intermediario','administrativo','rh'] — e nunca foram
-- atualizadas quando o perfil 'superadmin' passou a existir. Mesma família dos
-- itens P17–P22 do checklist.
--
-- Estado antes desta migration:
--   document_attachments          SELECT ✅ superadmin · INSERT/UPDATE ❌ · DELETE só c-level
--   storage.objects (contract-documents)  INSERT ❌ · DELETE ❌
--   attachment_description_configs        INSERT/UPDATE ❌
--   history_events                        INSERT/UPDATE ❌
--
-- Havia DOIS bloqueios no mesmo fluxo (o upload no Storage e o insert da
-- linha), os dois com a mesma mensagem de erro.
--
-- ABORDAGEM
-- Em vez de acrescentar 'superadmin' a mais uma lista literal — que voltaria a
-- envelhecer no próximo perfil novo — a permissão passa a ser consultada na
-- camada de módulos (role_module_permissions), que é a mesma que a tela de
-- Gestão de Perfis edita. Quem o Superadmin liberar na tela passa a poder de
-- fato gravar.
--
-- Um PISO HISTÓRICO preserva exatamente quem já podia hoje, para que nenhum
-- perfil perca acesso caso ainda não tenha linha configurada na tela.

-- ---------------------------------------------------------------------------
-- 1. Função de autorização
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_act_on_contract_module(
  _module_key text,
  _action     text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Superadmin nunca é bloqueado. Era o furo.
    public.has_role(auth.uid(), 'superadmin'::app_role)

    -- Camada de módulos: o que a tela de Gestão de Perfis concede.
    OR EXISTS (
      SELECT 1
        FROM public.user_roles ur
        JOIN public.role_module_permissions rmp
          ON rmp.role = ur.role::text
       WHERE ur.user_id = auth.uid()
         AND rmp.module_key = _module_key
         AND rmp.can_access
         AND CASE _action
               WHEN 'create' THEN rmp.can_create
               WHEN 'edit'   THEN rmp.can_edit
               WHEN 'delete' THEN rmp.can_delete
               ELSE false
             END
    )

    -- Piso histórico: mantém quem já podia antes desta migration.
    OR CASE _action
         WHEN 'create' THEN public.has_any_role(auth.uid(),
              ARRAY['c-level','intermediario','administrativo','rh']::app_role[])
         WHEN 'edit'   THEN public.has_any_role(auth.uid(),
              ARRAY['c-level','intermediario','administrativo','rh']::app_role[])
         -- DELETE unificado: hoje o Administrativo apaga o arquivo no Storage
         -- mas não a linha do banco, o que deixa registro órfão apontando para
         -- arquivo inexistente. Alinhado na lista mais ampla das duas.
         WHEN 'delete' THEN public.has_any_role(auth.uid(),
              ARRAY['c-level','intermediario','administrativo']::app_role[])
         ELSE false
       END;
$$;

REVOKE ALL ON FUNCTION public.can_act_on_contract_module(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.can_act_on_contract_module(text, text) TO authenticated;

COMMENT ON FUNCTION public.can_act_on_contract_module(text, text) IS
  'Autorização de escrita nos anexos e no histórico de contrato. Consulta role_module_permissions no módulo informado, com piso histórico, e nunca bloqueia superadmin.';

-- ---------------------------------------------------------------------------
-- 2. document_attachments
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS docs_insert ON public.document_attachments;
CREATE POLICY docs_insert ON public.document_attachments
  FOR INSERT TO authenticated
  WITH CHECK (public.can_act_on_contract_module('DOCUMENTS', 'create'));

DROP POLICY IF EXISTS docs_update ON public.document_attachments;
CREATE POLICY docs_update ON public.document_attachments
  FOR UPDATE TO authenticated
  USING (public.can_act_on_contract_module('DOCUMENTS', 'edit'))
  WITH CHECK (public.can_act_on_contract_module('DOCUMENTS', 'edit'));

DROP POLICY IF EXISTS docs_delete ON public.document_attachments;
CREATE POLICY docs_delete ON public.document_attachments
  FOR DELETE TO authenticated
  USING (public.can_act_on_contract_module('DOCUMENTS', 'delete'));

-- docs_select já inclui superadmin (migration de 22/06) — não é alterada.

-- ---------------------------------------------------------------------------
-- 3. storage.objects — bucket contract-documents
-- ---------------------------------------------------------------------------
-- O upload do arquivo acontece antes do insert da linha. Sem isto, o anexo
-- falha no Storage com a mesma mensagem de erro.

DROP POLICY IF EXISTS cd_insert ON storage.objects;
CREATE POLICY cd_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'contract-documents'
    AND public.can_act_on_contract_module('DOCUMENTS', 'create')
  );

DROP POLICY IF EXISTS cd_update ON storage.objects;
CREATE POLICY cd_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'contract-documents'
    AND public.can_act_on_contract_module('DOCUMENTS', 'edit')
  );

DROP POLICY IF EXISTS cd_delete ON storage.objects;
CREATE POLICY cd_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'contract-documents'
    AND public.can_act_on_contract_module('DOCUMENTS', 'delete')
  );

-- ---------------------------------------------------------------------------
-- 4. attachment_description_configs — o botão "Gerenciar tipos"
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS adc_insert ON public.attachment_description_configs;
CREATE POLICY adc_insert ON public.attachment_description_configs
  FOR INSERT TO authenticated
  WITH CHECK (public.can_act_on_contract_module('DOCUMENTS', 'create'));

DROP POLICY IF EXISTS adc_update ON public.attachment_description_configs;
CREATE POLICY adc_update ON public.attachment_description_configs
  FOR UPDATE TO authenticated
  USING (public.can_act_on_contract_module('DOCUMENTS', 'edit'))
  WITH CHECK (public.can_act_on_contract_module('DOCUMENTS', 'edit'));

DROP POLICY IF EXISTS adc_delete ON public.attachment_description_configs;
CREATE POLICY adc_delete ON public.attachment_description_configs
  FOR DELETE TO authenticated
  USING (public.can_act_on_contract_module('DOCUMENTS', 'delete'));

-- ---------------------------------------------------------------------------
-- 5. history_events — a caixa "Criar evento no histórico" do mesmo diálogo
-- ---------------------------------------------------------------------------
-- Entra na mesma regra, consultando o módulo HISTORY. Sem isto o anexo grava e
-- o evento de histórico falha em seguida — o documento sobe e a marcação do
-- usuário se perde em silêncio. O piso histórico é idêntico ao de DOCUMENTS.

DROP POLICY IF EXISTS history_insert ON public.history_events;
CREATE POLICY history_insert ON public.history_events
  FOR INSERT TO authenticated
  WITH CHECK (public.can_act_on_contract_module('HISTORY', 'create'));

DROP POLICY IF EXISTS history_update ON public.history_events;
CREATE POLICY history_update ON public.history_events
  FOR UPDATE TO authenticated
  USING (public.can_act_on_contract_module('HISTORY', 'edit'));
