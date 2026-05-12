## Objetivo

Permitir que usuários com perfil **Líder de Tribo** editem dedicação e movam recursos entre squads/subprojetos, **sem** ganhar acesso a valores ou edição de contratos/recursos.

## Diagnóstico

A UI de Squads já exibe os botões de edição para Líder de Tribo (`canEdit=true` no `AuthContext`), mas as gravações falham porque as políticas RLS no banco **não incluem** o role `lider_tribo` nas tabelas:

- `resources` (UPDATE) — usado ao alterar % de dedicação e ao mover recurso entre contratos sem subprojeto
- `subproject_allocations` (UPDATE / INSERT / DELETE) — usado ao alterar % e ao mover entre subprojetos

Demais restrições já estão garantidas:
- `contracts` UPDATE não inclui `lider_tribo` → não consegue alterar contratos ✓
- `canViewValues=false` e `canViewHRCosts=false` para `lider_tribo` → não vê valores ✓
- Página Squads não exibe custos ✓

## Mudança proposta

### 1. Migração SQL (única alteração)

Atualizar as políticas RLS adicionando `'lider_tribo'::app_role` ao array de roles permitidos:

- `resources_update` → `has_any_role([..., 'lider_tribo'])`
- `spa_update` → `has_any_role([..., 'lider_tribo'])`
- `spa_insert` → `has_any_role([..., 'lider_tribo'])` (necessário ao mover para outro subprojeto, que faz `addAllocation`)
- `spa_delete` → permitir `lider_tribo` (necessário ao mover para fora de um subprojeto, que faz `deleteAllocation`)

`resources_delete` e `contracts_*` permanecem **inalterados** — Líder de Tribo continua sem poder excluir recursos nem mexer em contratos.

### 2. Sem mudanças de UI/código

- `AuthContext`: `canEdit=true` (já está), `canCreate=false`, `canDelete=false`, `canViewValues=false`, `canViewHRCosts=false` permanecem como hoje.
- `SquadsPage`, `EditResourceAllocationDialog` e `SubprojectManagementPanel` permanecem como estão — eles já gateiam por `canEdit` e os fluxos de "alterar dedicação" e "mover entre projetos/subprojetos" funcionarão assim que o RLS permitir.

## Resultado esperado

Líder de Tribo poderá, na tela de Squads:
- Ajustar o % de dedicação dos recursos
- Mover recursos entre contratos e entre subprojetos

E continuará **sem** poder:
- Ver valores financeiros (contratos ou recursos)
- Editar dados de contratos
- Editar cadastro/valores dos recursos no detalhe do contrato
- Excluir recursos
