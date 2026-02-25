

# Plan: Feedz/TOTVS Integration + Replace "Excluir" with "Desligamento"

This is a large feature with two main parts: (A) the Feedz API integration backend, and (B) UX changes to replace the delete flow with a termination (desligamento) flow. Below is the detailed implementation plan.

---

## Part 1: Database Changes

### 1.1 Add `cooperado` to `tipo_vinculo` support
The `hr_people.tipo_vinculo` column is `text`, so no schema change needed. Update the TypeScript type `HRTipoVinculo` to include `'cooperado'`.

### 1.2 Add `feedz_external_id` column to `hr_people`
Already has `id_externo` column -- will reuse this as the Feedz external ID for sync deduplication. No new column needed.

### 1.3 Add `origin` column to `job_titles` and `teams`
New nullable `text` column `origin` (values: `'feedz'`, `'manual'`, `null`) on both tables to track auto-created records.

### 1.4 Create `feedz_sync_runs` table
Columns: `id`, `started_at`, `ended_at`, `status` (text: `success`/`error`/`running`), `records_processed`, `records_created`, `records_updated`, `records_terminated`, `error_message`, `created_at`.

### 1.5 Create `feedz_sync_events` table
Columns: `id`, `sync_run_id` (FK), `external_id`, `event_type` (text: `create`/`update`/`terminate`), `fields_changed` (text[]), `summary` (text), `created_at`.

### 1.6 Add `desligamento` to timeline `ocorrencia` values
The column is `text`, no schema change needed. Update TypeScript type only.

### 1.7 RLS policies
- `feedz_sync_runs` and `feedz_sync_events`: SELECT for all authenticated, INSERT/UPDATE/DELETE for c-level only.

---

## Part 2: Edge Function -- `feedz-sync`

A backend Edge Function that:

1. Reads the `FEEDZ_API_TOKEN` secret (to be stored via `add_secret` tool).
2. Authenticates with Feedz API (Bearer token).
3. Fetches the list of collaborators from Feedz.
4. For each collaborator:
   - Matches by `id_externo` (Feedz external ID) or fallback by email.
   - **New person**: inserts into `hr_people` with `id_externo = feedz_id`. Auto-creates `job_titles`/`teams` if not found (with `origin = 'feedz'`).
   - **Existing person, data changed**: updates mapped fields. If cargo or remuneracao changed, creates a timeline event (`mudanca-cargo` or `reajuste`) with `descricao` noting old vs new values and `origem: Feedz Sync`.
   - **Person deactivated in Feedz**: sets `situacao = 'inativo'`, fills `data_desligamento`, `tipo_desligamento = 'outro'`, `motivo_desligamento = 'Desligamento via Feedz'`. Creates timeline event type `desligamento`.
5. All operations are idempotent (upsert by external_id).
6. Logs each run to `feedz_sync_runs` and individual changes to `feedz_sync_events`.
7. Uses service role key for DB writes.

### Scheduling
The function can be triggered manually from Settings or scheduled via `pg_cron` (every 15 min during business hours).

---

## Part 3: TypeScript Type Updates

### `src/types/index.ts`
- `HRTipoVinculo`: add `'cooperado'`
- `HROcorrencia`: add `'desligamento'`
- `HRPerson`: no changes needed (fields already exist)

### `src/lib/dbMappers.ts`
- No changes needed (mappings already handle all hr_people fields)

---

## Part 4: UX -- Replace "Excluir" with "Desligamento"

### 4.1 `src/pages/HRPersonDetailPage.tsx`
- **Remove** the "Excluir" button (lines 123-126) and the `ConfirmDeleteDialog` for person deletion (lines 351-357).
- **Remove** `handleDeletePerson` function and `deletePersonOpen` state.
- **Add** a "Desligamento" button (visible only for `canEdit` and when `person.situacao === 'ativo'`), styled with a warning/destructive variant.
- **Add** a "Desligamento" Dialog/Modal with fields:
  - Data de Desligamento (date, required)
  - Tipo: select (`Solicitou dispensa` / `Desligado/Dispensado` / `Transferido`)
  - Motivo (textarea, required)
  - Observacoes de Desligamento (textarea, optional)
- On confirm:
  - Call `updatePerson(id, { situacao: 'inativo', dataDesligamento, tipoDesligamento, motivoDesligamento, observacoesDesligamento })`
  - Call `addTimelineEvent({ personId, eventDate: dataDesligamento, ocorrencia: 'desligamento', descricao: motivo, ... })`
  - Show success toast
- **Freeze "Tempo de Casa"**: modify `calcularTempoDeCasa` to use `dataDesligamento` as end date when person is inactive with a desligamento date, instead of `new Date()`.
- **Optional "Reativar"** button for inactive persons (c-level only): sets `situacao = 'ativo'`, clears desligamento fields, creates timeline event.

### 4.2 `src/components/hr/HRPersonForm.tsx`
- Add `'cooperado'` option to the Tipo de Vinculo select.
- Remove the ability to directly change `situacao` to `inativo` from this form (desligamento should go through the dedicated flow). Keep it read-only or remove the situacao field from the edit form.

### 4.3 `src/pages/HRPeoplePage.tsx`
- Update the vinculo filter to include `'cooperado'`.
- Update vinculo badge color mapping to include `cooperado`.
- The `calcularTempoDeCasa` function here also needs the frozen-date logic.

### 4.4 `src/components/hr/HRTimelineEventForm.tsx`
- Add `'desligamento'` to ocorrencia options.
- Update the `ocorrenciaLabels` map in detail page.

---

## Part 5: Settings -- Feedz Configuration UI

### `src/pages/SettingsPage.tsx`
Add a new section (visible to c-level only) for Feedz integration:
- Status indicator (last sync time, status)
- "Sincronizar agora" button to manually trigger the `feedz-sync` Edge Function
- Display sync history from `feedz_sync_runs` table

---

## Part 6: Secrets

Before implementing the Edge Function, request the `FEEDZ_API_TOKEN` secret from the user via the `add_secret` tool.

---

## Implementation Order

1. Request `FEEDZ_API_TOKEN` secret from user
2. Database migration (new tables + columns)
3. TypeScript type updates (`types/index.ts`)
4. UX changes (Part 4 -- Desligamento replaces Excluir)
5. Edge Function (`feedz-sync`)
6. Settings UI for Feedz (Part 5)
7. Testing

---

## Technical Details

### Feedz API Base URL
`https://api.feedz.com.br/v2` (to be confirmed with actual docs). Authentication via `Authorization: Bearer <token>` header.

### Field Mapping (Feedz -> hr_people)
```text
Feedz Field          -> DB Column           -> TS Field
---------------------------------------------------------
id (external)        -> id_externo           -> idExterno
nome                 -> nome                 -> nome
tipo_vinculo         -> tipo_vinculo         -> tipoVinculo
situacao             -> situacao             -> situacao
cargo                -> cargo_id (via lookup) -> cargoId
departamento         -> team_id (via lookup)  -> teamId
data_admissao        -> data_admissao        -> dataAdmissao
email                -> email                -> email
celular              -> celular              -> celular
nivel                -> nivel                -> nivel
trilha               -> trilha               -> trilha
remuneracao_mensal   -> remuneracao_mensal   -> remuneracaoMensal
```

### Timeline Event Deduplication
Use composite key: `person_id + ocorrencia + event_date + descricao` hash to prevent duplicate events on re-sync.

### Tempo de Casa Freeze Logic
```typescript
function calcularTempoDeCasa(dataAdmissao: string, dataDesligamento?: string): string {
  const endDate = dataDesligamento ? new Date(dataDesligamento) : new Date();
  const meses = differenceInMonths(endDate, new Date(dataAdmissao));
  // ... rest unchanged
}
```

