## Objetivo

Permitir que cada contrato tenha sua própria logo (ex.: SCEIC → PROMAC, ICMS), mantendo fallback automático para a logo do cliente quando o contrato ainda não tem uma personalizada.

## Como funciona hoje

- `clients.logo_url` existe e é gerenciado pelo `ClientForm` (upload para o bucket `client-logos`).
- `<ClientLogo>` (`src/components/clients/ClientLogo.tsx`) resolve `logoUrl` em URL assinada e cuida do fallback (iniciais coloridas).
- Em listagens/detalhes de contrato, hoje é renderizada a logo do **cliente**.

## Mudanças

### 1. Schema (migration)
Adicionar coluna em `contracts`:
```sql
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS logo_url text;
```
Sem alteração em RLS (políticas existentes da tabela já cobrem).

### 2. Storage
Reutilizar o bucket `client-logos` existente (já privado, já tem políticas de leitura/escrita para autenticados). Arquivos de contrato ficam no prefixo `contracts/{contractId}/...` para isolar dos de cliente.

### 3. Tipos e mappers
- `src/types/index.ts` → `Contract` ganha `logoUrl?: string`.
- `src/lib/dbMappers.ts` → mapear `logo_url` ⇄ `logoUrl` no contrato (igual ao padrão do cliente).
- Regenerar `src/integrations/supabase/types.ts` via migration (automático).

### 4. Componente de logo
Generalizar `ClientLogo` para `EntityLogo` (ou criar `ContractLogo` casca finíssima que delega):
- Aceita `nome`, `logoUrl` e — para contrato — um `fallbackLogoUrl` (a do cliente).
- Lógica de resolução: se `logoUrl` definido → usa; senão se `fallbackLogoUrl` definido → usa; senão → iniciais.
- Mantém a mesma resolução de URL assinada para qualquer caminho do bucket `client-logos`.

Para não quebrar nada, mantenho `ClientLogo` exportando o mesmo nome/props atuais e adiciono `ContractLogo` no mesmo arquivo (ou em `src/components/contracts/ContractLogo.tsx`) que apenas chama a lógica compartilhada com fallback.

### 5. Formulário do contrato (`ContractForm.tsx`)
Adicionar bloco de upload de logo idêntico ao do `ClientForm`:
- Campo opcional "Logo do contrato".
- Preview mostra: logo do contrato se houver; senão, **a logo do cliente selecionado** com um rótulo discreto "Usando logo do cliente" para deixar claro que é fallback.
- Botões: "Enviar logo" / "Trocar logo" / "Remover logo".
- "Remover logo" zera `logoUrl` do contrato → volta a usar a do cliente automaticamente.
- Upload imediato para `client-logos/contracts/{contractId}/...` após salvar o contrato (mesmo padrão do `ClientForm`, que faz upload pós-create quando o ID ainda não existe).
- Limpeza do arquivo antigo no storage ao trocar/remover (mesmo padrão atual).

### 6. Exibição (fallback automático)
Em todos os pontos onde a logo do contrato aparece, passar `contract.logoUrl` como principal e `client.logoUrl` como fallback:
- `src/pages/ContractDetailPage.tsx`
- `src/pages/ContractsPage.tsx` (cards/linhas)
- `src/pages/ContractResourcesPage.tsx`
- `src/pages/ReportEditPage.tsx` e `src/pages/ReportsPage.tsx` (cabeçalho do relatório do contrato)

A regra é única e centralizada no componente: **contract.logoUrl ?? client.logoUrl**. Não há cópia de arquivo nem sincronização — o fallback é puramente em tempo de render, então qualquer atualização futura da logo do cliente continua refletindo nos contratos que não personalizaram.

## Fora de escopo
- Nenhuma alteração em clientes, permissões, RLS, ou em outras telas.
- Sem migração de dados — contratos existentes começam com `logo_url` nulo e seguem usando a logo do cliente automaticamente.
- Sem mudanças visuais de estilo (segue padrão atual do `ClientLogo` em tamanhos sm/md/lg).

## Resultado
- Cliente com logo X, contrato sem logo → contrato exibe X.
- Usuário sobe logo Y no contrato → contrato passa a exibir Y; cliente continua com X.
- Usuário remove a logo Y do contrato → volta a exibir X automaticamente.
- Cliente troca logo X por X' depois → contratos sem personalização passam a exibir X' (sem retrabalho).