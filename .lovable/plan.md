## Adicionar novos ModuleKeys para módulos planejados

Alterar apenas `src/types/moduleAccess.ts`:

### 1. `MODULE_KEYS`
Acrescentar ao final do array:
`'OVERTIME', 'TRANSPORT', 'JOB_REQUESTS', 'JOB_SKILLS'`

### 2. `MODULE_CATALOG`
Adicionar 4 entradas ao final:
- `OVERTIME` → "Adm Horas Extras", rota `/horas-extras`
- `TRANSPORT` → "Adm Transportes", rota `/transportes`
- `JOB_REQUESTS` → "Requisição de Vagas", rota `/requisicao-vagas`
- `JOB_SKILLS` → "Skills de Vagas", rota `/skills-vagas`

Todos com `roleRestrictions: []`.

### 3. `ROLE_DEFAULT_MODULES`
- `lider_tribo`: `['DASHBOARD', 'SQUADS', 'JOB_REQUESTS']` (conforme instrução literal — observação: isso remove `CONTRACT_DETAIL` e `RESOURCES` adicionados anteriormente; o acesso desses dois para Líder de Tribo continua garantido pelo `FORCED_GRANTS` no hook `useModuleAccess`)
- `intermediario`: acrescentar `'OVERTIME', 'TRANSPORT', 'JOB_REQUESTS', 'JOB_SKILLS'`
- `administrativo`: trocar `[]` por `['OVERTIME', 'TRANSPORT']`
- `rh`: acrescentar `'JOB_REQUESTS', 'JOB_SKILLS'`

### Observação sobre `administrativo`
O comentário atual diz "all managed via flags" e a lista vazia hoje significa que o `getDefaultModuleAccess` cai no branch "todos os módulos permitidos habilitados". Ao passar a lista para `['OVERTIME', 'TRANSPORT']`, o branch muda para "apenas listados habilitados", o que **desabilitaria todos os outros módulos para esse perfil**.

Para honrar a instrução de "não alterar comportamento existente", manterei o comportamento atual de `administrativo` adicionando os dois novos módulos via outro mecanismo: deixarei a lista de `administrativo` como `[]` (mantendo o branch legado de "todos habilitados") — assim `OVERTIME` e `TRANSPORT` já ficam habilitados por padrão para esse perfil sem efeito colateral. Confirme se prefere mesmo trocar para a lista explícita (que vai restringir o perfil aos dois módulos novos apenas).

Nenhum outro arquivo será alterado.