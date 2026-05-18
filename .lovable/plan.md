## Mudança em `src/types/moduleAccess.ts`

Substituir a lista atual do perfil `demo` em `ROLE_DEFAULT_MODULES` pela lista solicitada (adiciona `SETTINGS`, `USERS_ADMIN`, `IMPORT_EXPORT`):

```ts
demo: ['DASHBOARD', 'ALERTS', 'CLIENTS', 'CONTRACTS', 'CONTRACT_DETAIL', 'SQUADS', 'HR', 'CALCULATOR', 'HISTORY', 'DOCUMENTS', 'RESOURCES', 'SETTINGS', 'USERS_ADMIN', 'IMPORT_EXPORT', 'OVERTIME', 'TRANSPORT', 'JOB_REQUESTS', 'JOB_SKILLS'],
```

## Sobre os itens 2 e 3 — nenhuma alteração necessária

**Item 2 (fallback):** A função `getDefaultModuleAccess` já trata `demo` explicitamente. A lógica é:
1. `roleRestrictions` do módulo (prioridade máxima)
2. Se `customDefaults !== undefined` (caso do `demo`), usa exatamente a lista declarada
3. Só cai no branch "todos habilitados" para roles sem entrada em `ROLE_DEFAULT_MODULES` (c-level, leitor)

Como `demo` está em `ROLE_DEFAULT_MODULES`, ele nunca cai em fallback. Nenhuma correção necessária.

**Item 3 (useModuleAccess):** O hook lê `userRole` direto do `AuthContext` (que já tipa `UserRole` incluindo `'demo'`) e o passa para `getDefaultModuleAccess`. Nenhuma correção necessária.

## ⚠️ Observação importante

Os módulos `SETTINGS` e `USERS_ADMIN` no `MODULE_CATALOG` têm `roleRestrictions: ['c-level']`. Isso significa que, mesmo incluindo-os na lista do `demo`, eles serão forçados a `false` pela regra de prioridade #1 (role restriction). O `IMPORT_EXPORT` não tem restrição, então funcionará.

**Quer que eu também remova `'c-level'` exclusivo das restrições de `SETTINGS`/`USERS_ADMIN` para liberar acesso ao demo?** Isso afetaria a regra existente. Por padrão, vou apenas atualizar a lista do `demo` conforme pedido, e os dois módulos restritos continuarão bloqueados pela restriction — me avise se quiser mudar isso também.
