
## Plano: Reescrever a análise usando visão da IA (PDF como imagem)

### Diagnóstico raiz

O problema **não é o prompt** — é a **extração de texto do PDF**. O parser atual usa regex para ler operadores BT/ET do PDF binário. Isso funciona para ~5% dos PDFs reais. A maioria dos PDFs modernos usa streams comprimidos (FlateDecode), CIDFonts, e encoding complexo que o regex simplesmente não consegue ler. A IA recebe texto corrompido/incompleto e por isso a análise piora a cada iteração (adicionamos mais restrições a um input que já era ruim).

### Solução: Usar Gemini com visão (multimodal)

Em vez de tentar extrair texto do PDF com regex, vou:

1. **Enviar o PDF diretamente como base64 para o Gemini 2.5 Pro** — o modelo é multimodal e consegue ler PDFs nativamente quando enviados como arquivo inline
2. **Simplificar o prompt** — voltar a um prompt direto e eficaz, sem excesso de regras anti-alucinação que estão fazendo a IA ser conservadora demais
3. **Manter o contexto de contratos e tabela salarial** — essas referências são úteis, o problema nunca foi esse
4. **Remover completamente o parser regex de PDF** — ele é a causa raiz de todos os problemas

### O que muda

| Arquivo | Mudança |
|---|---|
| `supabase/functions/simulation-parse-document/index.ts` | Remover `extractTextFromPDF`/`validateTextQuality`; enviar PDF como base64 inline no payload multimodal do Gemini; simplificar prompt para ser direto e completo sem excesso de restrições |

### Detalhes técnicos

O Gemini aceita PDFs inline no formato:
```json
{
  "role": "user",
  "content": [
    { "type": "file", "file": { "filename": "doc.pdf", "file_data": "data:application/pdf;base64,..." } },
    { "type": "text", "text": "Analise este documento..." }
  ]
}
```

Isso elimina 100% dos problemas de extração — a IA lê o documento original, incluindo tabelas, formatação e imagens.

O prompt será simplificado: instruções claras sobre o que extrair, a tabela salarial e contratos como contexto, sem as dezenas de "NUNCA faça X" que estão tornando a IA excessivamente conservadora. Para DOCX, mantemos o parser de XML tags (que funciona razoavelmente) como fallback.
