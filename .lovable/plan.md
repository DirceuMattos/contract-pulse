

## Plano: Distribuir todos os recursos do SCIEC para os 3 subprojetos

### Situação atual

O contrato SCIEC possui:
- **8 CLT**: Fabio Zanin, Fernanda Matuda, Gustavo Ramos, Heloyse Ribeiro, Karina Fanti, Lucas Matos, Renan Barbosa, Samara Caldas
- **6 PJ**: Danilo Uema, Erick Sandes, Felipe Lima, Kleverton Gameleira, Teodoro Martins, Wesley Ochakowski
- **1 Outro**: Ribená Acessibilidade (R$ 500/mês)
- **3 Overheads**: Infraestrutura 3%, Administrativo 3%, Governança 3%

### Bloqueios identificados

1. **Subprojetos vivem em localStorage**, não no banco de dados. Não é possível fazer "ajuste direto no banco" sem antes migrar a estrutura.

2. **O modelo atual de alocação (`SubprojectAllocation`) só suporta `hrPersonId`** — não contempla recursos não-humanos (tipo `outro`) nem itens de overhead.

### Proposta em 3 etapas

**Etapa 1 — Criar tabelas no banco de dados**
- `contract_subprojects` (id, contract_id, name, description, status, created_at, updated_at)
- `subproject_allocations` (id, subproject_id, resource_id, hr_person_id, overhead_item_id, dedication_percent, notes) — com colunas opcionais para suportar HR, recursos não-humanos e overhead

**Etapa 2 — Migrar SubprojectContext para usar o banco**
- Substituir localStorage por queries ao banco de dados
- Manter a mesma interface do contexto para não quebrar os componentes existentes
- Atualizar `SubprojectCostCards` para considerar recursos não-humanos e overhead

**Etapa 3 — Popular os dados do SCIEC**
- Consultar os 3 subprojetos existentes (precisarei dos nomes para criá-los no banco)
- Inserir alocações replicando todos os 15 recursos HR, 1 recurso não-humano e 3 overheads nos 3 subprojetos, mantendo as dedicações atuais

### Informação necessária

Para prosseguir, preciso saber os **nomes dos 3 subprojetos** que você já criou localmente (ex: "PROAC Direto", "PROAC Indireto", "Outros"), pois não consigo acessar o localStorage do seu navegador.

### Impacto
- Dados de subprojetos passam a ser persistidos no banco (acessíveis de qualquer sessão)
- Modelo de custo por subprojeto passa a incluir overhead e recursos não-humanos
- Componentes existentes (SquadsPage, SubprojectCostCards) serão atualizados para a nova fonte de dados

