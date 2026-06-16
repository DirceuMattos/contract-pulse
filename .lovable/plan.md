## Objetivo
Mover a geração do PPTX da Edge Function para o navegador, usando `pptxgenjs` no frontend. A Edge Function `report-generate-pptx` permanece intocada.

## Alterações

### 1. Instalar dependência
- `bun add pptxgenjs`

### 2. Criar `src/lib/generatePptx.ts`
- Novo módulo exportando `generatePptx(input)` e a interface `GeneratePptxInput`.
- Gera os 9 slides (Capa, Sumário, Objetivo, Painel Executivo, Entregas, Eficiência Operacional, Treinamentos, Oportunidades, Encerramento) com o layout, cores (azul BNP) e helpers (`headerBar`, `statusBadge`, `kpiCard`) fornecidos.
- Usa `logoBnp` importado de `@/assets/logo-bnp.png`.
- Faz download direto via `pres.writeFile({ fileName })`.

### 3. Editar `src/pages/ReportEditPage.tsx`
- Adicionar import: `import { generatePptx } from "@/lib/generatePptx";`
- Substituir a função `handleGeneratePPTX` para:
  - Construir `sectionMap` a partir de `sections` (chave = `sectionKey`).
  - Montar `mesAno` a partir do array `MESES` e `report.month`/`report.year`.
  - Chamar `generatePptx({ mesAno, nomeContrato, nomeCliente, numeroContrato, sections: sectionMap })`.
  - Exibir toasts de sucesso/erro e gerenciar `setGenerating`.
- Nenhuma chamada à Edge Function `report-generate-pptx` permanece nesse handler.

## Itens a verificar antes de implementar
- Confirmar que `@/assets/logo-bnp.png` existe (ou ajustar import).
- Confirmar os campos disponíveis no escopo do `handleGeneratePPTX`: `sections` (com `sectionKey` e `content`), `report.month`, `report.year`, `contract.nome`, `contract.numero`, `client.nomeFantasia`/`razaoSocial`.

## Fora de escopo
- Edge Function `supabase/functions/report-generate-pptx` permanece inalterada.
- Nenhuma outra parte do sistema é modificada.
