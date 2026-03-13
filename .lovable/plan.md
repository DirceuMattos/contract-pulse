

## Resultado da Investigação: Campos da API Feedz vs Sistema de Contratos

Analisei a documentação oficial da API Feedz (endpoint `GET /v2/integracao/employees`) e o código atual do `feedz-sync`. Segue o mapeamento completo:

### Tabela de Correlação

| Campo no Sistema | Campo na API Feedz | Status no código atual | Observação |
|---|---|---|---|
| `situacao` (ativo/inativo) | `status` ("Ativo", "Desligado", "Desativado") | ✅ Já mapeado corretamente | Função `normalizeFeedzStatus()` converte |
| `data_desligamento` | `dismissal_at` + `last_day_worked` (employees) | ⚠️ Parcial | Nem sempre presente. Endpoint de Turnover (`/employees/turnover`) tem `last_day_working` com mais detalhe |
| `cargo_id` | `job_description.title` | ✅ Já mapeado | Usa alias (`feedz_alias_mappings`) para resolver |
| `team_id` (departamento) | `department_data.name` ou `department` (string) | ✅ Já mapeado | Usa alias para resolver |
| `tipo_vinculo` | **NÃO EXISTE** na API de employees | ❌ Indisponível | O campo `contract_type` (CLT/PJ/Estágio) existe **apenas** no endpoint de **Admissão Digital**, não no de colaboradores |
| `remuneracao_mensal` | `remuneration` (string, ex: "5000.00") | ✅ Já mapeado | Código atual já protege contra valor inválido/zero |

### Conclusão

**5 dos 6 campos já estão mapeados corretamente no código atual.** O único campo que não pode ser sincronizado é o `tipo_vinculo`, porque a API Feedz simplesmente **não retorna esse dado** no endpoint de listagem de colaboradores. A decisão anterior de remover `tipo_vinculo` do payload de UPDATE estava correta.

Para a **data de desligamento**, o endpoint de Turnover (`/v2/integracao/employees/turnover`) retorna dados mais completos (campo `last_day_working`, `reason`, `type`). Podemos enriquecer o fluxo de desligamento consultando este endpoint quando `dismissal_at` estiver vazio.

### Plano de Implementação

1. **Consultar endpoint de Turnover para datas de desligamento** — Quando um colaborador vier como "Desligado"/"Desativado" sem `dismissal_at`, fazer uma segunda consulta ao `/employees/turnover` para buscar `last_day_working` antes de usar o fallback (data atual).

2. **Manter `tipo_vinculo` protegido** — Confirmar que não é tocado em CREATE nem UPDATE. No CREATE, usar valor padrão configurável (hoje 'clt') com nota de auditoria.

3. **Sem outras alterações de mapeamento necessárias** — Os demais campos (cargo, departamento, remuneração, status) já estão funcionando corretamente.

### Detalhes Técnicos

**Arquivo**: `supabase/functions/feedz-sync/index.ts`

- Adicionar função `fetchTurnoverData(feedzToken)` que busca `/v2/integracao/employees/turnover` (paginado) e retorna um mapa `profileId → last_day_working`
- No fluxo TERMINATE (Case B2 — inativo sem data), consultar esse mapa antes de usar fallback
- No CREATE, documentar no `after_snapshot` que `tipo_vinculo` é valor padrão (não veio do Feedz)

