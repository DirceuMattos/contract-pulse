

## Plano: Adicionar campos de endereço ao RH com importação via planilha

### Resumo

Adicionar 8 campos de endereço à tabela `hr_people`, permitir importação via planilha (matching por matrícula), e exibir no card "Dados Complementares" com layout reorganizado para acomodar dados de desligamento sem comprometer a experiência atual.

### 1. Migração de banco de dados

Adicionar colunas à tabela `hr_people`:

```sql
ALTER TABLE public.hr_people
  ADD COLUMN IF NOT EXISTS endereco_cep text,
  ADD COLUMN IF NOT EXISTS endereco_logradouro text,
  ADD COLUMN IF NOT EXISTS endereco_numero text,
  ADD COLUMN IF NOT EXISTS endereco_sem_numero boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS endereco_complemento text,
  ADD COLUMN IF NOT EXISTS endereco_bairro text,
  ADD COLUMN IF NOT EXISTS endereco_municipio text,
  ADD COLUMN IF NOT EXISTS endereco_uf text;
```

### 2. Alterações em código

**`src/types/index.ts`** -- Adicionar 8 campos ao tipo `HRPerson`:
- `enderecoCep`, `enderecoLogradouro`, `enderecoNumero`, `enderecoSemNumero`, `enderecoComplemento`, `enderecoBairro`, `enderecoMunicipio`, `enderecoUf`

**`src/lib/dbMappers.ts`** -- Mapear os 8 campos em `hrPersonFromDb` e `hrPersonToDb`

**`src/pages/HRPersonDetailPage.tsx`** -- Reorganizar o card "Dados Complementares":
- Separar visualmente em sub-seções com blocos estilizados (similar ao bloco de Admissão já existente):
  - **Bloco "Admissão"** (já existe): data admissão, tempo de casa
  - **Bloco "Endereço"** (novo, colapsável): CEP, logradouro, número, complemento, bairro, município, UF -- só exibe se houver ao menos 1 campo preenchido
  - **Bloco "Desligamento"** (novo, destaque vermelho/muted): data, tipo, motivo, observações -- só exibe para inativos com dados de desligamento
- Departamento, local de atuação, trilha, e-mail permanecem no topo do card como estão

**`src/components/hr/HRPersonForm.tsx`** -- Adicionar seção "Endereço" ao formulário de edição com os 8 campos, incluindo campo checkbox "Sem número"

### 3. Importação via planilha

Criar lógica de importação na página existente ou via botão dedicado na listagem de RH:
- Upload de CSV/XLSX com colunas: Matrícula, CEP, Endereço, Número, Sem número, Complemento, Bairro, Município, UF
- Matching por campo `matricula` (chave de ligação)
- Preview dos dados antes de confirmar
- Atualização em batch via `supabase.from('hr_people').update(...)` para cada matrícula encontrada
- Relatório de linhas processadas vs. não encontradas

A importação será implementada como um dialog dedicado (ex: `HRAddressImportDialog.tsx`) acessível a partir da página de listagem de RH.

### Arquivos editados

1. **Migração SQL** -- 8 novas colunas em `hr_people`
2. `src/types/index.ts` -- 8 campos no tipo `HRPerson`
3. `src/lib/dbMappers.ts` -- mapeamento bidirecional
4. `src/pages/HRPersonDetailPage.tsx` -- layout reorganizado com blocos
5. `src/components/hr/HRPersonForm.tsx` -- seção de endereço no formulário
6. `src/components/hr/HRAddressImportDialog.tsx` -- novo componente de importação

