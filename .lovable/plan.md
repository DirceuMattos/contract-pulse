
## Adequação completa do banco e importação de RH à planilha real

### Análise dos campos da planilha

A planilha possui 79 colunas no total. Após análise, elas se dividem em três grupos:

**Grupo 1 — Dados cadastrais (ir para `hr_people`)**

| Coluna na planilha | Campo no sistema | Status |
|---|---|---|
| `Nome` | `nome` | Existe |
| `Tipo_Vinculo` | `tipo_vinculo` | Existe |
| `Cargo_Funcao` | `cargo_id` (resolvido por nome) | Existe |
| `Departamento` | `team_id` (resolvido por nome) | Existe |
| `Remuneracao_Mensal` | `remuneracao_mensal` | Existe |
| `Beneficios` | `beneficios` | Existe |
| `Observacoes` | `observacoes` | Existe |
| `Comite_Gestor` | `comite_gestor` | Existe |
| `Local_Atuacao` | `local_atuacao` | Existe |
| `Data_Admissao` | `data_admissao` | Existe |
| `Situacao` | `situacao` | Existe |
| `Data_Desligamento` | `data_desligamento` | Existe |
| `Tipo_Motivo_Desligamento` | `tipo_desligamento` | Existe |
| `Nivel` | `nivel` | **NOVO** |
| `Trilha` | `trilha` | **NOVO** |
| `Projeto` | `projeto` | **NOVO** |
| `Cargo_Antigo` | `cargo_antigo` | **NOVO** |
| `Remuneracao_II` | `remuneracao_ii` | **NOVO** |
| `Observacoes_Desligamento` | `observacoes_desligamento` | **NOVO** |
| `Email` | `email` | **NOVO** |
| `Celular` | `celular` | **NOVO** |
| `ID_Externo` | `id_externo` | **NOVO** |
| `Centro_Custo` | `centro_custo` | **NOVO** |

**Grupo 2 — Histórico de remuneração (ir para `hr_timeline`)**

As colunas `RAW_Data Ocorrência`, `RAW_Valor`, `RAW_Data Ocorrência.1`, `RAW_Valor.1`, ... até `.16` representam até 17 eventos históricos de remuneração por pessoa. Cada par de colunas com data e valor válidos gera um evento na linha do tempo com `ocorrencia = 'reajuste'`.

**Grupo 3 — Ignorados (campos calculados/redundantes)**

`Tempo_de_Casa_Orig`, `Tempo_de_Casa_Calc`, e todos os campos `RAW_*` que não sejam os pares de ocorrência/valor (pois são duplicatas dos campos processados).

---

### Mudanças necessárias

#### 1. Banco de dados — Migração SQL

Adicionar as 9 novas colunas na tabela `hr_people`:

```sql
ALTER TABLE public.hr_people
  ADD COLUMN IF NOT EXISTS nivel text,
  ADD COLUMN IF NOT EXISTS trilha text,
  ADD COLUMN IF NOT EXISTS projeto text,
  ADD COLUMN IF NOT EXISTS cargo_antigo text,
  ADD COLUMN IF NOT EXISTS remuneracao_ii numeric,
  ADD COLUMN IF NOT EXISTS observacoes_desligamento text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS celular text,
  ADD COLUMN IF NOT EXISTS id_externo text,
  ADD COLUMN IF NOT EXISTS centro_custo text;
```

Todas as colunas são nullable para não quebrar registros existentes.

#### 2. TypeScript — `src/types/index.ts`

Adicionar os novos campos à interface `HRPerson`:

```typescript
export interface HRPerson {
  // ... campos existentes ...
  nivel?: string;
  trilha?: string;
  projeto?: string;
  cargoAntigo?: string;
  remuneracaoII?: number;
  observacoesDesligamento?: string;
  email?: string;
  celular?: string;
  idExterno?: string;
  centroCusto?: string;
}
```

#### 3. Mappers — `src/lib/dbMappers.ts`

Atualizar `hrPersonFromDb` e `hrPersonToDb` para incluir os 10 novos campos (snake_case ↔ camelCase).

#### 4. Parser de importação — `src/lib/importExport.ts`

**Reescrever completamente `parseHRImportRow`** para:

- Mapear os headers exatos da planilha (`Tipo_Vinculo`, `Cargo_Funcao`, `Nivel`, `Trilha`, etc.)
- Suportar formatos de data: `YYYY-MM-DD`, `DD/MM/YYYY`, `DD/MM/YYYY HH:MM:SS`, `YYYY-MM-DD HH:MM:SS`
- Mapear `Tipo_Motivo_Desligamento`: "Dispensado" → `dispensado`, "Solicitou dispensa" → `solicitou-dispensa`, outros → `outro`
- Extrair o `Observacoes_Desligamento` para `motivoDesligamento`
- Capturar todos os campos novos

**Expandir `HRImportRow`** para incluir todos os campos:
```typescript
export interface HRImportRow {
  nome: string;
  tipoVinculo: 'clt' | 'pj';
  cargo: string;
  departamento: string;
  localAtuacao: string;
  dataAdmissao: string;
  remuneracaoMensal: number;
  remuneracaoII: number;
  beneficios: number;
  situacao: 'ativo' | 'inativo';
  observacoes: string;
  comiteGestor: string;
  dataDesligamento?: string;
  tipoDesligamento?: HRTipoDesligamento;
  motivoDesligamento?: string;
  observacoesDesligamento?: string;
  nivel?: string;
  trilha?: string;
  projeto?: string;
  cargoAntigo?: string;
  email?: string;
  celular?: string;
  idExterno?: string;
  centroCusto?: string;
  // Pares de timeline: até 17 entradas
  timelineEvents: Array<{ data: string; valor: number }>;
}
```

**Adicionar extração dos pares RAW_Data Ocorrência / RAW_Valor** (0 a 16):

```typescript
const timelineEvents: Array<{ data: string; valor: number }> = [];
for (let i = 0; i <= 16; i++) {
  const suffix = i === 0 ? '' : `.${i}`;
  const dataRaw = get([`RAW_Data Ocorrência${suffix}`]);
  const valorRaw = get([`RAW_Valor${suffix}`]);
  if (dataRaw && valorRaw) {
    const valorNum = parseFloat(valorRaw.replace(',', '.'));
    const dataFmt = parseDate(dataRaw);
    if (dataFmt && !isNaN(valorNum)) {
      timelineEvents.push({ data: dataFmt, valor: valorNum });
    }
    // Se valor não é numérico (ex: "VA +R$500,00"), criar evento descritivo mas sem valor numérico
  }
}
```

Valores de texto como `"VA +R$500,00"` ou `"Função - Analista de Suporte"` serão inseridos como eventos de `ocorrencia: 'observacao'` com a descrição como texto, sem valor numérico.

#### 5. Dialog de importação — `src/components/hr/HRImportDialog.tsx`

**Alterar `handleImport`** para, após inserir cada pessoa, inserir também os eventos de timeline:

```typescript
for (const row of rows) {
  const person = await addPerson({ ...dadosDaPessoa });
  
  // Inserir eventos de timeline
  for (const ev of row.timelineEvents) {
    await addTimelineEvent({
      personId: person.id,
      eventDate: ev.data,
      ocorrencia: 'reajuste',
      descricao: `Remuneração: ${formatCurrency(ev.valor)}`,
      valor: ev.valor,
      remuneracaoApos: ev.valor,
      atualizarRemuneracao: false, // já está definida no cadastro
    });
  }
}
```

**Atualizar a tabela de pré-visualização** para mostrar coluna de `Nível`, `Trilha` e contagem de eventos de timeline.

#### 6. Formulário de edição — `src/components/hr/HRPersonForm.tsx`

Adicionar campos novos ao formulário de criação/edição:
- `Email` e `Celular` — seção "Identificação"
- `Nivel` e `Trilha` — seção "Identificação" (ex: "N2 - Pleno", "Técnica")
- `Projeto` — seção "Identificação"
- `Cargo Antigo` — seção "Identificação"
- `Remuneração II` (VA/Ajuste de custo) — seção "Financeiro"
- `Centro de Custo` — seção "Identificação"
- `ID Externo` — seção "Identificação"
- `Observações de Desligamento` — seção "Desligamento"

#### 7. Tela de detalhe — `src/pages/HRPersonDetailPage.tsx`

Adicionar os novos campos ao card "Dados Pessoais" e "Financeiro":
- `Email`, `Celular`, `Nível`, `Trilha`, `Projeto`, `Cargo Antigo`, `ID Externo`, `Centro de Custo`
- `Remuneração II` no card financeiro

---

### Sequência de execução

1. Migração SQL (adicionar colunas)
2. Atualizar `HRPerson` em `types/index.ts`
3. Atualizar mappers em `dbMappers.ts`
4. Reescrever `parseHRImportRow` e `HRImportRow` em `importExport.ts`
5. Atualizar `HRImportDialog` para importar timeline junto
6. Atualizar `HRPersonForm` com novos campos
7. Atualizar `HRPersonDetailPage` para exibir novos campos

### Impacto

- Zero downtime: todas as colunas novas são nullable
- Dados existentes não são afetados
- Após a implementação, você poderá reimportar a planilha completa com todos os campos e o histórico de remuneração de cada pessoa ficará registrado automaticamente na linha do tempo
