

# Retorno ao módulo Squads após navegação

## Problema
Os botões "Ver contrato" e "Ver recursos" no módulo Squads navegam para `/contratos/:id`, mas os botões de voltar nessas páginas redirecionam para `/contratos` em vez de `/squads`.

Além disso, ambos os botões na visão por projeto (linhas 391-396) apontam para a mesma URL (`/contratos/${cd.contractId}`), quando "Ver recursos" deveria ir para `/contratos/${cd.contractId}/recursos`.

## Alterações

### 1. SquadsPage.tsx — Passar `state` na navegação e corrigir URL de recursos

- Linha 391: `navigate(/contratos/${cd.contractId}, { state: { from: '/squads' } })`
- Linha 394: Corrigir URL para `/contratos/${cd.contractId}/recursos` e passar `{ state: { from: '/squads' } }`

### 2. ContractDetailPage.tsx — Usar `state.from` no botão voltar

- Linha 153: Alterar o `onClick` do botão `<ArrowLeft>` para usar `location.state?.from || '/contratos'` como destino
- Importar `useLocation` (já importa `useNavigate` e `useParams`)

### 3. ContractResourcesPage.tsx — Usar `state.from` no breadcrumb/voltar

- O `PageHeader` tem breadcrumbs com `href: '/contratos'`. Quando vindo do Squads, o link "Contratos" no breadcrumb deve apontar para `/squads`
- Adicionar `useLocation`, ler `location.state?.from` e ajustar o primeiro breadcrumb e qualquer botão de voltar

