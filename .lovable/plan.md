## Resumo
Substituir apenas o bloco final de geração e retorno da Edge Function `report-generate-pptx/index.ts`, convertendo o envio de binário (arraybuffer) para JSON contendo base64 + filename. Nenhuma outra lógica será alterada.

## Alteração
Arquivo: `supabase/functions/report-generate-pptx/index.ts`  
Linhas-alvo: 379–388 (comentário `// Gerar arquivo` até o fechamento do `return new Response(pptxBuffer, ...)`)

### Bloco atual (remover)
```typescript
    // Gerar arquivo
    const pptxBuffer = await pres.write({ outputType: "arraybuffer" }) as ArrayBuffer;

    return new Response(pptxBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="relatorio-${nomeContrato.toLowerCase().replace(/\s+/g, '-')}-${mesAno.toLowerCase().replace('/', '-')}.pptx"`,
        "Access-Control-Allow-Origin": "*",
      }
    });
```

### Novo bloco (inserir)
```typescript
    // Gerar arquivo e converter para base64
    const pptxBuffer = await pres.write({ outputType: "uint8array" }) as Uint8Array;
    const base64 = btoa(String.fromCharCode(...pptxBuffer));
    const filename = `relatorio-${nomeContrato.toLowerCase().replace(/\s+/g, '-')}-${mesAno.toLowerCase().replace('/', '-')}.pptx`;

    return new Response(JSON.stringify({ fileBase64: base64, filename }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      }
    });
```

## Notas técnicas
- O `outputType` muda de `"arraybuffer"` para `"uint8array"` para facilitar a conversão base64 com `btoa`.
- O `Content-Type` do `Response` muda de `application/vnd.openxmlformats-officedocument.presentationml.presentation` para `application/json`.
- A resposta passa a ser `{ fileBase64: string, filename: string }` em vez de bytes crus.
- O frontend que chama esta função deve estar preparado para receber JSON e decodificar o base64.