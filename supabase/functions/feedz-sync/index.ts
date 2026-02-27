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
}

// ─── NORMALIZE NAME ──────────────────────────────────────────────────────────
function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // remove punctuation
    .replace(/\s+/g, ' ')
    .replace(/\bjunior\b/g, 'jr')
    .replace(/\bsenior\b/g, 'sr')
    .replace(/\bneto\b/g, 'neto')
    .replace(/\bfilho\b/g, 'filho')
    .trim()
}

// ─── MATCH SCORE ─────────────────────────────────────────────────────────────
function computeMatchScore(
  feedzNorm: string,
  localNorm: string,
  feedzDept: string | null,
  localTeamName: string | null,
  feedzJob: string | null,
  localJobLabel: string | null,
  feedzAdmission: string | null,
  localAdmission: string | null,
): number {
  let score = 0
  if (feedzNorm === localNorm) score += 1.0
  if (feedzDept && localTeamName && normalizeName(feedzDept) === normalizeName(localTeamName)) score += 0.2
  if (feedzJob && localJobLabel && normalizeName(feedzJob) === normalizeName(localJobLabel)) score += 0.2
  if (feedzAdmission && localAdmission) {
    const fa = feedzAdmission.substring(0, 10)
    const la = localAdmission.substring(0, 10)
    if (fa === la) score += 0.2
  }
  return score
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
    },
  })

  console.log(`[feedz-sync] Feedz response status: ${response.status}`)

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Feedz API error ${response.status}: ${errText.substring(0, 200)}`)
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    const body = await response.text()
    throw new Error(`Feedz API returned non-JSON response (${contentType}). Possible Cloudflare block.`)
  }

  const data = await response.json()
  if (Array.isArray(data)) return data
  if (data.data && Array.isArray(data.data)) return data.data
  throw new Error('Unexpected Feedz API response format')
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

  // Create sync run
  const { data: syncRun, error: runError } = await db.from('feedz_sync_runs').insert({
    status: 'running',
    started_at: new Date().toISOString(),
  }).select().single()

  if (runError || !syncRun) {
    return new Response(JSON.stringify({ error: 'Failed to create sync run' }), { status: 500, headers: corsHeaders })
  }

  const runId = syncRun.id
  let processed = 0, created = 0, updated = 0, terminated = 0, pending = 0, conflicts = 0

  try {
    const feedzData = await fetchAllFeedzEmployees(feedzToken)

    // Load existing data
    const { data: existingPeople } = await db.from('hr_people').select('*')
    const { data: existingJobs } = await db.from('job_titles').select('*')
    const { data: existingTeams } = await db.from('teams').select('*')

    // Build lookup maps
    const idExternoMap = new Map<string, any>()
    const emailMap = new Map<string, any>()
    const allPeople: any[] = existingPeople || []

    for (const p of allPeople) {
      if (p.id_externo) idExternoMap.set(p.id_externo, p)
      if (p.email) emailMap.set(p.email.toLowerCase().trim(), p)
    }

    // Pre-compute normalized names for all people
    const peopleWithNorm = allPeople.map(p => ({
      ...p,
      _normName: normalizeName(p.nome || ''),
      _teamName: (existingTeams || []).find((t: any) => t.id === p.team_id)?.name || null,
      _jobLabel: (existingJobs || []).find((j: any) => j.id === p.cargo_id)?.label || null,
    }))

    const jobMap = new Map<string, any>()
    for (const j of (existingJobs || [])) {
      jobMap.set(j.label.toLowerCase(), j)
    }

    const teamMap = new Map<string, any>()
    for (const t of (existingTeams || [])) {
      teamMap.set(t.name.toLowerCase(), t)
    }

    // Batch pending matches to insert at the end
    const pendingMatches: any[] = []

    for (const person of feedzData) {
      processed++
      const externalId = String(person.employeeId)
      const feedzName = person.full_name || person.name || ''
      const feedzNorm = normalizeName(feedzName)
      const feedzEmail = person.email?.toLowerCase().trim() || null
      const feedzDept = person.department_data?.name || (typeof person.department === 'string' ? person.department : null)
      const feedzJob = person.job_description?.title || null
      const feedzAdmission = person.admission_at || null

      // ─── RESOLVE CARGO ────────────────────────────────────────────────
      let cargoId: string | null = null
      if (feedzJob) {
        const existingJob = jobMap.get(feedzJob.toLowerCase())
        if (existingJob) {
          cargoId = existingJob.id
        } else {
          const { data: newJob } = await db.from('job_titles').insert({
            label: feedzJob, is_active: true, origin: 'feedz',
          }).select().single()
          if (newJob) { cargoId = newJob.id; jobMap.set(feedzJob.toLowerCase(), newJob) }
        }
      }

      // ─── RESOLVE TEAM ─────────────────────────────────────────────────
      let teamId: string | null = null
      if (feedzDept) {
        const existingTeam = teamMap.get(feedzDept.toLowerCase())
        if (existingTeam) {
          teamId = existingTeam.id
        } else {
          const { data: newTeam } = await db.from('teams').insert({
            name: feedzDept, is_active: true, origin: 'feedz',
          }).select().single()
          if (newTeam) { teamId = newTeam.id; teamMap.set(feedzDept.toLowerCase(), newTeam) }
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
        email: person.email || null,
        celular: null,
        nivel: null,
        trilha: null,
        remuneracao_mensal: remuneracao,
        id_externo: externalId,
        source: 'feedz',
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
        nome_normalizado: feedzNorm,
        updated_at: new Date().toISOString(),
      }

      // ─── REGRA 1: MATCH POR ID_EXTERNO ────────────────────────────────
      let existing = idExternoMap.get(externalId)
      let matchMethod = existing ? 'id_externo' : null

      // ─── REGRA 2: MATCH POR EMAIL ─────────────────────────────────────
      if (!existing && feedzEmail) {
        const emailMatch = emailMap.get(feedzEmail)
        if (emailMatch) {
          if (!emailMatch.id_externo) {
            // Local has no id_externo: link it
            existing = emailMatch
            matchMethod = 'email'
          } else if (emailMatch.id_externo !== externalId) {
            // CONFLICT: email matches but id_externo diverges
            conflicts++
            pendingMatches.push({
              sync_run_id: runId,
              external_id: externalId,
              feedz_name: feedzName,
              feedz_email: person.email || null,
              feedz_department: feedzDept,
              feedz_job_title: feedzJob,
              feedz_admission_date: feedzAdmission,
              feedz_status: person.status || null,
              feedz_remuneration: remuneracao,
              match_type: 'conflict',
              suggested_person_ids: [emailMatch.id],
              suggested_scores: [1.0],
            })
            await db.from('feedz_sync_events').insert({
              sync_run_id: runId, external_id: externalId, event_type: 'conflict',
              summary: `Conflito: email ${feedzEmail} bate com ${emailMatch.nome} mas id_externo diverge (${emailMatch.id_externo} vs ${externalId})`,
            })
            continue
          } else {
            // Same id_externo via email lookup — already covered by rule 1 map
            existing = emailMatch
            matchMethod = 'email'
          }
        }
      }

      // ─── REGRA 3: MATCH POR NOME NORMALIZADO + SCORE ──────────────────
      if (!existing && feedzNorm) {
        // Find top candidates by name similarity
        const candidates: { person: any; score: number }[] = []
        for (const p of peopleWithNorm) {
          if (p._normName === feedzNorm || p._normName.includes(feedzNorm) || feedzNorm.includes(p._normName)) {
            const score = computeMatchScore(
              feedzNorm, p._normName,
              feedzDept, p._teamName,
              feedzJob, p._jobLabel,
              feedzAdmission, p.data_admissao,
            )
            if (score > 0) candidates.push({ person: p, score })
          }
        }
        candidates.sort((a, b) => b.score - a.score)

        if (candidates.length > 0 && candidates[0].score >= 1.2) {
          // Auto-match
          existing = candidates[0].person
          matchMethod = 'nome_score'
        } else if (candidates.length > 0 && candidates[0].score >= 0.5) {
          // Pending match - not confident enough
          pending++
          const top3 = candidates.slice(0, 3)
          pendingMatches.push({
            sync_run_id: runId,
            external_id: externalId,
            feedz_name: feedzName,
            feedz_email: person.email || null,
            feedz_department: feedzDept,
            feedz_job_title: feedzJob,
            feedz_admission_date: feedzAdmission,
            feedz_status: person.status || null,
            feedz_remuneration: remuneracao,
            match_type: 'pending',
            suggested_person_ids: top3.map(c => c.person.id),
            suggested_scores: top3.map(c => Math.round(c.score * 100) / 100),
          })
          await db.from('feedz_sync_events').insert({
            sync_run_id: runId, external_id: externalId, event_type: 'pending',
            summary: `Pendente: ${feedzName} — melhor score ${candidates[0].score.toFixed(2)} com ${candidates[0].person.nome}`,
          })
          continue
        }
      }

      if (!existing) {
        // ─── REGRA 4: CRIAR NOVO ──────────────────────────────────────────
        const { error: insertErr } = await db.from('hr_people').insert(dbPayload)
        if (!insertErr) {
          created++
          // Update maps
          idExternoMap.set(externalId, { ...dbPayload, id: 'new' })
          if (feedzEmail) emailMap.set(feedzEmail, { ...dbPayload, id: 'new' })
          await db.from('feedz_sync_events').insert({
            sync_run_id: runId, external_id: externalId, event_type: 'create',
            fields_changed: Object.keys(dbPayload),
            summary: `Criado: ${feedzName}`,
          })
        } else {
          console.error(`[feedz-sync] Insert error for ${feedzName}: ${insertErr.message}`)
          // If unique constraint violation, register as pending
          if (insertErr.message?.includes('unique') || insertErr.message?.includes('duplicate')) {
            pending++
            pendingMatches.push({
              sync_run_id: runId, external_id: externalId,
              feedz_name: feedzName, feedz_email: person.email || null,
              feedz_department: feedzDept, feedz_job_title: feedzJob,
              feedz_admission_date: feedzAdmission, feedz_status: person.status || null,
              feedz_remuneration: remuneracao, match_type: 'pending',
            })
          }
        }
      } else {
        // ─── UPDATE EXISTING ──────────────────────────────────────────────
        const changedFields: string[] = []
        const oldCargo = existing.cargo_id
        const oldRemun = Number(existing.remuneracao_mensal)

        if (existing.nome !== dbPayload.nome) changedFields.push('nome')
        if (existing.tipo_vinculo !== dbPayload.tipo_vinculo) changedFields.push('tipo_vinculo')
        if (existing.cargo_id !== dbPayload.cargo_id) changedFields.push('cargo_id')
        if (existing.team_id !== dbPayload.team_id) changedFields.push('team_id')
        if (existing.email !== dbPayload.email) changedFields.push('email')
        if (oldRemun !== Number(dbPayload.remuneracao_mensal)) changedFields.push('remuneracao_mensal')
        if (!existing.id_externo && dbPayload.id_externo) changedFields.push('id_externo')

        // Handle termination
        if (existing.situacao === 'ativo' && situacao === 'inativo') {
          changedFields.push('situacao')
          dbPayload.data_desligamento = new Date().toISOString().split('T')[0]
          dbPayload.tipo_desligamento = 'outro'
          dbPayload.motivo_desligamento = 'Desligamento via Feedz'

          await db.from('hr_timeline').insert({
            person_id: existing.id,
            event_date: dbPayload.data_desligamento,
            ocorrencia: 'desligamento',
            descricao: 'Desligamento sincronizado via Feedz.',
            atualizar_remuneracao: false,
          })
          terminated++
        }

        // Always update source/sync fields
        if (existing.source !== 'feedz') changedFields.push('source')
        if (existing.nome_normalizado !== feedzNorm) changedFields.push('nome_normalizado')

        if (changedFields.length > 0 || !existing.last_synced_at) {
          const { error: updateErr } = await db.from('hr_people').update(dbPayload).eq('id', existing.id)
          if (!updateErr) {
            updated++
            await db.from('feedz_sync_events').insert({
              sync_run_id: runId, external_id: externalId,
              event_type: situacao === 'inativo' && existing.situacao === 'ativo' ? 'terminate' : 'update',
              fields_changed: changedFields,
              summary: `Atualizado (${matchMethod}): ${feedzName} (${changedFields.join(', ')})`,
            })

            // Timeline for cargo change
            if (changedFields.includes('cargo_id') && oldCargo !== dbPayload.cargo_id) {
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
            if (changedFields.includes('remuneracao_mensal')) {
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
          }
        }
      }
    }

    // Insert all pending matches in batch
    if (pendingMatches.length > 0) {
      await db.from('feedz_pending_matches').insert(pendingMatches)
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
