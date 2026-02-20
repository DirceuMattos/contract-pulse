
## Ajustes no Módulo de Recursos Humanos

### Confirmação: Tela de Login

A tela de login foi verificada com sucesso. **BNPContractCore** e o título **"Squads, Contratos, Resultados Financeiros"** estão exibidos corretamente em desktop.

---

### Problema 1: Arquivo Excel Corrompido na Exportação de RH

**Causa raiz identificada:** A implementação nativa de geração de `.xlsx` em `src/lib/importExport.ts` tem dois bugs críticos:

1. O arquivo `_rels/.rels` e `xl/_rels/workbook.xml.rels` usam o mesmo conteúdo — o relacionamento raiz deve apontar para o workbook, e o relacionamento do workbook deve apontar para a planilha. Os dois estão com o mesmo XML, o que corrompe a estrutura do arquivo ZIP.

2. A função `toCell` usa `String.fromCharCode(65 + colIdx)` para gerar a referência de célula (A, B, C...), o que limita a 26 colunas e não suporta AA, AB, etc. O arquivo de exportação de RH tem 15 colunas, o que não causa problema imediato neste ponto, mas o conteúdo dos relacionamentos precisa ser corrigido.

**Correção:**

Em `src/lib/importExport.ts`, corrigir:

- O arquivo `_rels/.rels` (relacionamento raiz) deve apontar com `Type=...officeDocument/2006/relationships/officeDocument` para o workbook.
- O arquivo `xl/_rels/workbook.xml.rels` deve apontar com `Type=...officeDocument/2006/relationships/worksheet` para a planilha.
- Atualmente ambos os arquivos têm o mesmo conteúdo (`rels` variable), o que é o bug central.

```
// Conteúdo correto para _rels/.rels (aponta para workbook)
const rootRels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="...package/2006/relationships">
  <Relationship Id="rId1" 
    Type=".../officeDocument/2006/relationships/officeDocument" 
    Target="xl/workbook.xml"/>
</Relationships>`;

// Conteúdo correto para xl/_rels/workbook.xml.rels (aponta para sheet)
const wbRels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="...package/2006/relationships">
  <Relationship Id="rId1" 
    Type=".../officeDocument/2006/relationships/worksheet" 
    Target="worksheets/sheet1.xml"/>
</Relationships>`;
```

Isso também corrige o problema de exportação da página de Squads, que atualmente exporta CSV em vez de XLSX.

---

### Problema 2: Limpeza e Reimportação do Banco de RH

Existem atualmente **20 registros** em `hr_people` com datas de admissão incorretas (todas em 2026-02-18 ou 2026-02-19, que são as datas da migração, não as reais).

**Solução proposta: Botão de Importação na página de Pessoas (HRPeoplePage)**

Em vez de um processo manual, será adicionado um fluxo de importação diretamente na tela de RH, acessível apenas para usuários com permissão de edição (`canEdit`). O fluxo será:

**Passo 1 — Download do template:** O usuário baixa um arquivo `.xlsx` com as colunas no formato correto para preenchimento.

**Passo 2 — Upload e pré-visualização:** O usuário faz upload da planilha preenchida. O sistema lê o arquivo, mostra uma tabela de pré-visualização com os dados lidos e uma contagem de registros.

**Passo 3 — Confirmação com opção de limpeza:** Antes de confirmar, o usuário escolhe se quer **substituir todos os dados atuais** (limpar o banco e reimportar) ou **adicionar** os novos registros. Um alerta claro avisa sobre a irreversibilidade da limpeza.

**Passo 4 — Importação:** O sistema resolve cargos e equipes pelo nome (tolerante a maiúsculas/minúsculas), insere os registros e exibe o resultado.

**Colunas do template de importação:**

| Coluna | Obrigatório | Valores aceitos |
|---|---|---|
| Nome | Sim | Texto |
| Vínculo | Sim | CLT / PJ |
| Cargo | Não | Nome do cargo cadastrado |
| Departamento | Não | Nome do departamento cadastrado |
| Local de Atuação | Não | Texto |
| Data de Admissão | Não | YYYY-MM-DD |
| Remuneração Mensal | Não | Número |
| Benefícios | Não | Número |
| Situação | Não | ativo / inativo (padrão: ativo) |
| Observações | Não | Texto |
| Comitê Gestor | Não | Texto |

---

### Arquivos a Modificar

**Técnico:**

1. `src/lib/importExport.ts`
   - Corrigir o bug do `_rels/.rels` vs `xl/_rels/workbook.xml.rels` na função `buildXlsx`
   - Adicionar `hrImportColumns` com a definição das colunas de importação
   - Adicionar função `generateHRTemplate()` que gera o template de importação

2. `src/pages/HRPeoplePage.tsx`
   - Adicionar botão "Importar" ao lado do botão "Exportar" no header
   - Criar um `Dialog` de importação com 3 passos: upload → pré-visualização → confirmação (com opção de limpar tudo)
   - A lógica de deleção e inserção em batch usa o `HRContext` (deletePerson + addPerson em loop) ou chamadas diretas ao Supabase para eficiência

3. `src/pages/SquadsPage.tsx` *(opcional, melhoria)* — restaurar exportação como `.xlsx` aproveitando a correção do `buildXlsx`
