# Status: logos dos clientes

## O que já está pronto

- **Backend**
  - Coluna `logo_url` já existe na tabela `public.clients` (migration `20260616131428...`).
  - Bucket `client-logos` no Storage com políticas RLS para SELECT/INSERT/UPDATE/DELETE (mesma migration).
- **Componente reutilizável**
  - `src/components/clients/ClientLogo.tsx` já renderiza a logo via URL assinada do Storage, com fallback de iniciais coloridas.
- **Upload/remoção**
  - `src/components/forms/ClientForm.tsx` já permite enviar, trocar e remover a logo no cadastro/edição de cliente (limite 2MB, imagens).
- **Telas que já exibem a logo**
  - `src/pages/ClientsPage.tsx` — cards da lista de clientes.
  - `src/pages/ContractDetailPage.tsx` — botão que leva à página do cliente.
  - `src/pages/ReportsPage.tsx` e `src/pages/ReportEditPage.tsx` — cabeçalho dos relatórios.

## O que ainda falta

1. **Página de detalhe do cliente (`src/pages/ClientDetailPage.tsx`)**
   - O header ainda mostra o ícone genérico `Building2`; deve usar `ClientLogo`.

2. **Página de listagem de contratos (`src/pages/ContractsPage.tsx`)**
   - Os cards de contrato mostram apenas o nome do cliente em texto; podem exibir a logo ao lado.

3. **Página de recursos do contrato (`src/pages/ContractResourcesPage.tsx`)**
   - O `PageHeader` mostra o nome do cliente na descrição, mas sem logo; pode incluir `ClientLogo`.

4. **Relatório mensal em PPTX (`src/lib/generatePptx.ts`)**
   - A capa e o slide de encerramento usam apenas a logo BNP. Deve aceitar a logo do cliente como base64 e inseri-la ao lado (ou no lugar) da logo BNP, conforme identidade visual do relatório.
   - Para isso, `ReportEditPage.tsx` precisa passar `clientLogoUrl` para `generatePptx`.

## Plano de implementação

1. Substituir o ícone genérico do header de `ClientDetailPage` por `ClientLogo` (tamanho `lg`).
2. Inserir `ClientLogo` no card de cada contrato em `ContractsPage`, ao lado das informações do cliente.
3. Adicionar `ClientLogo` no `PageHeader` de `ContractResourcesPage`, mantendo o nome do cliente.
4. Estender `GeneratePptxInput` com `clientLogoUrl?: string`.
5. Em `generatePptx`, carregar a logo do cliente como base64 e renderizá-la no slide de capa e/ou encerramento, alinhada com a logo BNP.
6. Em `ReportEditPage.tsx`, passar `clientLogoUrl: client?.logoUrl` na chamada de `generatePptx`.
7. Verificar build (`bunx tsc --noEmit`) e, se possível, gerar um PPTX de teste para validar a posição da logo.

## Decisões pendentes para você confirmar

- **No PPTX**, a logo do cliente deve:
  - A) Substituir a logo BNP na capa?
  - B) Ficar ao lado da logo BNP na capa?
  - C) Aparecer apenas no slide de encerramento?
- **Tamanho preferido** da logo do cliente no PPTX (proporção e posição)?
- **Nas telas de contrato**, a logo deve aparecer em todos os cards da lista ou apenas na visualização do contrato (já está em `ContractDetailPage`)?