

# Plano: Ajustes de Upload, Comitê Gestor e Listagem RH

## 1. Upload: Aumentar limite para 15MB e permitir arquivos compactados

**Arquivo**: `src/components/contracts/AttachmentUploadDialog.tsx`

- Alterar `MAX_FILE_SIZE` de `10 * 1024 * 1024` para `15 * 1024 * 1024`
- Adicionar extensoes `zip`, `rar`, `7z` ao array `ALLOWED_EXTENSIONS`
- Adicionar MIMEs correspondentes: `application/zip`, `application/x-rar-compressed`, `application/x-7z-compressed`
- Atualizar o texto de ajuda e o atributo `accept` do input para incluir `.zip,.rar,.7z`
- Atualizar a mensagem de erro de tamanho para "15MB"

Este e o unico componente de upload de documentos com validacao de tipo/tamanho.

## 2. Bug do Comitê Gestor salvando mês anterior

**Causa raiz**: Na exibicao (HRPersonDetailPage), o codigo faz `new Date(person.comiteGestor + '-01')` que cria a data em UTC. Se o fuso horario local for negativo (ex: UTC-3 Brasil), `2026-02-01T00:00:00Z` vira `2026-01-31T21:00:00` local, exibindo "janeiro" em vez de "fevereiro".

**Correcao**: Usar `new Date(person.comiteGestor + '-01T12:00:00')` para evitar deslocamento de fuso, ou fazer parse manual do yyyy-MM para exibir o mes/ano correto sem depender de `Date`.

**Arquivos afetados**:
- `src/pages/HRPersonDetailPage.tsx` (exibicao)
- Verificar se ha outros locais que interpretam o valor

## 3. Comitê Gestor na tela de listagem com edicao inline

**Arquivo**: `src/pages/HRPeoplePage.tsx`

Adicionar na tabela de listagem:
- Nova coluna "Comitê" entre "Sit." e as acoes
- Exibir o valor formatado (ex: "fev/2026") ou "—"
- Para usuarios com `canEdit`, ao clicar no campo, exibir um `<input type="month">` inline (ou um pequeno popover) para alterar o valor diretamente na listagem, chamando `updatePerson(id, { comiteGestor: novoValor })`
- Adicionar um botao de limpar (X) para remover a indicacao

## 4. Filtro por Comitê Gestor na listagem

**Arquivo**: `src/pages/HRPeoplePage.tsx`

O estado `filterComite` ja existe mas nao ha UI para ele. Adicionar:
- Um novo `<Select>` no bloco de filtros com opcoes dinamicas extraidas dos valores unicos de `comiteGestor` presentes nos dados
- Opcao "Todos" (sem filtro)
- Opcao "Com indicacao" (qualquer valor preenchido)
- Opcao "Sem indicacao" (vazio)
- Opcoes por mes/ano especifico

Ajustar a grid de filtros de `xl:grid-cols-6` para `xl:grid-cols-7` para acomodar o novo filtro.

## Resumo de arquivos a alterar

1. `src/components/contracts/AttachmentUploadDialog.tsx` — limite 15MB + formatos compactados
2. `src/pages/HRPersonDetailPage.tsx` — fix timezone no parse do comiteGestor
3. `src/pages/HRPeoplePage.tsx` — coluna editavel + filtro comite gestor

