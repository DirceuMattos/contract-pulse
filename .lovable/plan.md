

## Plano: Banco de Dados Único de Recursos Humanos

### Situação Atual
- Tabela `resources` armazena dados de RH duplicados (nome, cargo, custoBase) como snapshot independente
- Tabela `hr_people` está vazia (deveria ser a fonte única)
- Módulos (Squads, Contratos, Dashboard) leem dados de ambos os locais, gerando inconsistência
- Existe um `HRAutoLinkDialog` que tenta vincular dados duplicados — abordagem errada

### Mudanças Planejadas

#### 1. Remover ferramenta de auto-link (desnecessária)
- Excluir `src/components/hr/HRAutoLinkDialog.tsx`
- Remover referência em `src/pages/SettingsPage.tsx`

#### 2. Tornar ResourceForm obrigatoriamente vinculado ao RH para CLT/PJ
- Em `src/components/forms/ResourceForm.tsx`: para tipos CLT e PJ, seleção de pessoa do RH Mestre é **obrigatória** (não opcional)
- Ao selecionar pessoa, preencher automaticamente nome, cargo, tipo e custoBase do `hr_people`
- Campos nome/cargo/custo ficam read-only quando vinculado
- Tipo "outro" (cloud, licenças, etc.) continua sem vínculo ao RH

#### 3. Resolver centralizado já garante propagação
- O `resolveResourceForCalc` e `useResolvedResources` já implementados substituem custoBase/tipo do RH Mestre quando `hrPersonId` está preenchido
- Todos os módulos (Dashboard, Contratos, Squads, ClientDetail) já usam `resolvedResources` — nenhuma mudança adicional necessária nesses módulos

#### 4. Aguardar upload da planilha
- Após as mudanças de código, o usuário fará upload da planilha de RH
- Importação populará `hr_people`
- Com hr_people populado, recursos existentes poderão ser re-vinculados ou re-inseridos manualmente nos contratos

### Arquivos a modificar
- **Excluir**: `src/components/hr/HRAutoLinkDialog.tsx`
- **Modificar**: `src/pages/SettingsPage.tsx` — remover seção de vinculação
- **Modificar**: `src/components/forms/ResourceForm.tsx` — tornar seleção de pessoa HR obrigatória para CLT/PJ

### Resultado
- Um único banco de dados de RH (`hr_people`) como fonte de verdade
- Recursos em contratos apenas referenciam `hr_people` via `hr_person_id`
- Atualizações no RH (importação ou Feedz) propagam automaticamente para todos os módulos

