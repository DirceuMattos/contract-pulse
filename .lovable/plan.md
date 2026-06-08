# Normalização do `ride_id` Uber

## Objetivo
Garantir que a mesma corrida exportada da Uber gere sempre o **mesmo** `ride_id`, mesmo se houver pequenas variações de formatação entre exportações (espaços extras, acentuação inconsistente, maiúsculas/minúsculas, vírgula vs ponto no valor).

## Alteração
Arquivo único: `src/components/transport/TransportImportDialog.tsx`, função `buildRowUber`.

Adicionar um helper `normalizeUberKey(v)` aplicado aos 5 componentes do `ride_id` antes de concatenar:

1. `trim()` — remove espaços nas pontas
2. Colapsa espaços internos múltiplos em um só
3. `toLowerCase()`
4. Remove acentos (`normalize('NFD').replace(/[\u0300-\u036f]/g, '')`)

Para o campo **valor**, normalizar também o formato numérico: substituir vírgula por ponto e remover separadores de milhar, para que `"1.234,50"` e `"1234.5"` virem a mesma chave.

Para os campos **data** e **hora**, normalizar para um formato canônico (ex.: `data` vira `YYYY-MM-DD`, `hora` vira `HH:MM:SS`) usando a mesma lógica de `toISO` já existente, evitando que `"01/06/2026"` e `"1/6/2026"` gerem IDs diferentes.

Resultado: `ride_id` final continua sendo a concatenação dos 5 campos com `_`, mas agora estável entre re-exportações.

## Impacto sobre dados já importados
Registros Uber importados **antes** desta mudança ficaram com `ride_id` no formato antigo (não normalizado). Na primeira reimportação após o deploy, eles **podem aparecer como "novos"** em vez de "atualizados", gerando uma duplicação única.

Duas opções para tratar isso:

- **A — Aceitar e limpar manualmente** (mais simples): assumir que a base Uber atual é pequena/recente e, se necessário, apagar os registros antigos antes de reimportar.
- **B — Migração de dados** (mais seguro): rodar um `UPDATE` único na tabela `transport_rides` recalculando o `ride_id` das linhas Uber existentes pelo mesmo algoritmo normalizado. Requer identificar quais linhas vieram da Uber — hoje não há flag de origem, então o critério seria `distance_km IS NULL AND supervisor_name IS NULL` (heurística do modelo Uber).

## Fora do escopo
- Não altera schema do banco.
- Não altera lógica do 99Corp (já usa ID nativo estável).
- Não altera UI nem o fluxo de upsert/contagem de importadas/atualizadas.

## Pergunta
Qual opção de tratamento dos dados Uber já existentes você prefere — **A (deixar como está)** ou **B (migração para recalcular os ride_ids antigos)**?
