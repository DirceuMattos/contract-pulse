import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const feedzToken = Deno.env.get('FEEDZ_API_TOKEN')
  if (!feedzToken) {
    return new Response(JSON.stringify({ error: 'No FEEDZ_API_TOKEN' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  try {
    const url = 'https://app.feedz.com.br/v2/integracao/employees?status[]=Ativo&size=3'
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${feedzToken}`,
        'Accept': 'application/json',
        'User-Agent': 'BNP-Contratos/1.0',
      },
    })

    const data = await response.json()
    const employees = Array.isArray(data) ? data : (data.data || data.content || [])
    
    // Return full structure of first 3 employees
    const sample = employees.slice(0, 3).map((e: any) => ({
      _ALL_KEYS: Object.keys(e),
      employeeId: e.employeeId,
      name: e.name,
      full_name: e.full_name,
      registration: e.registration,
      matricula: e.matricula,
      enrollment: e.enrollment,
      cpf: e.cpf,
      email: e.email,
      customFields: e.customFields,
      custom_fields: e.custom_fields,
      additionalInfo: e.additionalInfo,
      additional_info: e.additional_info,
      // dump first level of all fields
      _RAW: e,
    }))

    return new Response(JSON.stringify({ count: employees.length, sample }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
