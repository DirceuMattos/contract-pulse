import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface FeedzEmployee {
  employeeId: number
  name: string
  full_name?: string
  email?: string
  cpf?: string
  remuneration?: string
  admission_at?: string
  status?: string
  department?: string
  department_data?: { id: number; name: string }
  job_description?: { id: number; title: string; description?: string }
  description?: string
  phone?: string
  cellphone?: string
  dismissal_at?: string
  last_day_worked?: string
  registration?: string // Company internal matricula (UNIQUE per company)
}

// ─── NORMALIZATION ───────────────────────────────────────────────────────────
function normalizeName(name: string): string {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (!digits || digits.length < 8) return null
  if (digits.length === 10 || digits.length === 11) return '55' + digits
  return digits
}

// ─── PAYLOAD HASH ────────────────────────────────────────────────────────────
function computePayloadHash(data: Record<string, any>): string {
  const keys = ['nome', 'situacao', 'cargo_id', 'team_id', 'email', 'celular', 'data_admissao', 'data_desligamento']
  const obj: Record<string, string> = {}
  for (const k of keys) obj[k] = String(data[k] ?? '')
  const str = JSON.stringify(obj)
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return hash.toString(36)
}

// ─── FEEDZ API ───────────────────────────────────────────────────────────────
async function fetchAllFeedzEmployees(feedzToken: string): Promise<FeedzEmployee[]> {
  const baseUrl = 'https://app.feedz.com.br/v2/integracao/employees'
  const statuses = ['Ativo', 'Desligado', 'Desativado']
  const statusParams = statuses.map(s => `status[]=${encodeURIComponent(s)}`).join('&')
  const url = `${baseUrl}?${statusParams}`

  console.log(`[feedz-sync] Fetching: ${url}`)
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${feedzToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'BNP-Contratos/1.0',
    },
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Feedz API error ${response.status}: ${errText.substring(0, 200)}`)
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error(`Feedz API returned non-JSON response (${contentType}). Possible Cloudflare block.`)
  }

  const data = await response.json()
  if (Array.isArray(data)) return data
  if (data.data && Array.isArray(data.data)) return data.data
  throw new Error('Unexpected Feedz API response format')
}

// ─── NORMALIZE FEEDZ STATUS ──────────────────────────────────────────────────
function normalizeFeedzStatus(status: string | undefined): 'ativo' | 'inativo' {
  const s = (status || '').toLowerCase().trim()
  if (s === 'desligado' || s === 'desativado' || s === 'inativo') return 'inativo'
  return 'ativo'
}

// ─── EXTRACT TERMINATION DATE ────────────────────────────────────────────────
function extractTerminationDate(person: FeedzEmployee): string | null {
  const raw = person.dismissal_at || person.last_day_worked || null
  if (!raw) return null
  const d = new Date(raw)
  if (isNaN(d.getTime())) return null
  return d.toISOString().split('T')[0]
}

// ─── EXTRACT MATRICULA ──────────────────────────────────────────────────────
// The Feedz API 'registration' field is the company's internal matricula.
// 'employeeId' is the Feedz internal ID (stored as hr_people.id_externo).
function extractMatricula(person: FeedzEmployee): string {
  return String(person.registration || '').trim()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const feedzToken = Deno.env.get('FEEDZ_API_TOKEN')

  if (!feedzToken) {
    return new Response(JSON.stringify({ error: 'FEEDZ_API_TOKEN not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
  const userId = user.id

  const db = createClient(supabaseUrl, supabaseServiceKey)

  const { data: roleCheck } = await db.rpc('has_role', { _user_id: userId, _role: 'c-level' })
  if (!roleCheck) {
    return new Response(JSON.stringify({ error: 'Forbidden: c-level only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // Parse optional sync_mode
  let syncMode = 'strict'
  try {
    const body = await req.json()
    if (body?.sync_mode === 'permissive') syncMode = 'permissive'
  } catch { /* no body */ }

  // Create sync run
  const { data: syncRun, error: runError } = await db.from('feedz_sync_runs').insert({
    status: 'running', started_at: new Date().toISOString(), initiated_by: userId, sync_mode: syncMode,
  }).select().single()

  if (runError || !syncRun) {
    return new Response(JSON.stringify({ error: 'Failed to create sync run' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const runId = syncRun.id
  let processed = 0, createdCount = 0, updatedCount = 0, terminatedCount = 0, inconsistencyCount = 0

  try {
    const feedzData = await fetchAllFeedzEmployees(feedzToken)

    // ─── DETECT DUPLICATE MATRICULAS IN FEEDZ ──────────────────────────
    // Use 'registration' as the real internal matricula
    const matriculaCounts = new Map<string, number>()
    for (const e of feedzData) {
      const m = extractMatricula(e)
      if (m) matriculaCounts.set(m, (matriculaCounts.get(m) || 0) + 1)
    }
    const duplicateMatriculas = new Set<string>()
    for (const [m, count] of matriculaCounts) {
      if (count > 1) duplicateMatriculas.add(m)
    }

    // Load existing data
    const { data: existingPeople } = await db.from('hr_people').select('*')
    const { data: existingJobs } = await db.from('job_titles').select('*')
    const { data: existingTeams } = await db.from('teams').select('*')
    const { data: aliases } = await db.from('feedz_alias_mappings').select('*').eq('is_active', true)

    const allPeople: any[] = existingPeople || []

    // Build matricula → hr_people[] map (should be 1:1 with UNIQUE, but check for >1)
    const matriculaMap = new Map<string, any[]>()
    for (const p of allPeople) {
      if (p.matricula) {
        const key = String(p.matricula).trim()
        const arr = matriculaMap.get(key) || []
        arr.push(p)
        matriculaMap.set(key, arr)
      }
    }

    const jobMap = new Map<string, any>()
    for (const j of (existingJobs || [])) jobMap.set(j.label.toLowerCase(), j)

    const teamMap = new Map<string, any>()
    for (const t of (existingTeams || [])) teamMap.set(t.name.toLowerCase(), t)

    // Alias maps
    const cargoAliasMap = new Map<string, any>()
    const deptoAliasMap = new Map<string, any>()
    for (const a of (aliases || [])) {
      if (a.alias_type === 'cargo') cargoAliasMap.set(a.feedz_value.toLowerCase(), a)
      else if (a.alias_type === 'departamento') deptoAliasMap.set(a.feedz_value.toLowerCase(), a)
    }

    // Load last payload hashes for idempotency
    const { data: lastChanges } = await db.from('feedz_sync_change')
      .select('matricula, payload_hash')
      .not('payload_hash', 'is', null)
      .in('action', ['updated', 'created', 'terminated'])
      .order('created_at', { ascending: false })
    const lastHashMap = new Map<string, string>()
    for (const item of (lastChanges || [])) {
      if (item.matricula && item.payload_hash && !lastHashMap.has(item.matricula)) {
        lastHashMap.set(item.matricula, item.payload_hash)
      }
    }

    const syncChanges: any[] = []
    const syncInconsistencies: any[] = []
    const processedMatriculas = new Set<string>()

    for (const person of feedzData) {
      processed++
      // CRITICAL: Use person.registration (company internal matricula), NOT person.employeeId
      const matricula = extractMatricula(person)
      const feedzEmployeeId = String(person.employeeId || '').trim()
      const feedzName = person.full_name || person.name || ''
      const feedzEmailRaw = person.email || null
      const feedzPhoneRaw = person.cellphone || person.phone || null
      const feedzPhoneNorm = normalizePhone(feedzPhoneRaw)
      const feedzDept = person.department_data?.name || (typeof person.department === 'string' ? person.department : null)
      const feedzJob = person.job_description?.title || null
      const feedzAdmission = person.admission_at || null
      const feedzStatus = normalizeFeedzStatus(person.status)
      const terminationDate = extractTerminationDate(person)
      const rawRemuneracao = person.remuneration ? parseFloat(person.remuneration) : null
      const remuneracaoValid = rawRemuneracao !== null && !isNaN(rawRemuneracao) && rawRemuneracao > 0

      const now = new Date().toISOString()
      const minPayload = { matricula, employeeId: feedzEmployeeId, nome: feedzName, email: feedzEmailRaw, status: person.status, department: feedzDept, job: feedzJob }

      // ─── RULE 1: Missing matricula ─────────────────────────────────────
      if (!matricula) {
        inconsistencyCount++
        syncInconsistencies.push({ run_id: runId, matricula: null, reason_code: 'MISSING_MATRICULA', reason_detail: `Registro sem matrícula (registration vazio): ${feedzName} (employeeId=${feedzEmployeeId})`, feedz_payload: minPayload })
        syncChanges.push({ run_id: runId, matricula: null, action: 'inconsistency', synced_at: now, payload_hash: null })
        continue
      }

      // ─── RULE 2: Duplicate matricula in Feedz ──────────────────────────
      if (duplicateMatriculas.has(matricula)) {
        if (processedMatriculas.has(matricula)) continue // skip subsequent dupes
        inconsistencyCount++
        syncInconsistencies.push({ run_id: runId, matricula, reason_code: 'DUPLICATE_MATRICULA_FEEDZ', reason_detail: `Matrícula ${matricula} aparece ${matriculaCounts.get(matricula)}x no Feedz`, feedz_payload: minPayload })
        syncChanges.push({ run_id: runId, matricula, action: 'inconsistency', synced_at: now, payload_hash: null })
        processedMatriculas.add(matricula)
        continue
      }

      // Intra-run dedup
      if (processedMatriculas.has(matricula)) continue
      processedMatriculas.add(matricula)

      // ─── RESOLVE CARGO ─────────────────────────────────────────────────
      let cargoId: string | null = null
      if (feedzJob) {
        const alias = cargoAliasMap.get(feedzJob.toLowerCase())
        if (alias && alias.internal_id) {
          cargoId = alias.internal_id
        } else {
          const existingJob = jobMap.get(feedzJob.toLowerCase())
          if (existingJob) {
            cargoId = existingJob.id
          } else if (syncMode === 'permissive') {
            const { data: newJob } = await db.from('job_titles').insert({ label: feedzJob, is_active: true, origin: 'feedz' }).select().single()
            if (newJob) { cargoId = newJob.id; jobMap.set(feedzJob.toLowerCase(), newJob) }
          }
        }
      }

      // ─── RESOLVE TEAM ──────────────────────────────────────────────────
      let teamId: string | null = null
      if (feedzDept) {
        const alias = deptoAliasMap.get(feedzDept.toLowerCase())
        if (alias && alias.internal_id) {
          teamId = alias.internal_id
        } else {
          const existingTeam = teamMap.get(feedzDept.toLowerCase())
          if (existingTeam) {
            teamId = existingTeam.id
          } else if (syncMode === 'permissive') {
            const { data: newTeam } = await db.from('teams').insert({ name: feedzDept, is_active: true, origin: 'feedz' }).select().single()
            if (newTeam) { teamId = newTeam.id; teamMap.set(feedzDept.toLowerCase(), newTeam) }
          }
        }
      }

      // ─── LOOKUP IN SYSTEM BY MATRICULA ─────────────────────────────────
      const matches = matriculaMap.get(matricula) || []

      if (matches.length > 1) {
        // Multiple matches — should not happen with UNIQUE but safety net
        inconsistencyCount++
        syncInconsistencies.push({ run_id: runId, matricula, reason_code: 'MULTIPLE_MATCHES_IN_SYSTEM', reason_detail: `Matrícula ${matricula} tem ${matches.length} registros no sistema`, feedz_payload: minPayload })
        syncChanges.push({ run_id: runId, matricula, action: 'inconsistency', synced_at: now, payload_hash: null })
        continue
      }

      const existing = matches.length === 1 ? matches[0] : null

      // ─── CLASSIFICATION ────────────────────────────────────────────────
      if (!existing) {
        // NOT FOUND in system
        if (feedzStatus === 'ativo' && !terminationDate) {
          // ─── CASE A: CREATE ────────────────────────────────────────────
          const dbPayload: Record<string, any> = {
            nome: feedzName, tipo_vinculo: 'clt', situacao: 'ativo',
            cargo_id: cargoId, team_id: teamId,
            data_admissao: feedzAdmission || new Date().toISOString().split('T')[0],
            email: feedzEmailRaw, celular: feedzPhoneRaw, phone_norm: feedzPhoneNorm,
            remuneracao_mensal: remuneracao, matricula,
            id_externo: feedzEmployeeId, source: 'feedz', sync_status: 'synced',
            last_synced_at: now, nome_normalizado: normalizeName(feedzName), updated_at: now,
          }

          const payloadHash = computePayloadHash(dbPayload)
          const { data: inserted, error: insertErr } = await db.from('hr_people').insert(dbPayload).select('id').single()

          if (!insertErr && inserted) {
            createdCount++
            syncChanges.push({
              run_id: runId, matricula, hr_people_id: inserted.id, action: 'created',
              synced_at: now, after_snapshot: dbPayload, payload_hash: payloadHash,
            })

            // Timeline: Admissão
            await db.from('hr_timeline').insert({
              person_id: inserted.id, event_date: dbPayload.data_admissao,
              ocorrencia: 'admissao', descricao: `Admissão sincronizada via Feedz (matrícula ${matricula})`,
              atualizar_remuneracao: false, source: 'feedz', sync_run_id: runId,
            })
          } else {
            console.error(`[feedz-sync] Insert error for matricula=${matricula}: ${insertErr?.message}`)
            inconsistencyCount++
            syncInconsistencies.push({ run_id: runId, matricula, reason_code: 'PARSE_ERROR', reason_detail: `Erro ao inserir: ${insertErr?.message}`, feedz_payload: minPayload })
            syncChanges.push({ run_id: runId, matricula, action: 'inconsistency', synced_at: now, payload_hash: null })
          }
        } else {
          // Not found + not active or has termination date → inconsistency
          inconsistencyCount++
          const reason = feedzStatus !== 'ativo'
            ? 'INVALID_STATUS_COMBINATION'
            : 'TERMINATION_DATE_WITH_ACTIVE_STATUS'
          syncInconsistencies.push({ run_id: runId, matricula, reason_code: reason, reason_detail: `Não encontrado no sistema. Status=${person.status}, data_desligamento=${terminationDate || 'vazio'}`, feedz_payload: minPayload })
          syncChanges.push({ run_id: runId, matricula, action: 'inconsistency', synced_at: now, payload_hash: null })
        }
      } else {
        // FOUND in system (1 match)
        if (feedzStatus === 'ativo' && !terminationDate) {
          // ─── CASE C: UPDATE ────────────────────────────────────────────
          const dbPayload: Record<string, any> = {
            nome: feedzName, tipo_vinculo: 'clt', situacao: 'ativo',
            cargo_id: cargoId, team_id: teamId,
            data_admissao: feedzAdmission || existing.data_admissao,
            email: feedzEmailRaw, celular: feedzPhoneRaw, phone_norm: feedzPhoneNorm,
            remuneracao_mensal: remuneracao, matricula,
            id_externo: feedzEmployeeId, source: 'feedz', sync_status: 'synced',
            last_synced_at: now, nome_normalizado: normalizeName(feedzName), updated_at: now,
          }

          // Handle reactivation (inativo → ativo)
          if (existing.situacao !== 'ativo') {
            dbPayload.data_desligamento = null
            dbPayload.tipo_desligamento = null
            dbPayload.motivo_desligamento = null
          }

          const payloadHash = computePayloadHash(dbPayload)

          // Idempotency check
          const lastHash = lastHashMap.get(matricula)
          if (lastHash && lastHash === payloadHash && existing.last_synced_at) {
            // No change — skip
            await db.from('hr_people').update({ last_synced_at: now }).eq('id', existing.id)
            continue
          }

          // Compute changed fields
          const fieldsChanged: { field: string; before: any; after: any }[] = []
          const snapshotBefore: Record<string, any> = {}
          const checkFields = ['nome', 'tipo_vinculo', 'situacao', 'cargo_id', 'team_id', 'email', 'celular', 'remuneracao_mensal', 'data_admissao']
          for (const key of checkFields) {
            snapshotBefore[key] = existing[key]
            if (String(existing[key] ?? '') !== String(dbPayload[key] ?? '')) {
              fieldsChanged.push({ field: key, before: existing[key], after: dbPayload[key] })
            }
          }

          if (fieldsChanged.length === 0 && existing.last_synced_at) {
            // No actual changes
            await db.from('hr_people').update({ last_synced_at: now }).eq('id', existing.id)
            continue
          }

          const { error: updateErr } = await db.from('hr_people').update(dbPayload).eq('id', existing.id)
          if (!updateErr) {
            updatedCount++
            syncChanges.push({
              run_id: runId, matricula, hr_people_id: existing.id, action: 'updated',
              synced_at: now, changed_fields: fieldsChanged, before_snapshot: snapshotBefore,
              after_snapshot: dbPayload, payload_hash: payloadHash,
            })

            // Timeline events for sensitive changes
            if (existing.situacao !== 'ativo' && dbPayload.situacao === 'ativo') {
              await db.from('hr_timeline').insert({
                person_id: existing.id, event_date: new Date().toISOString().split('T')[0],
                ocorrencia: 'reativacao', descricao: `Reativação sincronizada via Feedz (matrícula ${matricula})`,
                atualizar_remuneracao: false, source: 'feedz', sync_run_id: runId,
              })
            }

            if (fieldsChanged.some(f => f.field === 'cargo_id')) {
              const oldLabel = (existingJobs || []).find((j: any) => j.id === existing.cargo_id)?.label || 'Sem cargo'
              const newLabel = feedzJob || 'Sem cargo'
              await db.from('hr_people').update({ cargo_antigo: oldLabel }).eq('id', existing.id)
              await db.from('hr_timeline').insert({
                person_id: existing.id, event_date: new Date().toISOString().split('T')[0],
                ocorrencia: 'mudanca-cargo', descricao: `Cargo alterado via Feedz: ${oldLabel} → ${newLabel}`,
                atualizar_remuneracao: false, source: 'feedz', sync_run_id: runId,
              })
            }

            if (fieldsChanged.some(f => f.field === 'remuneracao_mensal')) {
              const oldR = Number(existing.remuneracao_mensal)
              await db.from('hr_timeline').insert({
                person_id: existing.id, event_date: new Date().toISOString().split('T')[0],
                ocorrencia: 'reajuste', descricao: `Remuneração alterada via Feedz: R$ ${oldR.toFixed(2)} → R$ ${remuneracao.toFixed(2)}`,
                valor: remuneracao - oldR, remuneracao_apos: remuneracao,
                atualizar_remuneracao: false, source: 'feedz', sync_run_id: runId,
              })
            }

            if (fieldsChanged.some(f => f.field === 'tipo_vinculo')) {
              await db.from('hr_timeline').insert({
                person_id: existing.id, event_date: new Date().toISOString().split('T')[0],
                ocorrencia: 'mudanca-vinculo', descricao: `Vínculo alterado via Feedz: ${existing.tipo_vinculo} → ${dbPayload.tipo_vinculo}`,
                atualizar_remuneracao: false, source: 'feedz', sync_run_id: runId,
              })
            }
          }
        } else if (feedzStatus === 'inativo' && terminationDate) {
          // ─── CASE B: TERMINATE ─────────────────────────────────────────
          const snapshotBefore: Record<string, any> = {}
          const termFields = ['situacao', 'data_desligamento', 'tipo_desligamento', 'motivo_desligamento', 'last_synced_at', 'sync_status']
          for (const k of termFields) snapshotBefore[k] = existing[k]

          const dbPayload: Record<string, any> = {
            situacao: 'inativo',
            data_desligamento: terminationDate,
            tipo_desligamento: 'outro',
            motivo_desligamento: 'Desligamento via Feedz',
            last_synced_at: now,
            sync_status: 'synced',
            updated_at: now,
          }

          const afterSnapshot = { ...snapshotBefore }
          for (const k of Object.keys(dbPayload)) afterSnapshot[k] = dbPayload[k]

          const fieldsChanged = termFields
            .filter(k => String(existing[k] ?? '') !== String(dbPayload[k] ?? ''))
            .map(k => ({ field: k, before: existing[k], after: dbPayload[k] }))

          // Skip if already terminated with same date
          if (existing.situacao === 'inativo' && existing.data_desligamento === terminationDate) {
            await db.from('hr_people').update({ last_synced_at: now }).eq('id', existing.id)
            continue
          }

          const { error: updateErr } = await db.from('hr_people').update(dbPayload).eq('id', existing.id)
          if (!updateErr) {
            terminatedCount++
            const payloadHash = computePayloadHash({ ...existing, ...dbPayload })
            syncChanges.push({
              run_id: runId, matricula, hr_people_id: existing.id, action: 'terminated',
              synced_at: now, changed_fields: fieldsChanged, before_snapshot: snapshotBefore,
              after_snapshot: afterSnapshot, payload_hash: payloadHash,
            })

            await db.from('hr_timeline').insert({
              person_id: existing.id, event_date: terminationDate,
              ocorrencia: 'desligamento', descricao: `Desligamento sincronizado via Feedz (matrícula ${matricula}). Data: ${terminationDate}`,
              atualizar_remuneracao: false, source: 'feedz', sync_run_id: runId,
            })
          }
        } else if (feedzStatus === 'ativo' && terminationDate) {
          // INCONSISTENCY: active with termination date
          inconsistencyCount++
          syncInconsistencies.push({ run_id: runId, matricula, reason_code: 'TERMINATION_DATE_WITH_ACTIVE_STATUS', reason_detail: `Status ativo mas data desligamento=${terminationDate}`, feedz_payload: minPayload })
          syncChanges.push({ run_id: runId, matricula, action: 'inconsistency', synced_at: now, payload_hash: null })
        } else if (feedzStatus === 'inativo' && !terminationDate) {
          // INCONSISTENCY: inactive without termination date
          inconsistencyCount++
          syncInconsistencies.push({ run_id: runId, matricula, reason_code: 'NO_TERMINATION_DATE_WITH_INACTIVE_STATUS', reason_detail: `Status inativo/desligado sem data de desligamento`, feedz_payload: minPayload })
          syncChanges.push({ run_id: runId, matricula, action: 'inconsistency', synced_at: now, payload_hash: null })
        } else {
          // Catch-all inconsistency
          inconsistencyCount++
          syncInconsistencies.push({ run_id: runId, matricula, reason_code: 'INVALID_STATUS_COMBINATION', reason_detail: `Combinação inesperada: status=${person.status}, termination=${terminationDate}`, feedz_payload: minPayload })
          syncChanges.push({ run_id: runId, matricula, action: 'inconsistency', synced_at: now, payload_hash: null })
        }
      }
    }

    // Batch insert changes (chunks of 100)
    for (let i = 0; i < syncChanges.length; i += 100) {
      await db.from('feedz_sync_change').insert(syncChanges.slice(i, i + 100))
    }

    // Batch insert inconsistencies
    for (let i = 0; i < syncInconsistencies.length; i += 100) {
      await db.from('feedz_sync_inconsistency').insert(syncInconsistencies.slice(i, i + 100))
    }

    // Finalize run
    await db.from('feedz_sync_runs').update({
      status: 'success', ended_at: new Date().toISOString(),
      records_processed: processed, records_created: createdCount,
      records_updated: updatedCount, records_terminated: terminatedCount,
      inconsistency_count: inconsistencyCount,
      records_pending: 0, records_conflicts: 0,
      matched_by_feedz_id: 0, matched_by_email: 0, matched_by_phone: 0, matched_by_name_score: 0,
    }).eq('id', runId)

    return new Response(JSON.stringify({
      success: true, runId, processed, created: createdCount, updated: updatedCount,
      terminated: terminatedCount, inconsistencies: inconsistencyCount,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err: any) {
    console.error(`[feedz-sync] Error: ${err.message}`)
    await db.from('feedz_sync_runs').update({
      status: 'error', ended_at: new Date().toISOString(),
      records_processed: processed, records_created: createdCount,
      records_updated: updatedCount, records_terminated: terminatedCount,
      inconsistency_count: inconsistencyCount,
      error_message: err.message || 'Unknown error',
    }).eq('id', runId)

    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
