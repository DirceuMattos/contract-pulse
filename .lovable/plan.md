

## Plano: Aplicar Correções de RH com Suporte a Rollback

### Contexto
O CSV contém 134 registros com campos corrigidos. Campos vazios no CSV significam "sem alteração" (manter o valor atual do banco). Campos com valor significam "corrigir para este valor". A correspondência será feita pelo **nome** (exato).

### Campos que serão comparados e corrigidos
`tipo_vinculo`, `cargo_id` (via nome do cargo), `team_id` (via nome do departamento), `local_atuacao`, `data_admissao`, `situacao`, `data_desligamento`, `observacoes_desligamento` (coluna Tipo_Motivo_Desligamento do CSV), `nivel`, `trilha`, `projeto`, `cargo_antigo`, `email`, `celular`, `id_externo`, `centro_custo`, `observacoes`, `comite_gestor`, `remuneracao_mensal`, `remuneracao_ii`, `beneficios`

### Etapas

**1. Migração — Tabelas de auditoria de correções**
Criar duas tabelas:
- `hr_correction_runs`: registra cada lote de correção (timestamp, status, total de alterações)
- `hr_correction_items`: armazena por pessoa o snapshot completo antes da correção e os campos alterados (JSON), vinculado ao run_id e person_id

**2. Edge Function `hr-apply-corrections`**
- Recebe o array de registros do CSV (já parseado pelo frontend)
- Para cada registro:
  - Busca pessoa por nome exato (case-insensitive)
  - Compara apenas campos preenchidos no CSV com os valores atuais do banco
  - Se houver divergência, grava o snapshot "antes" em `hr_correction_items` e aplica o UPDATE
  - Resolve `cargo_id` e `team_id` buscando nas tabelas `job_titles` e `teams` pelo label/name
- Retorna resumo: total processado, alterados, não encontrados, sem divergência

**3. Edge Function `hr-rollback-corrections`**
- Recebe o `run_id`
- Para cada item do run, restaura o snapshot original na tabela `hr_people`
- Marca o run como "rolled_back"

**4. Frontend — Gatilho no módulo RH**
- Adicionar botão "Aplicar Correções" no `HRPeoplePage` (similar ao fluxo de importação)
- Dialog simples: upload do CSV → preview das divergências encontradas → confirmar aplicação
- Exibir resultado e opção de rollback
- Listar runs anteriores com status e botão de rollback

### Mapeamentos específicos do CSV
| Coluna CSV | Campo DB | Notas |
|---|---|---|
| Tipo_Vinculo | tipo_vinculo | "Sócio"→"socio", "PJ"→"pj", "Cooperado"→"cooperado", "Estágio"→"estagio", vazio→sem alteração |
| Cargo_Funcao | cargo_id | Busca em job_titles.label |
| Departamento | team_id | Busca em teams.name |
| Situacao | situacao | "Ativo"→"ativo", "Inativo"→"inativo" |
| Tipo_Motivo_Desligamento | observacoes_desligamento | Mapeado para o campo de observações de desligamento |

