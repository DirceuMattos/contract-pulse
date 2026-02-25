import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface FeedzPerson {
  id: string
  nome: string
  email?: string
  celular?: string
  tipoVinculo?: string
  situacao?: string
  cargo?: string
  departamento?: string
  dataAdmissao?: string
  nivel?: string
  trilha?: string
  remuneracaoMensal?: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Auth check
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

  // Verify caller is c-level
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } }
  })
  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
  }
  const userId = user.id

  // Use service role for DB writes
  const db = createClient(supabaseUrl, supabaseServiceKey)

  // Check c-level role
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
  let processed = 0, created = 0, updated = 0, terminated = 0

  try {
    // Fetch from Feedz API
    const feedzRes = await fetch('https://api.feedz.com.br/v2/colaboradores', {
      headers: { 'Authorization': `Bearer ${feedzToken}`, 'Content-Type': 'application/json' },
    })

    if (!feedzRes.ok) {
      const errText = await feedzRes.text()
      throw new Error(`Feedz API error ${feedzRes.status}: ${errText}`)
    }

    const feedzData: FeedzPerson[] = await feedzRes.json()

    // Load existing data
    const { data: existingPeople } = await db.from('hr_people').select('*')
    const { data: existingJobs } = await db.from('job_titles').select('*')
    const { data: existingTeams } = await db.from('teams').select('*')

    const peopleMap = new Map<string, any>()
    const emailMap = new Map<string, any>()
    for (const p of (existingPeople || [])) {
      if (p.id_externo) peopleMap.set(p.id_externo, p)
      if (p.email) emailMap.set(p.email.toLowerCase(), p)
    }

    const jobMap = new Map<string, any>()
    for (const j of (existingJobs || [])) {
      jobMap.set(j.label.toLowerCase(), j)
    }

    const teamMap = new Map<string, any>()
    for (const t of (existingTeams || [])) {
      teamMap.set(t.name.toLowerCase(), t)
    }

    for (const person of feedzData) {
      processed++
      const externalId = String(person.id)

      // Find existing by external_id or email
      let existing = peopleMap.get(externalId)
      if (!existing && person.email) {
        existing = emailMap.get(person.email.toLowerCase())
      }

      // Resolve cargo
      let cargoId: string | null = null
      if (person.cargo) {
        const existingJob = jobMap.get(person.cargo.toLowerCase())
        if (existingJob) {
          cargoId = existingJob.id
        } else {
          const { data: newJob } = await db.from('job_titles').insert({
            label: person.cargo,
            is_active: true,
            origin: 'feedz',
          }).select().single()
          if (newJob) {
            cargoId = newJob.id
            jobMap.set(person.cargo.toLowerCase(), newJob)
          }
        }
      }

      // Resolve team/departamento
      let teamId: string | null = null
      if (person.departamento) {
        const existingTeam = teamMap.get(person.departamento.toLowerCase())
        if (existingTeam) {
          teamId = existingTeam.id
        } else {
          const { data: newTeam } = await db.from('teams').insert({
            name: person.departamento,
            is_active: true,
            origin: 'feedz',
          }).select().single()
          if (newTeam) {
            teamId = newTeam.id
            teamMap.set(person.departamento.toLowerCase(), newTeam)
          }
        }
      }

      // Map vinculo
      let tipoVinculo = 'clt'
      if (person.tipoVinculo) {
        const v = person.tipoVinculo.toLowerCase()
        if (v.includes('pj')) tipoVinculo = 'pj'
        else if (v.includes('cooperado')) tipoVinculo = 'cooperado'
        else tipoVinculo = 'clt'
      }

      const situacao = person.situacao?.toLowerCase() === 'inativo' ? 'inativo' : 'ativo'

      const dbPayload: Record<string, any> = {
        nome: person.nome || '',
        tipo_vinculo: tipoVinculo,
        situacao,
        cargo_id: cargoId,
        team_id: teamId,
        data_admissao: person.dataAdmissao || new Date().toISOString().split('T')[0],
        email: person.email || null,
        celular: person.celular || null,
        nivel: person.nivel || null,
        trilha: person.trilha || null,
        remuneracao_mensal: person.remuneracaoMensal ?? 0,
        id_externo: externalId,
        updated_at: new Date().toISOString(),
      }

      if (!existing) {
        // CREATE
        const { error: insertErr } = await db.from('hr_people').insert(dbPayload)
        if (!insertErr) {
          created++
          await db.from('feedz_sync_events').insert({
            sync_run_id: runId,
            external_id: externalId,
            event_type: 'create',
            fields_changed: Object.keys(dbPayload),
            summary: `Criado: ${person.nome}`,
          })
        }
      } else {
        // UPDATE - detect changes
        const changedFields: string[] = []
        const oldCargo = existing.cargo_id
        const oldRemun = Number(existing.remuneracao_mensal)

        if (existing.nome !== dbPayload.nome) changedFields.push('nome')
        if (existing.tipo_vinculo !== dbPayload.tipo_vinculo) changedFields.push('tipo_vinculo')
        if (existing.cargo_id !== dbPayload.cargo_id) changedFields.push('cargo_id')
        if (existing.team_id !== dbPayload.team_id) changedFields.push('team_id')
        if (existing.email !== dbPayload.email) changedFields.push('email')
        if (existing.celular !== dbPayload.celular) changedFields.push('celular')
        if (existing.nivel !== dbPayload.nivel) changedFields.push('nivel')
        if (existing.trilha !== dbPayload.trilha) changedFields.push('trilha')
        if (oldRemun !== Number(dbPayload.remuneracao_mensal)) changedFields.push('remuneracao_mensal')

        // Handle termination
        if (existing.situacao === 'ativo' && situacao === 'inativo') {
          changedFields.push('situacao')
          dbPayload.data_desligamento = new Date().toISOString().split('T')[0]
          dbPayload.tipo_desligamento = 'outro'
          dbPayload.motivo_desligamento = 'Desligamento via Feedz'

          // Timeline event for termination
          await db.from('hr_timeline').insert({
            person_id: existing.id,
            event_date: dbPayload.data_desligamento,
            ocorrencia: 'desligamento',
            descricao: 'Desligamento sincronizado via Feedz.',
            atualizar_remuneracao: false,
          })
          terminated++
        }

        if (changedFields.length > 0) {
          const { error: updateErr } = await db.from('hr_people').update(dbPayload).eq('id', existing.id)
          if (!updateErr) {
            updated++
            await db.from('feedz_sync_events').insert({
              sync_run_id: runId,
              external_id: externalId,
              event_type: situacao === 'inativo' && existing.situacao === 'ativo' ? 'terminate' : 'update',
              fields_changed: changedFields,
              summary: `Atualizado: ${person.nome} (${changedFields.join(', ')})`,
            })

            // Timeline for cargo change
            if (changedFields.includes('cargo_id') && oldCargo !== dbPayload.cargo_id) {
              const oldLabel = (existingJobs || []).find((j: any) => j.id === oldCargo)?.label || 'Sem cargo'
              const newLabel = person.cargo || 'Sem cargo'
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

    // Finalize run
    await db.from('feedz_sync_runs').update({
      status: 'success',
      ended_at: new Date().toISOString(),
      records_processed: processed,
      records_created: created,
      records_updated: updated,
      records_terminated: terminated,
    }).eq('id', runId)

    return new Response(JSON.stringify({
      success: true,
      runId,
      processed,
      created,
      updated,
      terminated,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err: any) {
    await db.from('feedz_sync_runs').update({
      status: 'error',
      ended_at: new Date().toISOString(),
      records_processed: processed,
      records_created: created,
      records_updated: updated,
      records_terminated: terminated,
      error_message: err.message || 'Unknown error',
    }).eq('id', runId)

    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
