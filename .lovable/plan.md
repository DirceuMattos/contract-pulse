## Destaque visual de contratos Encerrados/Suspensos

### 1. `src/pages/ContractsPage.tsx` (linhas 547–601)
- Adicionar `cn(...)` à `<Card>`: quando `contract.status === 'encerrado' || 'suspenso'` → `bg-neutral-900 border-neutral-700`.
- Aplicar `text-neutral-300` (condicional) ao `<h3>` do nome (linha 561) e ao `<div>` com cliente/datas/responsável (linha 588).
- Inserir, logo após o `<h3>` do nome (antes do Badge de código), badges:
  - `Encerrado` → `bg-red-900 text-red-100 border-red-800`
  - `Suspenso` → `bg-yellow-900 text-yellow-100 border-yellow-800`

### 2. `src/pages/HRPersonDetailPage.tsx` (linhas 602–613)
- Na `TableCell` do nome do contrato (linha 606), envolver em flex e adicionar Badge pequeno quando `contract?.status === 'encerrado'` (vermelho) ou `'suspenso'` (amarelo).

### 3. `src/pages/SquadsPage.tsx` (linhas 568–572)
- Buscar `const contract = contracts.find(c => c.id === cd.contractId);` no escopo do card.
- Ao lado do `<CardTitle>`, adicionar Badge `text-[10px]` quando `contract?.status === 'encerrado'` (vermelho) ou `'suspenso'` (amarelo).

Nenhuma lógica de filtragem, ordenação, cálculo ou navegação é alterada. `Badge` já está importado nos três arquivos; `cn` já em uso em ContractsPage.