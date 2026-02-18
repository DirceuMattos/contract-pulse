
## Preencher lista de Tipo/Descricao do documento na aba Documentos do contrato

### Problema
O campo "Tipo/Descricao do documento" no upload de documentos esta vazio porque a tabela `attachment_description_configs` no banco de dados nao possui registros.

### Solucao
Inserir os seguintes registros na tabela via migracao SQL:

1. Contrato
2. Minuta de Contrato (Pre-Contrato)
3. TR - Termo de Referencia
4. Minuta do TR
5. Documento de Licitacao
6. Atestados de Competencia
7. Outros (para permitir descricao livre)

### Detalhes tecnicos
- Executar um `INSERT INTO attachment_description_configs` com os 7 registros acima, cada um com `is_active = true` e `sort_order` sequencial.
- Nenhuma alteracao em codigo -- o componente `AttachmentUploadDialog` ja le da tabela via `getActiveDescriptionConfigs()`.

### Arquivos alterados
- Apenas migracao SQL (nenhum arquivo de codigo alterado)
