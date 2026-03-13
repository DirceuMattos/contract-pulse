import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface TurnoverRecord {
  id?: number
  reason?: string
  type?: number
  department?: string
  last_day_working?: string
  profile?: { id: number; name: string; email: string; status: number }
}

// ─── FEEDZ TURNOVER API (paginated) ─────────────────────────────────────────
async function fetchTurnoverMap(feedzToken: string): Promise<Map<string, { date: string; reason: string }>> {
  const map = new Map<string, { date: string; reason: string }>()

  try {
    let url: string | null = 'https://app.feedz.com.br/v2/integracao/employees/turnover'
    let pageCount = 0

    while (url) {
      pageCount++
      console.log(`[update-dates] Fetching turnover page ${pageCount}: ${url}`)

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
        console.warn(`[update-dates] Turnover endpoint returned ${response.status}, stopping`)
        return map
      }

      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        console.warn(`[update-dates] Turnover endpoint returned non-JSON, stopping`)
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

      url = body.next_page_url || null
    }

    console.log(`[update-dates] Turnover data loaded: ${map.size} records across ${pageCount} page(s)`)
  } catch (err) {
    console.error(`[update-dates] Error fetching turnover:`, err)
  }

  return map
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const feedzToken = Deno.env.get('FEEDZ_API_TOKEN')

    if (!feedzToken) {
      return new Response(JSON.stringify({ error: 'FEEDZ_API_TOKEN not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Verify user auth
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: claimsData, error: claimsError } = await userClient.auth.getUser()
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Service role client for updates
    const admin = createClient(supabaseUrl, serviceRoleKey)

    // 1. Fetch turnover map from Feedz
    console.log('[update-dates] Starting termination date update...')
    const turnoverMap = await fetchTurnoverMap(feedzToken)

    if (turnoverMap.size === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Nenhum dado de turnover encontrado na API Feedz.',
        totalProcessed: 0,
        totalUpdated: 0,
        details: [],
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 2. Fetch all inactive hr_people with id_externo
    const { data: inactivePeople, error: fetchErr } = await admin
      .from('hr_people')
      .select('id, nome, matricula, id_externo, data_desligamento, situacao')
      .eq('situacao', 'inativo')
      .not('id_externo', 'is', null)

    if (fetchErr) throw fetchErr

    const allInactive = inactivePeople || []
    console.log(`[update-dates] Found ${allInactive.length} inactive people with id_externo`)

    // 3. Cross-reference and update
    const details: Array<{ nome: string; matricula: string | null; dataAntiga: string | null; dataNova: string; reason: string }> = []

    for (const person of allInactive) {
      const turnoverInfo = turnoverMap.get(person.id_externo!)
      if (!turnoverInfo) continue

      const currentDate = person.data_desligamento || null
      const newDate = turnoverInfo.date

      // Skip if dates match
      if (currentDate === newDate) continue

      // Update only data_desligamento
      const { error: updateErr } = await admin
        .from('hr_people')
        .update({ data_desligamento: newDate })
        .eq('id', person.id)

      if (updateErr) {
        console.error(`[update-dates] Error updating ${person.nome}: ${updateErr.message}`)
        continue
      }

      details.push({
        nome: person.nome,
        matricula: person.matricula || null,
        dataAntiga: currentDate,
        dataNova: newDate,
        reason: turnoverInfo.reason,
      })
    }

    console.log(`[update-dates] Done. Updated ${details.length} of ${allInactive.length} records.`)

    return new Response(JSON.stringify({
      success: true,
      totalProcessed: allInactive.length,
      totalTurnoverRecords: turnoverMap.size,
      totalUpdated: details.length,
      details,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err: any) {
    console.error('[update-dates] Error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
