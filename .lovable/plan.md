

## Importação completa dos dados de RH via banco de dados

### Resumo dos dados

- **134 pessoas** na Página 1 da planilha
- **~309 eventos de timeline** na Página 2
- **10 departamentos** precisam ser criados
- **~35 cargos** precisam ser criados

### Sequência de execução

#### Etapa 1 — Criar departamentos (teams) ausentes

Inserir os seguintes departamentos que não existem no banco:

| Departamento | Status |
|---|---|
| SRE | Novo |
| Qualidade | Novo |
| Projetos | Novo |
| Marketing | Novo |
| RH | Novo |
| Financeiro | Novo |
| Comercial | Novo |
| Gestão | Novo |
| Infraestrutura | Novo |
| Administrativo | Novo |

Departamentos existentes que serão reutilizados: Dados, Desenvolvimento, Estrutura, IA, Suporte.

#### Etapa 2 — Criar cargos (job_titles) ausentes

Inserir aproximadamente 35 cargos novos que aparecem na planilha mas não existem no banco. Exemplos: Administrador de Redes, Analista Administrativo, Coordenador de Suporte, Designer Grafico, Engenheiro de Dados, Tech lead, etc.

Os cargos existentes serao reutilizados (Analista de Dados, Analista de Implantacao, Analista de Suporte, Desenvolvedor Backend, Desenvolvedor Frontend, Desenvolvedor Full Stack, Gerente de Projetos, Product Owner, QA/Tester, Tech Lead, UX Designer).

#### Etapa 3 — Inserir as 134 pessoas em `hr_people`

Para cada pessoa da planilha, sera criado um registro com todos os campos:

- `nome`, `tipo_vinculo` (clt/pj/socio/cooperado/estagio)
- `cargo_id` (resolvido pelo nome do cargo criado na Etapa 2)
- `team_id` (resolvido pelo nome do departamento criado na Etapa 1)
- `remuneracao_mensal`, `remuneracao_ii`, `beneficios`
- `data_admissao`, `situacao` (ativo/inativo)
- `nivel`, `trilha`, `projeto`, `cargo_antigo`
- `local_atuacao`, `comite_gestor`, `observacoes`
- `data_desligamento`, `tipo_desligamento`, `motivo_desligamento`, `observacoes_desligamento`
- `email`, `celular`, `id_externo`, `centro_custo`

Tratamentos especiais:
- Tipo vinculo "Socio" sera mapeado como texto livre (o campo aceita qualquer texto)
- Pessoas sem data de admissao terao a data padrao do banco (CURRENT_DATE)
- Remuneracao vazia sera 0 (default do banco)
- "Tipo_Motivo_Desligamento": "Dispensado" -> tipo=dispensado, "Solicitou dispensa" -> tipo=solicitou-dispensa, outros como texto em observacoes_desligamento

#### Etapa 4 — Inserir os ~309 eventos de timeline em `hr_timeline`

Para cada evento da Pagina 2, sera criado um registro vinculado a pessoa correspondente:

- `person_id`: resolvido pelo nome da pessoa
- `event_date`: data do evento
- `ocorrencia`: "reajuste" para valores numericos, "observacao" para textos (ex: "VA +R$500,00", "Funcao - Analista de Infraestrutura", "Nivel Pleno")
- `descricao`: texto descritivo do evento
- `valor`: valor numerico quando aplicavel
- `remuneracao_apos`: mesmo valor numerico
- `atualizar_remuneracao`: false (a remuneracao ja esta definida no cadastro)

Tratamentos especiais para valores nao numericos:
- "VA +R$300,00" -> ocorrencia "observacao", descricao "VA +R$300,00"
- "Funcao - Analista de Suporte" -> ocorrencia "observacao", descricao "Funcao - Analista de Suporte"
- "Nivel Pleno" -> ocorrencia "observacao", descricao "Nivel Pleno"
- "Estac +R$270,00" -> ocorrencia "observacao", descricao "Estac +R$270,00"
- "Reducao CH para 80hs/mes" -> ocorrencia "observacao", descricao "Reducao CH para 80hs/mes"
- Datas invalidas (ex: "37/03/2025", "ultimo salario R$3.419,00") serao ignoradas

### Detalhes tecnicos

A importacao sera feita via uma edge function dedicada que:

1. Recebe um POST com os dados estruturados
2. Usa o service role key para bypass de RLS
3. Executa as insercoess em lotes (batch inserts) para performance
4. Retorna um relatorio com contagem de registros inseridos

Alternativamente, os dados podem ser inseridos diretamente via SQL usando a ferramenta de insercao do banco, em blocos de ~20 registros por vez para evitar timeout.

### Validacao pos-importacao

Apos a importacao, sera verificado:
- Contagem de registros em `hr_people` = 134
- Contagem de registros em `hr_timeline` ~ 309
- Todos os departamentos e cargos resolvidos corretamente
- Pessoas com desligamento tem os campos preenchidos
- Eventos de timeline vinculados as pessoas corretas

