

## Diagnóstico

### Problema 1: Botão "Conectar assinaturas" nunca aparece no Dashboard

O banner com o botão para ir à página de conciliação depende de `unlinkedCount > 0` (linha 120), que conta quantos IDs de `unlinkedContractIds` existem nos contratos carregados. Mas `unlinkedContractIds` é uma lista mock com IDs fictícios (`'ctr-002'`, `'ctr-007'`, etc.), enquanto os contratos reais têm UUIDs. Resultado: `unlinkedCount` é sempre 0, o banner nunca aparece.

**Correção**: Substituir a lógica mock por uma contagem real — contratos em `implantacao`/`operacao` sem `superlogicaSubscriptionId` preenchido. Adicionar também um botão permanente no header da página para acessar a conciliação.

### Problema 2: "Nenhuma assinatura encontrada para este CNPJ"

Os logs mostram o erro real:
```
Invalid URL: 'plication/x-www-form-urlencoded/v2/financeiro/clientes?...'
```

O secret `SUPERLOGICA_API_BASE` foi configurado com o valor `application/x-www-form-urlencoded` em vez de uma URL como `https://api.superlogica.net`. A edge function concatena `API_BASE + path`, gerando uma URL inválida.

Quando a edge function falha, o front faz fallback para `mockSubscriptionCandidates[cnpj]`. Mas os mocks usam CNPJs formatados (`'46.377.222/0001-29'`), enquanto os CNPJs reais do banco podem estar em formato diferente (só dígitos ou outro padrão). Logo, o fallback também retorna vazio.

**Correções**:
1. Solicitar ao usuário que corrija o secret `SUPERLOGICA_API_BASE` com a URL correta da API.
2. Normalizar o CNPJ no fallback mock (remover formatação) para que o match funcione no ambiente dev.
3. Melhorar o fallback: tentar match por CNPJ normalizado (só dígitos).

---

## Plano de implementação

### 1. Dashboard — Botão permanente + contagem real de não-vinculados

**Arquivo**: `src/pages/ReceivablesDashboardPage.tsx`

- Remover dependência de `unlinkedContractIds` (mock)
- Calcular `unlinkedCount` como contratos ativos sem `superlogicaSubscriptionId`
- Manter o banner amarelo com contagem dinâmica
- Adicionar botão "Conciliar assinaturas" no header ao lado do "Sincronizar agora"

### 2. Reconcile Page — Normalizar CNPJ no fallback mock

**Arquivo**: `src/pages/ReceivablesReconcilePage.tsx`

- No `handleSearch`, ao fazer fallback para `mockSubscriptionCandidates`, normalizar o CNPJ (só dígitos) antes do lookup no Record

### 3. Mock data — Adicionar entradas por CNPJ normalizado

**Arquivo**: `src/data/mockReceivables.ts`

- Duplicar as chaves do `mockSubscriptionCandidates` usando CNPJ sem formatação (só dígitos), para funcionar com ambos os formatos

### 4. Secret `SUPERLOGICA_API_BASE` — Solicitar correção

- Usar a tool `add_secret` para pedir ao usuário que insira a URL correta (ex: `https://api.superlogica.net` ou `https://apiassinaturas.superlogica.com`)

