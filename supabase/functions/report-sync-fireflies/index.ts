// v3 - dono unico da secao treinamentos_reunioes; filtro dominio E palavra-chave
//      (merge-preserva-manual mantido: nao apaga itens/rodape manuais)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireAnyRole, AuthError } from '../_shared/auth.ts';

const REPORT_ROLES = ['c-level', 'superadmin', 'lider_tribo', 'administrativo', 'coordenacao_suporte', 'projetos_produtos'];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/fireflies';

// ── merge-preserva-manual (espelho de src/lib/reportMergeManual.ts) ──
function deriveSyncKey(item: Record<string, unknown>): string {
  const gid = item.gid ?? item.id ?? item.task_id;
  if (gid != null && String(gid).trim() !== '') return `gid:${String(gid)}`;
  const desc = (item.descricao ?? item.tarefa ?? item.nome ?? '') as string;
  const data = (item.data ?? '') as string;
  return `nome:${desc.trim().toLowerCase()}|${data}`;
}
function mergeLinhas(
  currentContent: Record<string, unknown> | null | undefined,
  incoming: Record<string, unknown>[],
): Record<string, unknown>[] {
  const cur = (currentContent?.linhas ?? []) as any[];
  const manualItems = cur
    .filter((it) => it?.origem === 'manual')
    .map((it) => ({ ...it, origem: 'manual', syncKey: it.syncKey ?? deriveSyncKey(it) }));
  const seen = new Set<string>();
  const syncItems: any[] = [];
  for (const it of incoming) {
    const k = deriveSyncKey(it);
    if (seen.has(k)) continue;
    seen.add(k);
    syncItems.push({ ...it, origem: 'sync', syncKey: k });
  }
  const norm = (it: any) => String(it.descricao ?? it.tarefa ?? it.nome ?? '').trim().toLowerCase();
  const order: string[] = [];
  const byName = new Map<string, any[]>();
  const push = (it: any) => { const n = norm(it); if (!byName.has(n)) { byName.set(n, []); order.push(n); } byName.get(n)!.push(it); };
  manualItems.forEach(push);
  syncItems.forEach(push);
  const result: any[] = [];
  for (const n of order) {
    const g = byName.get(n)!;
    g.sort((a, b) => (a.origem === 'manual' ? -1 : 1) - (b.origem === 'manual' ? -1 : 1));
    result.push(...g);
  }
  return result;
}
function mergeScalar(
  currentContent: Record<string, unknown> | null | undefined,
  field: string,
  incomingValue: unknown,
): Record<string, unknown> {
  const mf = Array.isArray(currentContent?._manualFields) ? (currentContent!._manualFields as string[]) : [];
  if (mf.includes(field)) {
    return { [field]: currentContent?.[field], [`${field}__sync`]: incomingValue };
  }
  return { [field]: incomingValue };
}

interface Body {
  reportId: string;
  clientEmailDomain?: string;
  firefliesKeywords?: string[];
  month: number;
  year: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { reportId, clientEmailDomain, firefliesKeywords = [], month, year } = (await req.json()) as Body;
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Segurança: só perfis do módulo de Relatórios podem sincronizar.
    await requireAnyRole(req, supabase, REPORT_ROLES);

    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    const firefliesKey = Deno.env.get('FIREFLIES_API_KEY');
    if (!lovableKey || !firefliesKey) {
      const msg = 'Conector Fireflies não está vinculado. A seção pode ser preenchida manualmente.';
      const now = new Date().toISOString();
      if (reportId) {
        await supabase.from('report_sync_logs').insert({
          report_id: reportId,
          source: 'fireflies',
          status: 'skipped',
          records_fetched: 0,
          error_message: msg,
          synced_at: now,
        });
      }
      return new Response(JSON.stringify({ ok: true, skipped: true, count: 0, message: msg }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fromDate = new Date(Date.UTC(year, month - 1, 1)).toISOString();
    const toDate = new Date(Date.UTC(year, month, 1)).toISOString();

    const query = `
      query($from: DateTime, $to: DateTime) {
        transcripts(fromDate: $from, toDate: $to, limit: 100) {
          id title date duration
          participants
          summary { short_summary }
        }
      }
    `;
    const resp = await fetch(`${GATEWAY_URL}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableKey}`,
        'X-Connection-Api-Key': firefliesKey,
      },
      body: JSON.stringify({ query, variables: { from: fromDate, to: toDate } }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Fireflies ${resp.status}: ${text.slice(0, 300)}`);
    }
    const json = await resp.json();
    const transcripts: Array<{
      title: string;
      date: number;
      participants?: Array<string | { email?: string }>;
      summary?: { short_summary?: string };
    }> = json?.data?.transcripts ?? [];

    const domain = (clientEmailDomain ?? '').toLowerCase().trim();
    const kws = firefliesKeywords.map((k) => k.toLowerCase().trim()).filter(Boolean);

    // DECISÃO DO CLIENTE: a regra passou a ser domínio E palavra-chave (antes era OU).
    // Portanto AMBOS são obrigatórios na configuração: faltando qualquer um, o
    // filtro não teria como ser aplicado e traria reuniões de outros contratos.
    if (!domain || kws.length === 0) {
      const faltando = [!domain ? 'domínio de e-mail do cliente' : null, kws.length === 0 ? 'palavras-chave' : null]
        .filter(Boolean)
        .join(' e ');
      const msg =
        `Configuração incompleta: falta ${faltando}. ` +
        'A regra agora exige domínio E palavras-chave (ambos obrigatórios): a reunião só entra se tiver ' +
        'participante do domínio do cliente E o título casar uma das palavras-chave.';
      const nowSkip = new Date().toISOString();
      if (reportId) {
        await supabase.from('report_sync_logs').insert({
          report_id: reportId, source: 'fireflies', status: 'skipped',
          records_fetched: 0, error_message: msg, synced_at: nowSkip,
        });
      }
      return new Response(JSON.stringify({
        ok: false, skipped: true, count: 0, reason: 'config_incompleta', message: msg,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const filtered = transcripts.filter((t) => {
      const titleLc = (t.title ?? '').toLowerCase();
      // Domínio do cliente: algum participante @dominio-do-cliente. `participants`
      // pode vir como lista de e-mails ou de objetos { email }, conforme o gateway.
      const emails = ((t.participants ?? []) as Array<string | { email?: string }>).map((p) =>
        typeof p === 'string' ? p : (p?.email ?? ''),
      );
      const domainMatch = emails.some((e) => String(e).toLowerCase().endsWith(`@${domain}`));
      // Título casa uma keyword ESPECÍFICA (>= 4 chars) por substring.
      // Keywords curtas (ex.: siglas) exigem palavra inteira para não casar dentro
      // de outra palavra (ex.: "ti" dentro de "atividade").
      const titleMatch = kws.some((k) => {
        if (k.length >= 4) return titleLc.includes(k);
        return new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(titleLc);
      });
      // E (não OU): só entra a reunião que é COM o cliente (domínio) E cujo título
      // é do assunto configurado. Só domínio trazia reuniões internas/off-topic com
      // o cliente; só título trazia reuniões de outros contratos com nome parecido.
      return domainMatch && titleMatch;
    });

    const linhas = filtered.map((t) => ({
      tipo: 'Reunião',
      data: new Date(t.date).toISOString().slice(0, 10),
      descricao: `${t.title}${t.summary?.short_summary ? ' — ' + t.summary.short_summary : ''}`,
    }));

    const now = new Date().toISOString();

    // Merge-preserva-manual: lê o content atual, preserva itens/rodape manuais.
    const { data: trAtual } = await supabase
      .from('report_sections').select('content')
      .eq('report_id', reportId).eq('section_key', 'treinamentos_reunioes').maybeSingle();
    const trContent = (trAtual?.content ?? {}) as Record<string, unknown>;
    const trMerged = {
      ...trContent,
      linhas: mergeLinhas(trContent, linhas),
      ...mergeScalar(trContent, 'rodape', (trContent.rodape as string) ?? ''),
    };
    // upsert (não update): se a linha da seção ainda não existe, o update antigo
    // afetava 0 linhas e o sync "passava" sem gravar nada, silenciosamente.
    const { data: upserted, error: upsertError } = await supabase
      .from('report_sections')
      .upsert(
        {
          report_id: reportId,
          section_key: 'treinamentos_reunioes',
          content: trMerged,
          source: 'fireflies',
          synced_at: now,
          updated_at: now,
        },
        { onConflict: 'report_id,section_key' },
      )
      .select('report_id');

    const gravou = !upsertError && Array.isArray(upserted) && upserted.length > 0;

    if (!gravou) {
      const msg = upsertError?.message ?? 'Nenhuma linha gravada em report_sections (treinamentos_reunioes).';
      await supabase.from('report_sync_logs').insert({
        report_id: reportId, source: 'fireflies', status: 'error',
        records_fetched: 0, error_message: msg, synced_at: now,
      });
      return new Response(JSON.stringify({ ok: false, count: 0, error: msg }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabase.from('report_sync_logs').insert({
      report_id: reportId, source: 'fireflies', status: 'success',
      records_fetched: filtered.length, synced_at: now,
    });

    return new Response(JSON.stringify({ ok: true, count: filtered.length, total: transcripts.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'erro';
    const status = err instanceof AuthError ? err.status : 500;
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
