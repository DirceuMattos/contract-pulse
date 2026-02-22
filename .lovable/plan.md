

## Correção do leitor XLSX e template de importação de RH

### Problema identificado

A função `parseFile` em `src/lib/importExport.ts` possui um leitor XLSX nativo que só funciona com arquivos gerados pelo próprio sistema (sem compressão, com inline strings). Arquivos reais do Excel usam:

1. **Compressão DEFLATE** nos entries do ZIP -- o parser atual assume dados "stored" (sem compressão) e lê lixo
2. **Shared Strings Table** (`xl/sharedStrings.xml`) -- células com `t="s"` referenciam um índice na tabela de strings compartilhadas, mas o parser só lê `t="inlineStr"` e valores inline

Isso explica o erro ao arrastar a planilha real.

Quanto ao template: o template gerado (`generateHRImportTemplate`) já está atualizado com os headers corretos. O problema é que ao tentar reimportá-lo, o próprio parser falha ao ler qualquer XLSX.

### Solução

Reescrever o bloco de leitura XLSX dentro de `parseFile` para:

1. **Descomprimir entries DEFLATE** usando a API nativa `DecompressionStream` (disponível em todos os navegadores modernos)
2. **Ler a Shared Strings Table** do arquivo `xl/sharedStrings.xml`
3. **Resolver referências de shared strings** em células com `t="s"`
4. **Manter compatibilidade** com arquivos gerados pelo sistema (inline strings, stored entries)

### Detalhes técnicos

**Arquivo: `src/lib/importExport.ts` -- função `parseFile` (linhas 246-317)**

Substituir o bloco de leitura XLSX por uma implementação que:

```text
1. Escaneia o ZIP procurando local file headers (PK 0x03 0x04)
2. Lê o campo "compression method" (byte offset 8-9):
   - 0 = stored (sem compressão) -- ler direto
   - 8 = deflate -- descomprimir com DecompressionStream
3. Extrai dois arquivos do ZIP:
   - xl/sharedStrings.xml -- tabela de strings
   - xl/worksheets/sheet1.xml -- dados da planilha
4. Parseia sharedStrings.xml para montar um array de strings
5. Parseia sheet1.xml:
   - Células com t="s" --> buscar valor no array de shared strings pelo índice
   - Células com t="inlineStr" --> ler texto inline (compatibilidade)
   - Células sem atributo t --> valor numérico direto
6. Monta headers e rows normalmente
```

A API `DecompressionStream` é suportada em Chrome 80+, Firefox 113+, Safari 16.4+ e Edge 80+.

### Mudanças por arquivo

| Arquivo | Alteração |
|---|---|
| `src/lib/importExport.ts` | Reescrever o bloco de leitura XLSX em `parseFile` (linhas ~253-294) para suportar compressão DEFLATE e shared strings |

Nenhuma outra alteração necessária -- o template, o parser de linhas (`parseHRImportRow`) e o dialog de importação já estão corretos.
