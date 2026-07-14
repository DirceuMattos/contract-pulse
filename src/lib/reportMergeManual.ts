// v1 - merge-preserva-manual: piloto seção entregas
//
// Regras (definidas com Dirceu, 14/07/2026):
// 1. O sync NUNCA sobrescreve, altera ou remove o que o usuário tocou.
// 2. O sync SEMPRE traz o dado novo coletado.
// 3. Onde os dois coexistem, geram duplicidade agrupada (o usuário resolve).
// 4. Proteção vale só para o relatório do mês corrente (marcação vive no content).
//
// A marcação de origem mora dentro do próprio `content` (jsonb), sem schema novo:
//   - content._manualFields: string[]  → chaves escalares tocadas pelo usuário
//   - itens de lista: { ...item, origem: 'manual' | 'sync', syncKey?: string }
//   - escalar tocado: valor do usuário em `campo`, valor coletado em `campo__sync`

export type Origem = 'manual' | 'sync';

export interface MergeableItem {
  origem?: Origem;
  syncKey?: string;
  [k: string]: unknown;
}

/** Deriva uma chave estável para casar duplicatas entre item manual e item do sync. */
export function deriveSyncKey(item: Record<string, unknown>): string {
  const gid = item.gid ?? item.id ?? item.task_id;
  if (gid != null && String(gid).trim() !== '') return `gid:${String(gid)}`;
  const nome = (item.tarefa ?? item.nome ?? '') as string;
  return `nome:${nome.trim().toLowerCase()}`;
}

/** Marca uma chave escalar como tocada pelo usuário. */
export function markManualField(content: Record<string, any>, field: string): string[] {
  const set = new Set<string>(Array.isArray(content._manualFields) ? content._manualFields : []);
  set.add(field);
  return Array.from(set);
}

export function isManualField(content: Record<string, any>, field: string): boolean {
  return Array.isArray(content._manualFields) && content._manualFields.includes(field);
}

/**
 * Merge de listas: preserva TODOS os itens manuais; substitui/atualiza os itens
 * de origem 'sync' pelos recém-coletados; adiciona os novos. Nunca remove manual.
 * A ordenação agrupa duplicatas (mesma syncKey) lado a lado.
 */
export function mergeList(
  existing: MergeableItem[],
  incoming: Record<string, unknown>[],
): MergeableItem[] {
  const existingArr = Array.isArray(existing) ? existing : [];

  // Itens que o usuário tocou/criou — sempre preservados.
  const manualItems = existingArr
    .filter((it) => it.origem === 'manual')
    .map((it) => ({ ...it, origem: 'manual' as const, syncKey: it.syncKey ?? deriveSyncKey(it) }));

  // Itens novos do sync, normalizados com origem e chave.
  const syncItems = incoming.map((it) => ({
    ...it,
    origem: 'sync' as const,
    syncKey: deriveSyncKey(it),
  }));

  // Agrupa: para cada syncKey, item manual (se houver) vem primeiro, depois o do sync.
  const order: string[] = [];
  const byKey = new Map<string, MergeableItem[]>();
  const push = (it: MergeableItem) => {
    const k = it.syncKey ?? deriveSyncKey(it);
    if (!byKey.has(k)) { byKey.set(k, []); order.push(k); }
    byKey.get(k)!.push(it);
  };
  manualItems.forEach(push);
  syncItems.forEach(push);

  const result: MergeableItem[] = [];
  for (const k of order) {
    const group = byKey.get(k)!;
    // manual antes de sync dentro do mesmo grupo
    group.sort((a, b) => (a.origem === 'manual' ? -1 : 1) - (b.origem === 'manual' ? -1 : 1));
    result.push(...group);
  }
  return result;
}

/** True quando há ao menos uma duplicata (mesma syncKey com manual + sync). */
export function hasDuplicates(items: MergeableItem[]): boolean {
  const seen = new Map<string, Set<Origem>>();
  for (const it of items) {
    const k = it.syncKey ?? deriveSyncKey(it);
    if (!seen.has(k)) seen.set(k, new Set());
    seen.get(k)!.add(it.origem ?? 'sync');
  }
  for (const origens of seen.values()) {
    if (origens.has('manual') && origens.has('sync')) return true;
  }
  return false;
}
