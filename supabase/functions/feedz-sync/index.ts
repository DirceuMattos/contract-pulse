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
}

// ─── NORMALIZATION UTILITIES ─────────────────────────────────────────────────
function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\bjunior\b/g, 'jr')
    .replace(/\bsenior\b/g, 'sr')
    .replace(/\bneto\b/g, 'neto')
    .replace(/\bfilho\b/g, 'filho')
    .trim()
}

function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null
  return email.trim().toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g, '') || null
}

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (!digits || digits.length < 8) return null
  if (digits.length === 10 || digits.length === 11) return '55' + digits
  return digits
}

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

  console.log(`[feedz-sync] Feedz response status: ${response.status}`)
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

// ─── DUPLICATE DETECTION ─────────────────────────────────────────────────────
function detectFeedzDuplicates(employees: FeedzEmployee[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const e of employees) {
    const key = String(e.employeeId)
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  const duplicates = new Map<string, number>()
  for (const [key, count] of counts) {
    if (count > 1) duplicates.set(key, count)
  }
  return duplicates
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const feedzToken = Deno.env.get('FEEDZ_API_TOKEN')

  if (!feedzToken) {
    return new Response(JSON.stringify({ error: 'FEEDZ_API_TOKEN not configured' }), { status: 500, headers: corsHeaders })
  }

  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } }
  })
  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
  }
  const userId = user.id

  const db = createClient(supabaseUrl, supabaseServiceKey)

  const { data: roleCheck } = await db.rpc('has_role', { _user_id: userId, _role: 'c-level' })
  if (!roleCheck) {
    return new Response(JSON.stringify({ error: 'Forbidden: c-level only' }), { status: 403, headers: corsHeaders })
  }

  // Parse optional sync_mode from body
  let syncMode = 'strict'
  try {
    const body = await req.json()
    if (body?.sync_mode === 'permissive') syncMode = 'permissive'
  } catch { /* no body is fine */ }

  // Create sync run
  const { data: syncRun, error: runError } = await db.from('feedz_sync_runs').insert({
    status: 'running',
    started_at: new Date().toISOString(),
    initiated_by: userId,
    sync_mode: syncMode,
  }).select().single()

  if (runError || !syncRun) {
    return new Response(JSON.stringify({ error: 'Failed to create sync run' }), { status: 500, headers: corsHeaders })
  }

  const runId = syncRun.id
  let processed = 0, created = 0, updated = 0, terminated = 0, pending = 0, conflicts = 0

  try {
    const feedzData = await fetchAllFeedzEmployees(feedzToken)

    // ─── DUPLICATE DETECTION (block run if Feedz has duplicate employeeIds) ──
    const duplicates = detectFeedzDuplicates(feedzData)
    if (duplicates.size > 0) {
      const dupList = Array.from(duplicates.entries())
        .map(([id, count]) => `matrícula ${id} (${count}x)`)
        .join(', ')
      const errorMsg = `Feedz retornou matrículas duplicadas: ${dupList}. Sincronização bloqueada.`
      console.error(`[feedz-sync] ${errorMsg}`)
      await db.from('feedz_sync_runs').update({
        status: 'error',
        ended_at: new Date().toISOString(),
        error_message: errorMsg,
      }).eq('id', runId)
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Load existing data
    const { data: existingPeople } = await db.from('hr_people').select('*')
    const { data: existingJobs } = await db.from('job_titles').select('*')
    const { data: existingTeams } = await db.from('teams').select('*')
    const { data: aliases } = await db.from('feedz_alias_mappings').select('*').eq('is_active', true)

    const allPeople: any[] = existingPeople || []
    const allAliases: any[] = aliases || []

    // Build lookup map by matricula (primary key for matching)
    const matriculaMap = new Map<string, any>()
    for (const p of allPeople) {
      if (p.matricula) matriculaMap.set(p.matricula, p)
    }

    const jobMap = new Map<string, any>()
    for (const j of (existingJobs || [])) jobMap.set(j.label.toLowerCase(), j)

    const teamMap = new Map<string, any>()
    for (const t of (existingTeams || [])) teamMap.set(t.name.toLowerCase(), t)

    // Alias maps
    const cargoAliasMap = new Map<string, any>()
    const deptoAliasMap = new Map<string, any>()
    for (const a of allAliases) {
      if (a.alias_type === 'cargo') cargoAliasMap.set(a.feedz_value.toLowerCase(), a)
      else if (a.alias_type === 'departamento') deptoAliasMap.set(a.feedz_value.toLowerCase(), a)
    }

    const pendingMatches: any[] = []
    const syncItems: any[] = []

    for (const person of feedzData) {
      processed++
      const externalId = String(person.employeeId)
      const feedzName = person.full_name || person.name || ''
      const feedzNorm = normalizeName(feedzName)
      const feedzEmailRaw = person.email || null
      const feedzEmailNorm = normalizeEmail(feedzEmailRaw)
      const feedzPhoneRaw = person.cellphone || person.phone || null
      const feedzPhoneNorm = normalizePhone(feedzPhoneRaw)
      const feedzDept = person.department_data?.name || (typeof person.department === 'string' ? person.department : null)
      const feedzJob = person.job_description?.title || null
      const feedzAdmission = person.admission_at || null

      // ─── MATRICULA: use employeeId as matricula ─────────────────────
      const matricula = externalId

      // ─── RESOLVE CARGO (with alias) ───────────────────────────────────
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
            const { data: newJob } = await db.from('job_titles').insert({
              label: feedzJob, is_active: true, origin: 'feedz',
            }).select().single()
            if (newJob) { cargoId = newJob.id; jobMap.set(feedzJob.toLowerCase(), newJob) }
          }
        }
      }

      // ─── RESOLVE TEAM (with alias) ────────────────────────────────────
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
            const { data: newTeam } = await db.from('teams').insert({
              name: feedzDept, is_active: true, origin: 'feedz',
            }).select().single()
            if (newTeam) { teamId = newTeam.id; teamMap.set(feedzDept.toLowerCase(), newTeam) }
          }
        }
      }

      const feedzStatus = person.status?.toLowerCase() || 'ativo'
      const situacao = (feedzStatus === 'desligado' || feedzStatus === 'desativado') ? 'inativo' : 'ativo'
      const remuneracao = person.remuneration ? parseFloat(person.remuneration) : 0

      const dbPayload: Record<string, any> = {
        nome: feedzName,
        tipo_vinculo: 'clt',
        situacao,
        cargo_id: cargoId,
        team_id: teamId,
        data_admissao: feedzAdmission || new Date().toISOString().split('T')[0],
        email: feedzEmailRaw,
        celular: feedzPhoneRaw,
        phone_norm: feedzPhoneNorm,
        nivel: null,
        trilha: null,
        remuneracao_mensal: remuneracao,
        id_externo: externalId,
        matricula: matricula,
        source: 'feedz',
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
        nome_normalizado: feedzNorm,
        updated_at: new Date().toISOString(),
      }

      // ─── MATCH BY MATRICULA (sole strategy) ──────────────────────────
      if (!matricula) {
        // No matricula → PENDING
        pending++
        syncItems.push({
          sync_run_id: runId, feedz_id: externalId, feedz_email: feedzEmailRaw,
          feedz_name: feedzName, match_strategy: 'NONE',
          action: 'PENDING', reason_code: 'NO_MATRICULA',
          fields_changed_json: [],
        })
        pendingMatches.push({
          sync_run_id: runId, external_id: externalId, feedz_name: feedzName,
          feedz_email: feedzEmailRaw, feedz_department: feedzDept,
          feedz_job_title: feedzJob, feedz_admission_date: feedzAdmission,
          feedz_status: person.status || null, feedz_remuneration: remuneracao,
          match_type: 'pending',
        })
        await db.from('feedz_sync_events').insert({
          sync_run_id: runId, external_id: externalId, event_type: 'pending',
          summary: `Sem matrícula: ${feedzName}`,
        })
        continue
      }

      const existing = matriculaMap.get(matricula)

      if (!existing) {
        // ─── INSERT NEW ───────────────────────────────────────────────
        const { data: insertedPerson, error: insertErr } = await db.from('hr_people').insert(dbPayload).select('id').single()
        if (!insertErr && insertedPerson) {
          created++
          matriculaMap.set(matricula, { ...dbPayload, id: insertedPerson.id })
          syncItems.push({
            sync_run_id: runId, feedz_id: externalId, feedz_email: feedzEmailRaw,
            feedz_name: feedzName, match_strategy: 'MATRICULA',
            matched_hr_person_id: insertedPerson.id,
            action: 'INSERT', reason_code: null,
            fields_changed_json: Object.keys(dbPayload).map(k => ({ field: k, before: null, after: dbPayload[k] })),
          })
          await db.from('feedz_sync_events').insert({
            sync_run_id: runId, external_id: externalId, event_type: 'create',
            fields_changed: Object.keys(dbPayload),
            summary: `Criado (matrícula ${matricula}): ${feedzName}`,
          })

          // ─── TIMELINE: Admissão (Feedz) ─────────────────────────────
          await db.from('hr_timeline').insert({
            person_id: insertedPerson.id,
            event_date: dbPayload.data_admissao,
            ocorrencia: 'admissao',
            descricao: `Admissão sincronizada via Feedz (matrícula ${matricula})`,
            atualizar_remuneracao: false,
          })
        } else {
          console.error(`[feedz-sync] Insert error for ${feedzName}: ${insertErr?.message}`)
          if (insertErr?.message?.includes('unique') || insertErr?.message?.includes('duplicate')) {
            pending++
            syncItems.push({
              sync_run_id: runId, feedz_id: externalId, feedz_email: feedzEmailRaw,
              feedz_name: feedzName, match_strategy: 'MATRICULA',
              action: 'PENDING', reason_code: 'MATRICULA_CONFLICT',
              fields_changed_json: [],
            })
            pendingMatches.push({
              sync_run_id: runId, external_id: externalId, feedz_name: feedzName,
              feedz_email: feedzEmailRaw, feedz_department: feedzDept,
              feedz_job_title: feedzJob, feedz_admission_date: feedzAdmission,
              feedz_status: person.status || null, feedz_remuneration: remuneracao,
              match_type: 'pending',
            })
          }
        }
      } else {
        // ─── UPDATE EXISTING ──────────────────────────────────────────
        const snapshotBefore: Record<string, any> = {}
        const fieldsChanged: { field: string; before: any; after: any }[] = []

        const checkField = (key: string, oldVal: any, newVal: any) => {
          snapshotBefore[key] = oldVal
          if (String(oldVal ?? '') !== String(newVal ?? '')) {
            fieldsChanged.push({ field: key, before: oldVal, after: newVal })
          }
        }

        checkField('nome', existing.nome, dbPayload.nome)
        checkField('tipo_vinculo', existing.tipo_vinculo, dbPayload.tipo_vinculo)
        checkField('cargo_id', existing.cargo_id, dbPayload.cargo_id)
        checkField('team_id', existing.team_id, dbPayload.team_id)
        checkField('email', existing.email, dbPayload.email)
        checkField('celular', existing.celular, dbPayload.celular)
        checkField('remuneracao_mensal', existing.remuneracao_mensal, dbPayload.remuneracao_mensal)
        checkField('situacao', existing.situacao, dbPayload.situacao)
        if (!existing.id_externo && dbPayload.id_externo) {
          checkField('id_externo', existing.id_externo, dbPayload.id_externo)
        }

        const changedFieldNames = fieldsChanged.map(f => f.field)

        // Handle termination (ativo → inativo)
        if (existing.situacao === 'ativo' && situacao === 'inativo') {
          dbPayload.data_desligamento = new Date().toISOString().split('T')[0]
          dbPayload.tipo_desligamento = 'outro'
          dbPayload.motivo_desligamento = 'Desligamento via Feedz'
          checkField('data_desligamento', existing.data_desligamento, dbPayload.data_desligamento)

          await db.from('hr_timeline').insert({
            person_id: existing.id,
            event_date: dbPayload.data_desligamento,
            ocorrencia: 'desligamento',
            descricao: 'Desligamento sincronizado via Feedz.',
            atualizar_remuneracao: false,
          })
          terminated++
        }

        // Handle reactivation (inativo → ativo)
        if (existing.situacao === 'inativo' && situacao === 'ativo') {
          dbPayload.data_desligamento = null
          dbPayload.tipo_desligamento = null
          dbPayload.motivo_desligamento = null

          await db.from('hr_timeline').insert({
            person_id: existing.id,
            event_date: new Date().toISOString().split('T')[0],
            ocorrencia: 'reativacao',
            descricao: `Reativação sincronizada via Feedz (matrícula ${matricula})`,
            atualizar_remuneracao: false,
          })
        }

        if (fieldsChanged.length > 0 || !existing.last_synced_at) {
          const { error: updateErr } = await db.from('hr_people').update(dbPayload).eq('id', existing.id)
          if (!updateErr) {
            updated++
            syncItems.push({
              sync_run_id: runId, feedz_id: externalId, feedz_email: feedzEmailRaw,
              feedz_name: feedzName, match_strategy: 'MATRICULA',
              matched_hr_person_id: existing.id,
              action: 'UPDATE', reason_code: null,
              fields_changed_json: fieldsChanged,
              snapshot_before: snapshotBefore,
            })
            await db.from('feedz_sync_events').insert({
              sync_run_id: runId, external_id: externalId,
              event_type: situacao === 'inativo' && existing.situacao === 'ativo' ? 'terminate' : 'update',
              fields_changed: changedFieldNames,
              summary: `Atualizado (MATRICULA): ${feedzName} (${changedFieldNames.join(', ')})`,
            })

            // Timeline for cargo change
            const oldCargo = existing.cargo_id
            if (changedFieldNames.includes('cargo_id') && oldCargo !== dbPayload.cargo_id) {
              const oldLabel = (existingJobs || []).find((j: any) => j.id === oldCargo)?.label || 'Sem cargo'
              const newLabel = feedzJob || 'Sem cargo'
              await db.from('hr_timeline').insert({
                person_id: existing.id,
                event_date: new Date().toISOString().split('T')[0],
                ocorrencia: 'mudanca-cargo',
                descricao: `Cargo alterado via Feedz: ${oldLabel} → ${newLabel}`,
                atualizar_remuneracao: false,
              })
            }

            // Timeline for salary change
            if (changedFieldNames.includes('remuneracao_mensal')) {
              const oldRemun = Number(existing.remuneracao_mensal)
              await db.from('hr_timeline').insert({
                person_id: existing.id,
                event_date: new Date().toISOString().split('T')[0],
                ocorrencia: 'reajuste',
                descricao: `Remuneração alterada via Feedz: R$ ${oldRemun.toFixed(2)} → R$ ${Number(dbPayload.remuneracao_mensal).toFixed(2)}`,
                valor: Number(dbPayload.remuneracao_mensal) - oldRemun,
                remuneracao_apos: Number(dbPayload.remuneracao_mensal),
                atualizar_remuneracao: false,
              })
            }

            // Timeline for vínculo change
            if (changedFieldNames.includes('tipo_vinculo')) {
              await db.from('hr_timeline').insert({
                person_id: existing.id,
                event_date: new Date().toISOString().split('T')[0],
                ocorrencia: 'mudanca-vinculo',
                descricao: `Vínculo alterado via Feedz: ${existing.tipo_vinculo} → ${dbPayload.tipo_vinculo}`,
                atualizar_remuneracao: false,
              })
            }
          }
        } else {
          // No changes — SKIP
          syncItems.push({
            sync_run_id: runId, feedz_id: externalId, feedz_email: feedzEmailRaw,
            feedz_name: feedzName, match_strategy: 'MATRICULA',
            matched_hr_person_id: existing.id,
            action: 'SKIP', reason_code: null,
            fields_changed_json: [],
          })
        }
      }
    }

    // Batch insert pending matches
    if (pendingMatches.length > 0) {
      await db.from('feedz_pending_matches').insert(pendingMatches)
    }

    // Batch insert sync items (in chunks of 100)
    for (let i = 0; i < syncItems.length; i += 100) {
      const chunk = syncItems.slice(i, i + 100)
      await db.from('feedz_sync_items').insert(chunk)
    }

    // Finalize run
    await db.from('feedz_sync_runs').update({
      status: 'success',
      ended_at: new Date().toISOString(),
      records_processed: processed,
      records_created: created,
      records_updated: updated,
      records_terminated: terminated,
      records_pending: pending,
      records_conflicts: conflicts,
      matched_by_feedz_id: processed - pending,
      matched_by_email: 0,
      matched_by_phone: 0,
      matched_by_name_score: 0,
    }).eq('id', runId)

    return new Response(JSON.stringify({
      success: true, runId, processed, created, updated, terminated, pending, conflicts,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err: any) {
    console.error(`[feedz-sync] Error: ${err.message}`)
    await db.from('feedz_sync_runs').update({
      status: 'error',
      ended_at: new Date().toISOString(),
      records_processed: processed,
      records_created: created,
      records_updated: updated,
      records_terminated: terminated,
      records_pending: pending,
      records_conflicts: conflicts,
      error_message: err.message || 'Unknown error',
    }).eq('id', runId)

    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
