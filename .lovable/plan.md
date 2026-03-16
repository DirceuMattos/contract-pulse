

## Plano: IA-4 — RAG em Documentos + Busca Externa + Geracao de Minutas com Evidencias

### Resumo

Implementar o pipeline completo de IA real para o modulo de Minutas: extracao de texto de documentos anexados, chunking, embeddings (pgvector), consulta RAG semantica, geracao de minutas via Lovable AI Gateway (Gemini), busca externa opcional auditada, e pagina de Logs funcional.

---

### 1. Banco de Dados (Migracoes SQL)

**Tabelas novas:**

- `doc_text_extractions` — status de extracao por documento (document_id FK, status enum, extracted_text, error_message, extracted_at)
- `doc_chunks` — pedacos de texto (document_id, chunk_index, chunk_text, chunk_hash, page_start, page_end, token_count_est)
- `doc_chunk_embeddings` — embeddings via pgvector (chunk_id FK, embedding vector(768), model text). Requer habilitar extensao `vector` (pgvector)
- `ai_runs` — auditoria completa (run_type, user_id, input_json, redaction_level, internal_docs_used, external_sources_used, output_text, output_structured, status, error_message, model, template_version, prompt_hash)
- `ai_external_search_logs` — logs de busca externa (run_id FK, query, sources jsonb, searched_at)

**RLS:**
- `doc_text_extractions`, `doc_chunks`, `doc_chunk_embeddings`: SELECT para authenticated; INSERT/UPDATE/DELETE para service_role (Edge Functions)
- `ai_runs`: SELECT para own user_id OR c-level; INSERT via service_role
- `ai_external_search_logs`: SELECT para c-level; INSERT via service_role

**Funcao SQL:** `match_chunks(query_embedding vector, match_count int, doc_ids uuid[])` — busca por cosine similarity filtrada por documento

---

### 2. Edge Functions (4 novas)

**2.1 `doc-extract`**
- Recebe document_id
- Baixa arquivo do Storage (service_role)
- Extrai texto:
  - PDF: usa pdf-parse (npm) ou envia ao Lovable AI para extracao
  - DOCX: usa mammoth ou similar
  - XLSX: extrai texto de celulas
  - PNG/imagens: marca como "sem texto" (OCR opt-in futuro)
- Gera chunks (800-1200 chars, 10% overlap)
- Salva em doc_text_extractions + doc_chunks
- Atualiza status

**2.2 `doc-embed`**
- Recebe document_id ou lista de chunk_ids
- Gera embeddings via Lovable AI Gateway (model: text-embedding)
- Nota: Lovable AI Gateway suporta apenas chat completions, nao embeddings. Alternativa: usar Gemini para gerar um resumo semantico por chunk e armazenar como texto para keyword search. OU usar a propria API do Gemini para embeddings via gateway se disponivel.
- **Decisao pragmatica**: Na Etapa 1, usar busca por keyword (full-text search com tsvector) em vez de pgvector, pois o gateway nao expoe endpoint de embeddings. pgvector fica preparado para Etapa 2 com API propria.
- Salva em doc_chunk_embeddings (ou usa tsvector index em doc_chunks)

**2.3 `ai-draft-generate`**
- Recebe: tipo, variante, respostas do questionario, doc_ids selecionados, user context
- Monta "Context Pack":
  - Busca chunks relevantes dos docs selecionados (keyword match ou similarity)
  - Aplica redaction por role (remove valores individuais de RH para nao-admin)
- Envia prompt estruturado ao Lovable AI Gateway (google/gemini-3-flash-preview)
- Prompt instrui: gerar minuta PT-BR, usar template, citar evidencias (doc + pagina), listar pendencias
- Usa tool calling para extrair saida estruturada (texto + evidencias JSON)
- Grava em ai_runs
- Retorna minuta + evidencias + pendencias

**2.4 `ai-search-external`** (opcional)
- Recebe query + run_id
- Usa Firecrawl (se connector disponivel) ou busca simples
- Registra em ai_external_search_logs
- Retorna fontes encontradas
- Somente Admin pode acionar

---

### 3. Frontend — Ajustes

**3.1 AIDraftsPage.tsx**
- Adicionar botao "Gerar minuta com IA" (ao lado do botao template existente)
- Quando clicado:
  - Chama edge function `doc-extract` para docs selecionados (se ainda nao extraidos)
  - Chama `ai-draft-generate` com respostas + doc_ids
  - Exibe loading com streaming (se possivel) ou aguarda resposta
- Painel lateral "Evidencias usadas" — lista docs/paginas citados pela IA
- Secao "Pendencias" — campos que a IA nao conseguiu preencher
- Toggle "Usar fontes externas" (visivel apenas para Admin)
- Manter botao "Gerar minuta (template)" como alternativa sem IA

**3.2 AILogsPage.tsx**
- Substituir placeholder por pagina funcional
- Listar ai_runs do usuario (ou todos para Admin)
- Exibir: data, tipo, status, docs usados, fontes externas
- Detalhe expandivel: input, output, evidencias
- Botao "Reindexar documentos" (Admin) — chama doc-extract para docs pendentes
- Filtros: tipo de run, periodo, status

**3.3 ContractDocumentsTab (ajuste menor)**
- Apos upload de documento, disparar extracao automatica (chamar doc-extract)
- Badge no documento: "Indexado" / "Pendente" / "Sem texto"

---

### 4. Seguranca

- Edge functions validam JWT via getClaims
- doc-extract/doc-embed usam service_role para acessar Storage
- ai-draft-generate aplica redaction: se role != c-level, remove remuneracao individual dos chunks
- ai_runs registra redaction_level
- RLS garante que usuarios so veem seus proprios runs (exceto Admin)

---

### 5. Arquivos

**Novos (8):**
- `supabase/functions/doc-extract/index.ts`
- `supabase/functions/doc-embed/index.ts`
- `supabase/functions/ai-draft-generate/index.ts`
- `supabase/functions/ai-search-external/index.ts`
- SQL migration (tabelas + extensoes + funcoes)

**Editados (4):**
- `src/pages/AIDraftsPage.tsx` — botao IA, painel evidencias
- `src/pages/AILogsPage.tsx` — pagina funcional
- `src/components/contracts/ContractDocumentsTab.tsx` — trigger extracao pos-upload
- `supabase/config.toml` — registrar novas functions

**Nao alterados:**
- Todos os modulos existentes, calculos, overhead, RH, permissoes

---

### 6. Decisao tecnica: Embeddings vs Full-Text Search

O Lovable AI Gateway (`ai.gateway.lovable.dev`) expoe apenas `/v1/chat/completions`, nao um endpoint de embeddings. Duas opcoes:

**Opcao A (recomendada para Etapa 1):** Full-text search com tsvector no Postgres. Simples, sem dependencia externa, funciona bem para docs estruturados. pgvector fica preparado (tabela criada) para futuro.

**Opcao B:** Usar o proprio LLM (Gemini) para gerar embeddings simulados via prompt. Funciona mas e lento e custoso.

Recomendo **Opcao A** agora. A tabela doc_chunk_embeddings sera criada mas ficara vazia ate haver um endpoint de embeddings disponivel.

