
## Migração de Recursos Humanos Existentes para o Módulo RH

### Contexto

A tabela `hr_people` está vazia (0 registros). A tabela `resources` possui **20 pessoas únicas** do tipo CLT ou PJ, distribuídas em múltiplos contratos. O objetivo é copiar essas pessoas para o cadastro mestre de RH — sem apagar nem alterar nenhum dado de contrato existente.

---

### Pessoas a Migrar (20 registros identificados)

| Nome | Vínculo | Cargo atual | Custo base (máx.) |
|---|---|---|---|
| Allan Nemes | PJ | DevOps Engineer | R$ 14.000 |
| Bianca Dezorzi | PJ | Líder de Tribo | R$ 7.000 |
| Danilo Shiguenori | PJ | Desenvolvedor Full Stack | R$ 14.200 |
| Dário Domingues | PJ | Tech Lead | R$ 10.500 |
| Enzo | CLT | Analista de Suporte | R$ 2.595,36 |
| Fabio | CLT | Analista de Dados | R$ 3.200 |
| Felipe Lima | PJ | DevOps Engineer | R$ 8.000 |
| Fernanda Baccarini | CLT | QA/Tester | R$ 4.190,80 |
| Giuliano | PJ | Analista de Negócios | R$ 6.000 |
| Janaína | CLT | Analista de Dados | R$ 3.478,36 |
| Jéssica Freire | CLT | Product Owner | R$ 8.095,20 |
| Jonas | PJ | Desenvolvedor Full Stack | R$ 6.000 |
| Jonathas | PJ | Tech Lead | R$ 14.200 |
| Karina | CLT | Analista de Suporte | R$ 2.585 |
| Kleverton | PJ | QA/Tester | R$ 5.000 |
| Lais Lene | PJ | Analista de Suporte | R$ 5.000 |
| Matheus Louly | CLT | Desenvolvedor Full Stack | R$ 7.500 |
| Renan Sousa | CLT | UX Designer | R$ 3.666,65 |
| Roberta Silva | CLT | Product Owner | R$ 4.200 |
| Samuel | PJ | Desenvolvedor Full Stack | R$ 6.000 |

**Regras aplicadas:**
- Quando a mesma pessoa aparece em múltiplos contratos com **custos diferentes**, usa-se o **custo mais alto** como remuneração mensal de referência.
- O `cargo_id` é resolvido automaticamente via JOIN com a tabela `job_titles` pelo nome exato do cargo.
- O `team_id` é derivado do cargo (cada cargo já possui uma equipe padrão cadastrada).
- `data_admissao` será definida como a **data de início mais recente** nos contratos (melhor aproximação disponível).
- `situacao` = `'ativo'` para todos (nenhum tem `data_fim` definida).
- `beneficios` = 0 (dado não disponível nos recursos de contrato).

---

### O que Será Feito

**Uma única migração SQL via banco de dados**, sem alteração de nenhum arquivo de código. A migração fará:

1. **`INSERT INTO hr_people`** — usando `SELECT DISTINCT` na tabela `resources` para extrair as pessoas únicas, com resolução automática dos `cargo_id` e `team_id` via JOIN com `job_titles`.

2. **Nenhuma alteração** em `resources`, `contracts` ou qualquer outra tabela existente.

3. **Nenhum código de frontend** precisa mudar — o `HRContext` já carrega do banco automaticamente ao carregar a página.

---

### SQL da Migração

```sql
INSERT INTO public.hr_people (
  nome,
  tipo_vinculo,
  cargo_id,
  team_id,
  remuneracao_mensal,
  beneficios,
  data_admissao,
  situacao
)
SELECT DISTINCT ON (r.nome)
  r.nome,
  r.tipo::text AS tipo_vinculo,
  jt.id AS cargo_id,
  jt.team_id,
  MAX(r.custo_base) OVER (PARTITION BY r.nome) AS remuneracao_mensal,
  0 AS beneficios,
  MAX(r.data_inicio) OVER (PARTITION BY r.nome) AS data_admissao,
  'ativo' AS situacao
FROM resources r
LEFT JOIN job_titles jt ON jt.label = r.cargo
WHERE r.tipo IN ('clt', 'pj')
  AND r.nome IS NOT NULL
  AND r.nome != ''
ORDER BY r.nome, r.data_inicio DESC;
```

---

### Detalhes Técnicos

- A migração usa `DISTINCT ON (r.nome)` para garantir um único registro por pessoa.
- O JOIN com `job_titles` resolve automaticamente os IDs dos cargos: todos os 20 cargos existentes na tabela `resources` (DevOps Engineer, Tech Lead, etc.) já possuem correspondência exata na tabela `job_titles`.
- O `team_id` vem direto do `job_titles.team_id`, sem necessidade de lógica adicional.
- Pessoas como "Felipe Lima" (que aparece em 2 contratos como PJ/DevOps) e "Fernanda Baccarini" (2 contratos como CLT/QA) serão inseridas **uma única vez** com o custo máximo.
- Não há risco de duplicação pois `hr_people` está vazia.

---

### Resultado Esperado

Após a migração, ao acessar o módulo **Recursos Humanos → Pessoas**, os 20 profissionais estarão listados com:
- Nome, vínculo (CLT/PJ), cargo, departamento e data de admissão preenchidos
- Remuneração mensal populada (visível apenas para usuários com permissão `canViewHRCosts`)
- Situação "Ativo" para todos
- Linha do Tempo vazia (pronta para receber eventos futuros)

Os contratos existentes continuam funcionando normalmente — os dados em `resources` não são tocados.
