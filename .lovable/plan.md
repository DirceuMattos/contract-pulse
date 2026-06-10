## Objetivo

Quando uma pessoa do RH passa de `ativo` → `inativo`, criar registros em `pending_replacements` para cada `resource` vinculado e disparar uma notificação crítica. Aplicar tanto no fluxo manual (UI) quanto no automático (Feedz sync). Nenhuma outra lógica é alterada.

## Observações sobre o pedido

- A função citada como `handleEdit` em `HRPersonDetailPage.tsx` corresponde, no código real, a `handleSavePerson` (a função usada pelo formulário de edição). É nela que `situacao` é comparada/alterada.
- Existe também `handleDesligamento` (modal de desligamento), que já trata substituições manualmente via `replacements` antes de marcar `inativo`. Conforme instrução ("Não altere nenhuma outra lógica existente"), este fluxo NÃO será modificado — apenas `handleSavePerson` (edição direta) e o Feedz sync.
- O hook `useNotifications()` não expõe um `addNotification` direto; notificações são geradas via `processAlerts(alerts)` (que faz dedupe por `alertId` e dispara browser notification quando habilitado). O tipo `'hr-links-quebrados'` já existe em `AlertType`. Vamos criar um `Alert` sintético e passá-lo a `processAlerts`.

## Alterações

### 1) `src/pages/HRPersonDetailPage.tsx` — função `handleSavePerson`

Após `await updatePerson(person.id, data);` (linha ~201), adicionar bloco condicional:

- Se `person.situacao === 'ativo'` e `data.situacao === 'inativo'`:
  1. Filtrar `resources` (do `useData()`, já disponível no componente) por `r.hrPersonId === person.id`.
  2. Para cada `resource`, inserir em `pending_replacements`:
     ```ts
     await supabase.from('pending_replacements').insert({
       hr_person_id: person.id,
       resource_id: resource.id,
       contract_id: resource.contractId,
       status: 'pending',
     });
     ```
     (inserts em paralelo via `Promise.all`)
  3. Chamar `processAlerts([{ id: \`hr-links-quebrados-${person.id}\`, contractId: '', type: 'hr-links-quebrados', severity: 'critico', title: \`Substituição necessária: ${person.nome}\`, description: \`${person.nome} foi desligado e possui ${matched.length} alocação(ões) ativa(s) em contratos que precisam ser revisadas.\`, createdAt: new Date().toISOString() }])` obtido via `useNotificationContext()` (ou `useNotifications()` direto, conforme o padrão já usado na página — verificar import existente; se não houver, adicionar `import { useNotificationContext } from '@/contexts/NotificationContext'`).

Imports a adicionar (se ausentes): `supabase` de `@/integrations/supabase/client`, e `useNotificationContext`.

Nada mais na função muda; o restante de `handleSavePerson` (changes/timeline/toast) permanece intacto.

### 2) `supabase/functions/feedz-sync/index.ts` — bloco `CASE B: TERMINATE` (linhas ~587–645)

Após o `await db.from('hr_people').update(dbPayload)...` ser bem-sucedido (dentro do `if (!updateErr)`), e após o `insertTimelineIdempotent`, adicionar:

```ts
// Criar pending_replacements para cada resource vinculado
const { data: linkedResources } = await db
  .from('resources')
  .select('id, contract_id')
  .eq('hr_person_id', existing.id);

if (linkedResources && linkedResources.length > 0) {
  const rows = linkedResources.map(r => ({
    hr_person_id: existing.id,
    resource_id: r.id,
    contract_id: r.contract_id,
    status: 'pending',
  }));
  await db.from('pending_replacements').insert(rows);
}
```

A função roda como service-role, então RLS não é problema. Não há equivalente direto de `useNotifications` no edge function — a notificação na UI será gerada na próxima passada do `useAlerts` se houver regra; como o pedido é explícito apenas sobre `useNotifications()` no front, no edge function ficamos apenas com a inserção em `pending_replacements` (que é o que torna a UI capaz de detectar e alertar depois). Confirmar se essa abordagem está OK antes de aplicar, ou se você prefere também emitir uma linha em `alerts` aqui.

## Não será alterado

- `handleDesligamento` (modal de desligamento manual).
- Reativação (`handleReativar`).
- Demais lógicas de timeline, snapshots, sync_changes do Feedz.
- Qualquer outra tela ou componente.

## Pontos a confirmar antes do build

1. OK em tratar `handleSavePerson` como o "handleEdit" mencionado?
2. No Feedz sync, basta inserir em `pending_replacements` (sem notificação inline, já que edge functions não têm `useNotifications`)?
