

## Plan: Feedz Sync V2 — Report, Match Hardening, Aliases & Enhanced Rollback

This is a large incremental upgrade to the Feedz integration. The plan preserves all existing functionality and adds layers of safety, auditability, and control.

---

### Database Changes (Migration)

**1. New table `feedz_sync_items`** (replaces reliance on `feedz_sync_events` for audit detail)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| sync_run_id | uuid FK | |
| feedz_id | text | external employee id |
| feedz_email | text | |
| feedz_name | text | |
| match_strategy | text | `FEEDZ_ID`, `EMAIL`, `PHONE`, `NAME_SCORE`, `NONE` |
| matched_hr_person_id | uuid nullable | |
| action | text | `INSERT`, `UPDATE`, `SKIP`, `PENDING`, `CONFLICT` |
| reason_code | text nullable | `NO_MATCH`, `EMAIL_CONFLICT`, `LOW_SCORE`, `MISSING_KEY`, etc. |
| fields_changed_json | jsonb | `[{field, before, after}]` for updates |
| snapshot_before | jsonb nullable | full record before update (for rollback) |
| created_at | timestamptz | |

RLS: same pattern as `feedz_sync_events` (c-level insert, all select).

**2. New table `feedz_alias_mappings`**

| Column | Type |
|--------|------|
| id | uuid PK |
| alias_type | text (`cargo` or `departamento`) |
| feedz_value | text (exact Feedz string) |
| internal_id | uuid nullable (job_title or team id) |
| internal_label | text (canonical name) |
| is_active | boolean default true |
| created_at, updated_at | timestamptz |

RLS: c-level full CRUD, all select.

**3. New columns on `feedz_sync_runs`**

- `matched_by_feedz_id` integer default 0
- `matched_by_email` integer default 0
- `matched_by_phone` integer default 0
- `matched_by_name_score` integer default 0
- `initiated_by` uuid nullable
- `sync_mode` text default 'strict' (strict | permissive)

**4. Add `phone_norm` column to `hr_people`** (text, nullable) for phone-based matching.

**5. Unique constraint on `hr_people.id_externo`** (partial — WHERE id_externo IS NOT NULL).

---

### Edge Function: `feedz-sync` (Rewrite Core Logic)

Preserve structure, enhance matching pipeline:

1. **Normalization layer** (before any matching):
   - `email_norm = trim(lowercase(email))`, strip invisible chars
   - `phone_norm = digits only`, prepend `55` if 10-11 digits
   - `name_norm` = existing `normalizeName()`

2. **Match cascade** (updated order):
   - Step 1: `feedz_id` (id_externo) — strong match
   - Step 2: `email_norm` — strong fallback. If email matches but id_externo diverges → CONFLICT
   - Step 3: `phone_norm` — moderate fallback (new)
   - Step 4: `name_norm + score` — weak fallback, threshold ≥ 1.2 for auto-match

3. **Anti-insert rule** (critical change):
   - Only INSERT if: feedz_id present AND email present AND no existing record with same email AND no probable name match (score ≥ 1.0)
   - Otherwise → PENDING

4. **Alias resolution** for cargo/depto:
   - Load `feedz_alias_mappings` at start
   - Before resolving cargo/team, check alias table first
   - In strict mode: if no alias and no exact match → PENDING (don't auto-create)
   - In permissive mode: auto-create as before

5. **Per-item audit** (`feedz_sync_items`):
   - For every Feedz record processed, insert a row with match_strategy, action, reason_code
   - For UPDATEs: store `snapshot_before` (full hr_people row before update) and `fields_changed_json` with before/after per field
   - For INSERTs: store the created hr_person_id

6. **Counters**: track `matched_by_*` counters and save to `feedz_sync_runs`.

---

### Edge Function: `feedz-rollback` (Enhanced)

1. Accept `runId` parameter (any run, not just latest).
2. Load all `feedz_sync_items` for that run.
3. For items with `action = 'INSERT'`: delete the hr_person (and timeline entries).
4. For items with `action = 'UPDATE'` and `snapshot_before` present: restore the previous field values from snapshot.
5. **Safety check**: if a subsequent sync run (newer) modified the same hr_person_id, warn/block unless force flag is set.
6. Mark run as `rolled_back`.

---

### Frontend: Export Report per Run

Add "Exportar Relatório" button per run in `SettingsPage.tsx` (FeedzSyncSection).

On click:
1. Fetch all `feedz_sync_items` for that `run_id`
2. Generate XLSX using existing native XLSX builder in `importExport.ts` with 5 sheets:
   - **Resumo**: run totals
   - **Inserções**: items where action=INSERT
   - **Atualizações**: items where action=UPDATE, with before/after columns
   - **Pendências**: action=PENDING with suggested matches
   - **Conflitos**: action=CONFLICT

---

### Frontend: Alias Management UI

Add a new section in `SettingsPage.tsx` (or a sub-page) for managing `feedz_alias_mappings`:
- Table listing aliases (type, feedz_value, internal_label)
- Add/Edit/Delete dialog
- Filter by type (cargo/departamento)

Add a strict/permissive toggle that saves to `feedz_sync_runs.sync_mode` (or a settings-level config).

---

### Frontend: Enhanced Rollback UI

In the runs table:
- Show "Rollback" button for any `success` run (not just the latest)
- Dialog shows what will be reverted (X inserts deleted, Y updates restored)
- Warn if subsequent syncs touched same records

---

### Files to Create/Modify

| File | Action |
|------|--------|
| Migration SQL | Create `feedz_sync_items`, `feedz_alias_mappings`, alter `feedz_sync_runs`, alter `hr_people` |
| `supabase/functions/feedz-sync/index.ts` | Major rewrite of matching + audit logic |
| `supabase/functions/feedz-rollback/index.ts` | Add UPDATE rollback + per-run support |
| `src/pages/SettingsPage.tsx` | Export button, alias management, enhanced rollback UI, strict/permissive toggle |
| `src/pages/FeedzReconciliationPage.tsx` | Minor updates to use new `feedz_sync_items` data |
| `src/lib/importExport.ts` | Add sync report XLSX generation function |

---

### Implementation Order

1. Database migration (new tables + columns)
2. Edge function `feedz-sync` rewrite (matching hardening + audit items)
3. Edge function `feedz-rollback` enhancement (update rollback + any run)
4. Frontend: export report generation
5. Frontend: alias management UI + strict/permissive toggle
6. Frontend: enhanced rollback UI per run

