

## Plano: Corrigir descompressão de arquivos XLSX

### Problema

O `DecompressionStream('raw')` não é suportado em todos os navegadores. O formato `'raw'` (deflate puro sem header) não faz parte do padrão `CompressionFormat`. Browsers suportam apenas `'deflate'` (com zlib header), `'gzip'`, e `'deflate-raw'` (este último só em browsers mais recentes).

### Solução

**Arquivo: `src/lib/importExport.ts`** (linhas ~440-457)

Substituir `'raw'` por `'deflate-raw'` com fallback manual: adicionar um header zlib (`0x78, 0x01`) antes dos dados brutos e usar `'deflate'` caso `'deflate-raw'` não esteja disponível.

```typescript
// Tentativa 1: 'deflate-raw' (suportado em Chrome 120+, Firefox, Safari 17.4+)
// Fallback: adicionar zlib header e usar 'deflate'
let ds: DecompressionStream;
try {
  ds = new DecompressionStream('deflate-raw' as CompressionFormat);
  // usar rawData diretamente
} catch {
  ds = new DecompressionStream('deflate');
  // prepend zlib header (78 01) ao rawData
  const withHeader = new Uint8Array(rawData.length + 2);
  withHeader[0] = 0x78;
  withHeader[1] = 0x01;
  withHeader.set(rawData, 2);
  rawData = withHeader;
}
```

Apenas 1 arquivo alterado, ~15 linhas modificadas.

