## Objetivo
Permitir importar planilhas tanto do **99Corp** quanto do **Uber for Business**, com parsing específico para cada modelo, mantendo o upsert atual.

## Mudanças

### 1. `src/pages/TransportPage.tsx`
Substituir o botão único "Importar planilha" por um `DropdownMenu` com:
- **99Corp** → abre o dialog com `modelo="99corp"`
- **Uber for Business** → abre o dialog com `modelo="uber"`

Guardar o modelo selecionado em estado (`modelo`) e passar como prop para `TransportImportDialog`.

### 2. `src/components/transport/TransportImportDialog.tsx`

**Props**: adicionar `modelo: '99corp' | 'uber'`.

**Texto explicativo dinâmico**:
- `99corp`: "Aceita o arquivo CSV exportado diretamente do app 99Corp ou planilha XLSX no mesmo formato. Sheet preferida: MatrizMovimentoTotal."
- `uber`: "Aceita o arquivo CSV exportado do painel Uber for Business. Atenção: o relatório da Uber não inclui distância percorrida nem informações de supervisor."

**Título do dialog**: manter "Importar Planilha de Corridas" (com sufixo opcional " — 99Corp" / " — Uber for Business" para feedback visual).

**Parser Uber** (novo, usado quando `modelo === 'uber'`):
- Sempre CSV com separador `;`
- Descartar as primeiras 5 linhas; a 6ª é o header.
- Reaproveitar o splitter de campos existente (com suporte a aspas), forçando `;`.
- Mapeamento:
  - `ride_id`: `${data}_${hora}_${nome}_${sobrenome}_${valor}` (string determinística; sem hash externo)
  - `collaborator_name`: `Nome + " " + Sobrenome`
  - `collaborator_id_external`: `ID do funcionário`
  - `value`: `Valor da transação: BRL` (vírgula → ponto, `Number`)
  - `distance_km`: `null`
  - `origin_address`: `Endereço de partida`
  - `destination_address`: `Endereço de destino`
  - `origin_city`: `Cidade`
  - `ride_start_at`: `toISO("Data da solicitação (UTC)" + " " + "Hora da solicitação (UTC)")`
  - `ride_end_at`, `category` = `Serviço`, `supervisor_name`, `supervisor_email`, `collaborator_email`: `null` (exceto `category`)
- `month`/`year` derivados de `ride_start_at` como hoje.

**Fluxo `handleFile`**:
- `modelo === '99corp'`: comportamento atual (XLSX nativo ou CSV genérico via `FIELD_ALIASES`).
- `modelo === 'uber'`: ler como texto e usar o parser Uber dedicado. Bloquear `.xlsx` no input (`accept=".csv"`) quando Uber.

**Upsert**: inalterado, `onConflict: 'ride_id'`, lotes de 100, contagem `imported/updated/ignored` igual.

### Não alterar
- Lógica de extração ZIP, parser XLSX, parser CSV genérico do 99Corp, `FIELD_ALIASES`, helpers `toNumber`/`toISO`, fluxo de upsert, callbacks `onImported`, qualquer outro arquivo.
