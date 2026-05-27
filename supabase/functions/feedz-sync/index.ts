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

interface TurnoverRecord {
  id?: number
  reason?: string
  type?: number
  department?: string
  last_day_working?: string
  profile?: { id: number; name: string; email: string; status: number }
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

// ─── TIMELINE IDEMPOTENT INSERT ──────────────────────────────────────────────
async function insertTimelineIdempotent(db: any, novoEvento: Record<string, any>): Promise<void> {
  const { data: existing } = await db
    .from('hr_timeline')
    .select('id')
    .eq('person_id', novoEvento.person_id)
    .eq('event_date', novoEvento.event_date)
    .eq('ocorrencia', novoEvento.ocorrencia)
    .eq('descricao', novoEvento.descricao)
    .maybeSingle()
  if (existing) return
  await db.from('hr_timeline').insert(novoEvento)
}

// ─── PAYLOAD HASH ────────────────────────────────────────────────────────────
function computePayloadHash(data: Record<string, any>): string {
  const keys = ['nome', 'situacao', 'cargo_id', 'team_id', 'email', 'celular', 'data_admissao', 'data_desligamento', 'remuneracao_mensal']
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
  const list: FeedzEmployee[] = Array.isArray(data)
    ? data
    : (data.data && Array.isArray(data.data) ? data.data : null)
  if (!list) throw new Error('Unexpected Feedz API response format')

  // ─── DEBUG: dump raw payload for employee 2051079 (temporary) ───────────────
  try {
    const target = list.find((e: any) =>
      Number(e?.employeeId) === 2051079 ||
      Number(e?.id) === 2051079 ||
      Number(e?.profile?.id) === 2051079
    )
    if (target) {
      console.log('[feedz-sync][DEBUG-2051079] keys:', JSON.stringify(Object.keys(target as any)))
      const json = JSON.stringify(target, null, 2)
      // Chunk to avoid log truncation (8KB chunks)
      const chunkSize = 8000
      for (let i = 0; i < json.length; i += chunkSize) {
        console.log(`[feedz-sync][DEBUG-2051079] payload[${i}]:`, json.slice(i, i + chunkSize))
      }
    } else {
      console.log('[feedz-sync][DEBUG-2051079] NOT FOUND in', list.length, 'employees')
    }
  } catch (e) {
    console.log('[feedz-sync][DEBUG-2051079] error:', (e as Error).message)
  }

  return list
}

// ─── FEEDZ TURNOVER API ─────────────────────────────────────────────────────
// Fetches turnover data (paginated) to get real dismissal dates (last_day_working).
// Returns a map of profile.id (employeeId) → { date, reason }.
async function fetchTurnoverMap(feedzToken: string): Promise<Map<string, { date: string; reason: string }>> {
  const map = new Map<string, { date: string; reason: string }>()

  try {
    let url: string | null = 'https://app.feedz.com.br/v2/integracao/employees/turnover'
    let pageCount = 0

    while (url) {
      pageCount++
      console.log(`[feedz-sync] Fetching turnover page ${pageCount}: ${url}`)

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
        console.warn(`[feedz-sync] Turnover endpoint returned ${response.status}, skipping enrichment`)
        return map
      }

      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        console.warn(`[feedz-sync] Turnover endpoint returned non-JSON, skipping`)
        return map
      }

      const body = await response.json()
      const records: TurnoverRecord[] = Array.isArray(body) ? body : (body.data && Array.isArray(body.data) ? body.data : [])

      for (const rec of records) {
        const profileId = rec.profile?.id
        if (!profileId) continue

        const rawDate = rec.last_day_working || null
        if (!rawDate) continue

        const d = new Date(rawDate)
        if (isNaN(d.getTime())) continue

        const key = String(profileId)
        if (!map.has(key)) {
          map.set(key, {
            date: d.toISOString().split('T')[0],
            reason: rec.reason || '',
          })
        }
      }

      // Pagination: follow next_page_url if present
      url = body.next_page_url || null
    }

    console.log(`[feedz-sync] Turnover data loaded: ${map.size} records across ${pageCount} page(s)`)
  } catch (err: any) {
    console.warn(`[feedz-sync] Failed to fetch turnover data: ${err.message}. Continuing with fallback.`)
  }

  return map
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
    // Fetch employees and turnover data in parallel
    const [feedzData, turnoverMap] = await Promise.all([
      fetchAllFeedzEmployees(feedzToken),
      fetchTurnoverMap(feedzToken),
    ])

    // ─── DETECT DUPLICATE MATRICULAS IN FEEDZ ──────────────────────────
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

    // Build matricula → hr_people[] map
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
      let terminationDate = extractTerminationDate(person)
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
        if (processedMatriculas.has(matricula)) continue
        inconsistencyCount++
        syncInconsistencies.push({ run_id: runId, matricula, reason_code: 'DUPLICATE_MATRICULA_FEEDZ', reason_detail: `Matrícula ${matricula} aparece ${matriculaCounts.get(matricula)}x no Feedz`, feedz_payload: minPayload })
        syncChanges.push({ run_id: runId, matricula, action: 'inconsistency', synced_at: now, payload_hash: null })
        processedMatriculas.add(matricula)
        continue
      }

      // Intra-run dedup
      if (processedMatriculas.has(matricula)) continue
      processedMatriculas.add(matricula)

      // ─── ENRICH TERMINATION DATE FROM TURNOVER ─────────────────────────
      // If status is inactive but no dismissal date from employees endpoint,
      // try to get the real date from turnover data using employeeId (= profile.id)
      if (feedzStatus === 'inativo' && !terminationDate && feedzEmployeeId) {
        const turnoverInfo = turnoverMap.get(feedzEmployeeId)
        if (turnoverInfo) {
          terminationDate = turnoverInfo.date
          console.log(`[feedz-sync] Enriched termination date for matricula=${matricula} (employeeId=${feedzEmployeeId}) from turnover: ${terminationDate}`)
        }
      }

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
          // tipo_vinculo defaults to 'clt' — NOT available from Feedz employees API
          const dbPayload: Record<string, any> = {
            nome: feedzName, tipo_vinculo: 'clt', situacao: 'ativo',
            cargo_id: cargoId, team_id: teamId,
            data_admissao: feedzAdmission || new Date().toISOString().split('T')[0],
            email: feedzEmailRaw, celular: feedzPhoneRaw, phone_norm: feedzPhoneNorm,
            remuneracao_mensal: remuneracaoValid ? rawRemuneracao : 0, matricula,
            id_externo: feedzEmployeeId, source: 'feedz', sync_status: 'synced',
            last_synced_at: now, nome_normalizado: normalizeName(feedzName), updated_at: now,
          }

          const payloadHash = computePayloadHash(dbPayload)
          const { data: inserted, error: insertErr } = await db.from('hr_people').insert(dbPayload).select('id').single()

          if (!insertErr && inserted) {
            createdCount++
            syncChanges.push({
              run_id: runId, matricula, hr_people_id: inserted.id, action: 'created',
              synced_at: now,
              after_snapshot: { ...dbPayload, _audit_tipo_vinculo: 'valor_padrao_clt_nao_disponivel_feedz' },
              payload_hash: payloadHash,
            })

            // Timeline: Admissão
            await insertTimelineIdempotent(db, {
              person_id: inserted.id, event_date: dbPayload.data_admissao,
              ocorrencia: 'admissao', descricao: `Admissão sincronizada via Feedz (matrícula ${matricula}). tipo_vinculo=clt (padrão — campo indisponível na API Feedz).`,
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
          // ─── CASE C: UPDATE (lifecycle-safe) ─────────────────────────
          // Do NOT overwrite tipo_vinculo or remuneracao unless Feedz provides valid data
          const dbPayload: Record<string, any> = {
            nome: feedzName, situacao: 'ativo',
            cargo_id: cargoId, team_id: teamId,
            data_admissao: feedzAdmission || existing.data_admissao,
            email: feedzEmailRaw, celular: feedzPhoneRaw, phone_norm: feedzPhoneNorm,
            matricula,
            id_externo: feedzEmployeeId, source: 'feedz', sync_status: 'synced',
            last_synced_at: now, nome_normalizado: normalizeName(feedzName), updated_at: now,
          }
          // Only update remuneracao if Feedz sends a valid positive number
          if (remuneracaoValid) {
            dbPayload.remuneracao_mensal = rawRemuneracao
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
            await db.from('hr_people').update({ last_synced_at: now }).eq('id', existing.id)
            continue
          }

          // Compute changed fields
          const fieldsChanged: { field: string; before: any; after: any }[] = []
          const snapshotBefore: Record<string, any> = {}
          const checkFields = ['nome', 'situacao', 'cargo_id', 'team_id', 'email', 'celular', 'data_admissao', ...(remuneracaoValid ? ['remuneracao_mensal'] : [])]
          for (const key of checkFields) {
            snapshotBefore[key] = existing[key]
            if (String(existing[key] ?? '') !== String(dbPayload[key] ?? '')) {
              fieldsChanged.push({ field: key, before: existing[key], after: dbPayload[key] })
            }
          }

          if (fieldsChanged.length === 0 && existing.last_synced_at) {
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
              await insertTimelineIdempotent(db, {
                person_id: existing.id, event_date: new Date().toISOString().split('T')[0],
                ocorrencia: 'reativacao', descricao: `Reativação sincronizada via Feedz (matrícula ${matricula})`,
                atualizar_remuneracao: false, source: 'feedz', sync_run_id: runId,
              })
            }

            if (fieldsChanged.some(f => f.field === 'cargo_id')) {
              const oldLabel = (existingJobs || []).find((j: any) => j.id === existing.cargo_id)?.label || 'Sem cargo'
              const newLabel = feedzJob || 'Sem cargo'
              await db.from('hr_people').update({ cargo_antigo: oldLabel }).eq('id', existing.id)
              await insertTimelineIdempotent(db, {
                person_id: existing.id, event_date: new Date().toISOString().split('T')[0],
                ocorrencia: 'mudanca-cargo', descricao: `Cargo alterado via Feedz: ${oldLabel} → ${newLabel}`,
                atualizar_remuneracao: false, source: 'feedz', sync_run_id: runId,
              })
            }

            if (fieldsChanged.some(f => f.field === 'remuneracao_mensal') && remuneracaoValid && rawRemuneracao !== null) {
              const oldR = Number(existing.remuneracao_mensal)
              await insertTimelineIdempotent(db, {
                person_id: existing.id, event_date: new Date().toISOString().split('T')[0],
                ocorrencia: 'reajuste', descricao: `Remuneração alterada via Feedz: R$ ${oldR.toFixed(2)} → R$ ${rawRemuneracao.toFixed(2)}`,
                valor: rawRemuneracao - oldR, remuneracao_apos: rawRemuneracao,
                atualizar_remuneracao: false, source: 'feedz', sync_run_id: runId,
              })
            }

            // tipo_vinculo is no longer synced from Feedz — removed to prevent data corruption
          }
        } else if (feedzStatus === 'inativo') {
          // ─── CASE B: TERMINATE (with or without date) ──────────────────
          // Use terminationDate if available, otherwise fallback to today
          const effectiveDate = terminationDate || new Date().toISOString().split('T')[0]
          const dateSource = terminationDate ? 'feedz' : 'fallback'

          // Build turnover reason if available
          const turnoverInfo = turnoverMap.get(matricula)
          const motivoDesligamento = turnoverInfo?.reason
            ? `Desligamento via Feedz: ${turnoverInfo.reason}`
            : terminationDate
              ? 'Desligamento via Feedz'
              : 'Desligamento via Feedz (data não informada — fallback)'

          // Skip if already terminated with same date
          if (existing.situacao === 'inativo' && existing.data_desligamento === effectiveDate) {
            await db.from('hr_people').update({ last_synced_at: now }).eq('id', existing.id)
            continue
          }

          const snapshotBefore: Record<string, any> = {}
          const termFields = ['situacao', 'data_desligamento', 'tipo_desligamento', 'motivo_desligamento', 'last_synced_at', 'sync_status']
          for (const k of termFields) snapshotBefore[k] = existing[k]

          const dbPayload: Record<string, any> = {
            situacao: 'inativo',
            data_desligamento: effectiveDate,
            tipo_desligamento: turnoverInfo?.type || 'outro',
            motivo_desligamento: motivoDesligamento,
            last_synced_at: now,
            sync_status: 'synced',
            updated_at: now,
          }

          const afterSnapshot = { ...snapshotBefore }
          for (const k of Object.keys(dbPayload)) afterSnapshot[k] = dbPayload[k]

          const fieldsChanged = termFields
            .filter(k => String(existing[k] ?? '') !== String(dbPayload[k] ?? ''))
            .map(k => ({ field: k, before: existing[k], after: dbPayload[k] }))

          const { error: updateErr } = await db.from('hr_people').update(dbPayload).eq('id', existing.id)
          if (!updateErr) {
            terminatedCount++
            const payloadHash = computePayloadHash({ ...existing, ...dbPayload })
            syncChanges.push({
              run_id: runId, matricula, hr_people_id: existing.id, action: 'terminated',
              synced_at: now, changed_fields: fieldsChanged, before_snapshot: snapshotBefore,
              after_snapshot: { ...afterSnapshot, _audit_date_source: dateSource },
              payload_hash: payloadHash,
            })

            await insertTimelineIdempotent(db, {
              person_id: existing.id, event_date: effectiveDate,
              ocorrencia: 'desligamento',
              descricao: `Desligamento sincronizado via Feedz (matrícula ${matricula}). Status=${person.status}. Data: ${effectiveDate} (fonte: ${dateSource}).${turnoverInfo?.reason ? ` Motivo: ${turnoverInfo.reason}` : ''}`,
              atualizar_remuneracao: false, source: 'feedz', sync_run_id: runId,
            })
          }
        } else if (feedzStatus === 'ativo' && terminationDate) {
          // INCONSISTENCY: active with termination date
          inconsistencyCount++
          syncInconsistencies.push({ run_id: runId, matricula, reason_code: 'TERMINATION_DATE_WITH_ACTIVE_STATUS', reason_detail: `Status ativo mas data desligamento=${terminationDate}`, feedz_payload: minPayload })
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
