

## Recuperação de Arquivos do IndexedDB para o Armazenamento em Nuvem

### Diagnóstico

Os arquivos anexados anteriormente foram salvos **apenas no IndexedDB do navegador** (armazenamento local do browser), com chaves no formato `att-UUID`. O banco de dados central registra esses documentos (20 registros encontrados), mas os arquivos binários nunca foram enviados para o armazenamento em nuvem. Por isso, ao tentar visualizar/baixar, o sistema tenta buscar no bucket remoto e não encontra.

**Os arquivos podem ser recuperados SE o usuário ainda tiver acesso ao mesmo navegador/computador onde os uploads foram feitos.** O IndexedDB persiste até ser limpo manualmente.

### Plano

Criar uma funcionalidade de **migração automática** que:

1. **Detecta arquivos legados**: Ao abrir a aba Documentos de um contrato, verifica se existem attachments com `storageKey` no formato antigo (`att-*`) que não estão no bucket remoto.

2. **Tenta recuperar do IndexedDB**: Para cada arquivo legado, tenta buscar o blob no IndexedDB local usando a função `getBlob` já existente em `src/lib/indexedDBStorage.ts`.

3. **Faz upload para o bucket remoto**: Se o blob for encontrado no IndexedDB, faz upload automático para `contract-documents` no formato novo (`{contractId}/{uuid}.{ext}`) e atualiza o registro no banco com o novo `storageKey`.

4. **Feedback visual**: Mostra um banner informativo no topo da aba Documentos quando há arquivos pendentes de migração, com botão para iniciar e barra de progresso.

5. **Fallback gracioso**: Se o arquivo não for encontrado no IndexedDB (outro navegador/computador), marca visualmente como "arquivo não disponível — necessário re-upload" ao invés de mostrar erro genérico.

### Arquivos a modificar

- **`src/components/contracts/ContractDocumentsTab.tsx`**: Adicionar lógica de detecção de arquivos legados, banner de migração com progresso, e indicação visual de arquivos indisponíveis.
- **`src/contexts/DataContext.tsx`**: Expor a função `updateAttachment` (para atualizar o `storageKey` após migração).

### Fluxo do usuário

1. Usuário abre aba Documentos de um contrato com arquivos antigos
2. Sistema detecta N arquivos com `storageKey` no formato `att-*`
3. Exibe banner: "Encontrados X documentos no armazenamento local. Clique para migrar para a nuvem."
4. Ao clicar, migra cada arquivo mostrando progresso
5. Arquivos migrados passam a funcionar normalmente
6. Arquivos não encontrados no IndexedDB ficam marcados para re-upload

### Nota importante

Esta recuperação só funcionará **no mesmo navegador/computador** onde os arquivos foram originalmente enviados. Se o IndexedDB foi limpo ou outro navegador está sendo usado, os arquivos precisarão ser re-anexados manualmente.

