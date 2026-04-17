
Objetivo: voltar ao ponto correto do vínculo com a API, restaurando o identificador do cliente/assinatura como fonte de verdade do contrato, sem mexer em outras áreas já estabilizadas.

Diagnóstico
- O fluxo histórico definido no chat era: buscar cliente/assinaturas no Superlógica, escolher uma assinatura, gravar o vínculo no contrato e depois sincronizar cobranças a partir desse vínculo.
- Hoje o sistema grava apenas `superlogicaSubscriptionId`, `superlogicaSubscriptionLabel` e `superlogicaCustomerCnpj`.
- O identificador do cliente no Superlógica usado na busca (`id_sacado_sac`) não está sendo persistido no contrato.
- Isso quebra o elo principal: mesmo quando a UI encontra um cliente por sugestão/manual override, o sync posterior volta a depender de nova busca por CNPJ.
- Os logs mostram que a busca atual só está enxergando 125 clientes em 3 páginas, então o lookup por CNPJ não está sendo uma base confiável para sustentar o vínculo.
- O erro de build mostrado agora parece infra de upload (`R2 credentials timeout`), não evidência de erro de TypeScript. Ainda assim, o problema funcional a corrigir é o vínculo incompleto.

Plano de implementação

1. Restaurar o vínculo completo no banco
- Criar migração para adicionar um campo persistente de cliente Superlógica no contrato, por exemplo `superlogica_customer_id`.
- Manter os campos já existentes; não remover nada.
- Se fizer sentido, também gravar esse mesmo identificador no snapshot de assinaturas para auditoria.

2. Corrigir a edge de busca para devolver o elo completo
Arquivo: `supabase/functions/superlogica-search-subscriptions/index.ts`
- Fazer a resposta incluir explicitamente o `superlogicaClientId` encontrado/usado.
- Em cada assinatura candidata, retornar também o `clientId` do cliente Superlógica correspondente.
- Preservar a busca por nome/sugestões, mas tratá-la como fallback operacional, não como fonte primária do vínculo.
- Revisar a estratégia de leitura de clientes para não depender só do recorte atual que está retornando 125 registros.

3. Corrigir a tela de conciliação para persistir o cliente Superlógica junto com a assinatura
Arquivo: `src/pages/ReceivablesReconcilePage.tsx`
- Ao clicar em “Vincular”, salvar no contrato:
  - `superlogicaSubscriptionId`
  - `superlogicaSubscriptionLabel`
  - `superlogicaCustomerCnpj`
  - novo `superlogicaCustomerId`
- Quando o usuário usar uma sugestão manual, garantir que o vínculo persistido use o `clientId` realmente escolhido, e não apenas o CNPJ local.
- Ajustar a mensagem de sucesso/estado da tela para refletir que o cliente API também ficou vinculado.

4. Fazer o sync usar primeiro o vínculo salvo, e só depois tentar CNPJ
Arquivo: `supabase/functions/superlogica-sync/index.ts`
- Alterar a resolução do cliente para:
  1. usar `superlogica_customer_id` salvo no contrato;
  2. só se ausente, tentar achar por CNPJ.
- Isso elimina a dependência da redescoberta do cliente em cada sincronização.
- Manter o fallback por valor entre contratos do mesmo CNPJ que já foi planejado.

5. Ajustar mapeamentos e carregamento do front
Arquivos:
- `src/lib/dbMappers.ts`
- tipos relacionados em `src/types/index.ts`
- qualquer uso em `DataContext`
- Mapear o novo campo snake_case/camelCase corretamente para leitura e update.
- Garantir que `updateContract()` persista esse novo elo sem regressão.

6. Backfill mínimo e seguro
- Para contratos que já têm `superlogicaSubscriptionId` mas não têm `superlogicaCustomerId`, manter o sistema funcional com fallback por CNPJ.
- Não tentar adivinhar em massa no escuro nesta etapa.
- O preenchimento pode ocorrer naturalmente ao relink manual dos casos pendentes, ou em passo separado se necessário.

Validação após implementar
- Testar um contrato hoje problemático na conciliação.
- Confirmar que a busca retorna candidatos e que o vínculo grava assinatura + cliente API.
- Reabrir a tela e verificar que o contrato saiu de “sem vínculo”.
- Rodar sincronização e confirmar que ela usa o `superlogicaCustomerId` salvo, sem depender de nova busca por CNPJ.
- Revalidar especificamente um caso com sugestão manual por nome.
- Se o build falhar novamente apenas por timeout de upload, repetir publicação, pois isso é separado da correção funcional.

Arquivos previstos
- `supabase/migrations/...sql`
- `supabase/functions/superlogica-search-subscriptions/index.ts`
- `supabase/functions/superlogica-sync/index.ts`
- `src/pages/ReceivablesReconcilePage.tsx`
- `src/lib/dbMappers.ts`
- `src/types/index.ts`

Não vou alterar
- RBAC
- subprojetos
- filtros do Dashboard
- fluxo de senha/login
- regras financeiras já existentes

Detalhes técnicos
```text
Fluxo corrigido:
Buscar cliente/assinaturas -> escolher assinatura -> salvar subscription_id + customer_id no contrato
-> sync usa customer_id persistido -> busca cobranças -> distribui por assinatura/valor
```

Risco principal
- O problema atual parece menos “CNPJ inexistente” e mais “vínculo incompleto com a API”. Persistir o `customer_id` é a correção estrutural para parar de redescobrir o cliente toda vez.
