# Quadro "Vale ter veículo próprio" — versão completa

Alteração restrita a `src/pages/TransportPage.tsx` + 1 edge function nova para a busca por IA. Nenhuma outra lógica existente é modificada.

## 1. Estado e persistência

Substituir o estado atual `vehicleCost: number` por:

```ts
type VehicleCosts = {
  locacao: number;
  combustivel: number;
  manutencao: number;
  seguro: number;
  motoristaClt: number;
  outros: number;
};
type VehicleMeta = { source: 'ai' | 'manual' | 'default'; updatedAt: string | null };
```

- Chave `localStorage`: `transport_vehicle_costs` → `{ costs: VehicleCosts, meta: VehicleMeta }`
- Defaults: 3000 / 800 / 400 / 500 / 4000 / 300; meta inicial `{ source: 'default', updatedAt: null }`
- A chave antiga `transport-vehicle-cost` é ignorada (sem migração).

## 2. UI do card (substitui bloco atual em ~L461-498)

- **Header**: título "Vale ter veículo próprio?" + badge de origem logo abaixo:
  - `ai` → badge azul, "Atualizado por IA em DD/MM/AAAA"
  - `manual` → badge amarelo, "Valores inseridos manualmente em DD/MM/AAAA"
  - `default` → badge cinza, "Valores padrão (nunca atualizados)"
- **Botão "Atualizar referências de mercado"** no canto superior direito do card, com ícone `Sparkles`. Estado de loading exibe "Buscando...".
- **6 inputs numéricos** em grid responsivo (`grid-cols-2 md:grid-cols-3`), cada um com label:
  - Locação/Financiamento, Combustível, Manutenção, Seguro, Motorista CLT, Outros
  - `type="number"`, formatação simples; ao alterar qualquer campo manualmente → `meta = { source: 'manual', updatedAt: hoje }` e persiste.
- **Análise comparativa** (abaixo dos campos):
  - "Custo total estimado veículo + motorista: R$ X.XXX/mês" (soma dos 6 campos)
  - "Média mensal BNP (últimos 3 meses): R$ X.XXX" (reusa `vehicleAnalysis.avg` existente)
  - Badge conclusivo:
    - média > custo → vermelho, "Considere ter veículo próprio (economia potencial de R$ X/mês)"
    - média ≤ custo → verde, "Transporte por app é mais econômico (economia de R$ X/mês vs veículo)"
  - Nota pequena (`text-xs text-muted-foreground`): "* Valores estimados. Motorista CLT inclui salário base + encargos (FGTS, INSS, férias, 13º). Ajuste os campos conforme sua realidade."

O `useMemo` `vehicleAnalysis` é ajustado para usar `totalCost = soma dos 6 campos` em vez de `vehicleCost`.

## 3. Botão IA → edge function

**Importante**: o usuário pediu chamada direta à API Anthropic. Para evitar exigir uma `ANTHROPIC_API_KEY` do usuário e expor segredo no frontend, vou usar a **Lovable AI Gateway** (já disponível, sem custo de setup) através de uma edge function nova `transport-vehicle-market`, com modelo `google/gemini-2.5-pro` (forte em pesquisa estruturada). O prompt é o mesmo descrito pelo usuário, com `response_format: json_object`.

- Edge function `supabase/functions/transport-vehicle-market/index.ts`:
  - CORS padrão; POST sem body.
  - Chama Lovable AI Gateway com o prompt informado e `response_format: { type: 'json_object' }`.
  - Faz parse e retorna `{ locacao, combustivel, manutencao, seguro, motorista_clt, outros }`.
  - Em erro (rate limit, parse, network) retorna `{ error: string }` com status apropriado.
- Frontend:
  - `supabase.functions.invoke('transport-vehicle-market')`.
  - Sucesso → atualiza os 6 campos, `meta = { source: 'ai', updatedAt: hoje }`, persiste, toast verde "Valores atualizados".
  - Falha (qualquer motivo) → toast **amarelo** "Não foi possível buscar valores atualizados. Usando últimos valores salvos.", **não** altera valores nem badge.

Se você preferir Anthropic Claude direto (precisará fornecer `ANTHROPIC_API_KEY`), me avise antes da implementação.

## Fora do escopo
Filtros, cards de resumo, tabela evolutiva, gráficos, rankings, supervisores e o hook `useTransportData` permanecem como estão.
