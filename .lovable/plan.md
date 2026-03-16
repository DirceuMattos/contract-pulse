

## Plano: RLS Completas + Pipeline Extracao/Embeddings + Templates com Versionamento

### 1. Migracao SQL

Uma unica migracao cobrindo os 3 blocos:

**1.1 Security definer function `is_clevel`** (usa `has_role` existente, sem criar `is_admin` que referencia `profiles.role` — o sistema usa `user_roles` com `app_role` enum):

```sql
CREATE OR REPLACE FUNCTION public.is_clevel()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(auth.uid(), 'c-level'::app_role); $$;
```

**1.2 Security definer function `get_doc_extractions_status`** — retorna status sem texto extraido:

```sql
CREATE OR REPLACE FUNCTION public.get_doc_extractions_status()
RETURNS TABLE(id uuid, document_id uuid, owner_type text, owner_id uuid, status text, extracted_at timestamptz, error_message text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id, document_id, owner_type, owner_id, status, extracted_at, error_message FROM public.doc_text_extractions; $$;
```

**1.3 Ajustar RLS em `doc_chunks`** — remover policy de SELECT para authenticated (chunks so acessados via Edge Function/service_role). Dropar `dc_select` existente.

**1.4 Ajustar RLS em `doc_chunk_embeddings`** — dropar `dce_select`. Sem SELECT para authenticated.

**1.5 Ajustar RLS em `doc_text_extractions`** — dropar `dte_select` aberto. Criar SELECT restrito a c-level (para dashboard de monitoramento):
```sql
CREATE POLICY "dte_select_clevel" ON doc_text_extractions FOR SELECT TO authenticated USING (public.is_clevel());
```

**1.6 Tabela `doc_templates`** — versionamento de templates:
```sql
CREATE TABLE public.doc_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL,
  version text NOT NULL DEFAULT '1.0.0',
  title text NOT NULL,
  body_markdown text NOT NULL,
  schema_json jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(template_key, version)
);
ALTER TABLE public.doc_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dt_select" ON doc_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "dt_insert" ON doc_templates FOR INSERT TO authenticated WITH CHECK (public.is_clevel());
CREATE POLICY "dt_update" ON doc_templates FOR UPDATE TO authenticated USING (public.is_clevel());
CREATE POLICY "dt_delete" ON doc_templates FOR DELETE TO authenticated USING (public.is_clevel());
```

**1.7 Adicionar coluna `tsv` em `doc_chunks`** (se ausente — verificar se ja existe da migracao IA-4). Adicionar GIN index.

**1.8 Seed dos 4 templates iniciais** (contrato_govtech, contrato_privado, tr_padrao, tr_completo) com o conteudo formal de `draftTemplates.ts` convertido para markdown com placeholders `{{campo}}`.

---

### 2. Edge Function: `doc-extract` (ajustes)

Atualmente faz extracao basica com regex. Ajustes:
- Adicionar `page_start`/`page_end` estimados nos chunks (baseado em posicao relativa do texto)
- Melhorar chunking: 800-1200 chars com 10% overlap (atualmente 1000/100)
- Adicionar `chunk_hash` via hash simples (ja existe)
- Deduplicar por `(document_id, chunk_hash)` antes de inserir

Sem mudancas estruturais grandes — a funcao ja funciona.

---

### 3. Edge Function: `doc-embed` (nao criar)

Conforme decisao da IA-4, o gateway nao expoe endpoint de embeddings. Manter FTS com `match_chunks_fts`. A tabela `doc_chunk_embeddings` existe preparada para futuro. Nao criar edge function `doc-embed` neste bloco.

---

### 4. Frontend: `AILogsPage.tsx` (ajustes)

- Adicionar secao "Monitoramento de Extracao" (Admin):
  - Chamar `get_doc_extractions_status()` via `supabase.rpc()`
  - Exibir contagens: queued, processing, done, failed, no_text
  - Lista de falhas recentes
  - Botao "Reindexar documentos" ja existe — manter

---

### 5. Frontend: Gestao de Templates (Admin)

Nova secao em `AILogsPage.tsx` ou nova tab no `AIPageLayout`:
- Tab "Templates" (visivel apenas Admin)
- Lista templates com versao ativa
- Dialog para editar body_markdown (textarea grande)
- Botao "Publicar nova versao" (incrementa version, cria novo registro, desativa anterior)
- Preview do markdown renderizado
- CRUD via supabase client (RLS protege)

---

### 6. Frontend: `AIDraftsPage.tsx` (ajustes)

- Na geracao com IA, buscar template ativo do DB (`doc_templates` onde `template_key` = tipo e `is_active = true`)
- Passar `template_version` para a edge function `ai-draft-generate`
- Na geracao local (sem IA), continuar usando `draftTemplates.ts` como fallback

---

### 7. Frontend: `draftTemplates.ts` (manter como fallback)

Nao remover — serve como fallback quando DB nao disponivel ou para geracao local.

---

### Arquivos

**Novos:**
- SQL migration (RLS + `doc_templates` + seed + functions)

**Editados:**
- `src/pages/AILogsPage.tsx` — monitoramento extracao + gestao templates
- `src/pages/AIDraftsPage.tsx` — buscar template do DB
- `src/components/ai/AIPageLayout.tsx` — adicionar tab "Templates" (se Admin)
- `supabase/functions/doc-extract/index.ts` — melhorias chunking

**Nao alterados:**
- Todas as edge functions existentes, modulos, calculos, permissoes

