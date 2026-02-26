

## Diagnóstico

O problema real está claro agora:

1. **35 recursos existem na tabela `resources`** com dados diretos (nome, cargo, custo_base) — nenhum deles vinculado ao RH Mestre (`hr_person_id` é NULL em todos)
2. **HR Mestre está vazio** (0 registros em `hr_people`)
3. Existem **duplicatas reais** nos recursos: "Felipe Lima" aparece 3 vezes, "Fernanda Baccarini" 2 vezes, etc.

O sistema não mostra erro porque os recursos **nunca foram vinculados** ao RH — eles armazenam dados diretamente (padrão legado). Não há `hr_person_id` definido, logo o resolver não detecta links quebrados.

## O que precisa ser feito

### 1. Importar novo arquivo de RH
Popular `hr_people` com os dados atualizados dos profissionais.

### 2. Criar ferramenta de vinculação automática (auto-link)
Após a importação, um processo que:
- Cruza `resources.nome` com `hr_people.nome` (match por similaridade/nome exato)
- Propõe os vínculos encontrados para confirmação do usuário
- Atualiza `resources.hr_person_id` com o ID correspondente da pessoa no RH Mestre
- Marca recursos não vinculáveis para revisão manual

### 3. Após vinculação: dados fluem do RH Mestre
Com `hr_person_id` preenchido em cada recurso:
- O resolver substitui automaticamente nome, cargo, custo e tipo com dados do RH
- Sincronizações futuras com o Feedz atualizam `hr_people` → reflete em todos os módulos
- Duplicatas de nome serão eliminadas, pois o recurso aponta para uma única pessoa

### Detalhes técnicos

**Nova página/dialog de auto-link** (`ContractResourcesPage` ou um dialog dedicado):
- Consulta todos os recursos sem `hr_person_id`
- Para cada um, busca candidatos em `hr_people` por nome (case-insensitive, trim)
- Exibe tabela com: Recurso | Pessoa RH sugerida | Confiança (exato/parcial)
- Botão "Vincular todos" e opção individual
- Atualiza `resources.hr_person_id` via UPDATE

**Arquivos a criar/modificar:**
- Novo componente: `src/components/hr/HRAutoLinkDialog.tsx`
- Modificar: `src/pages/ContractResourcesPage.tsx` — botão "Vincular ao RH Mestre"
- Ou: disponibilizar na página de RH como ação global pós-importação

**Fluxo esperado:**
1. Usuário importa arquivo RH → `hr_people` populado
2. Sistema detecta recursos sem vínculo → oferece auto-link
3. Após vinculação → todos os módulos refletem dados do RH Mestre
4. Futuras sincs Feedz → atualizam `hr_people` → propagação automática

