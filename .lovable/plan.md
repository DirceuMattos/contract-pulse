

## Plano: Suportar arquivos XLS/XLSX na importação de endereços

### Alteração

**Arquivo: `src/components/hr/HRAddressImportDialog.tsx`**

1. Importar `parseFile` de `src/lib/importExport.ts` (já suporta `.xlsx` e `.xls` nativamente)
2. Alterar `handleFile` para:
   - Se o arquivo for `.xlsx` ou `.xls`, usar `parseFile()` que retorna `{ headers, data }` — converter para o formato `AddressRow[]` usando o mesmo `COLUMN_MAP`
   - Se for `.csv`/`.txt`, manter o parser CSV atual
3. Atualizar o `accept` do input de arquivo para `.csv,.txt,.xlsx,.xls`
4. Atualizar o texto de instrução no drop zone para mencionar "CSV ou Excel"

Nenhuma outra alteração necessária — o `parseFile` existente já lida com a extração ZIP/XML do formato Office Open XML.

