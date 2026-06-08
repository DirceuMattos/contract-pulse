Plano: substituir `TransportImportDialog.tsx` com nova versão completa.

## Estratégia

Reutilizar `parseFile` de `src/lib/importExport.ts` (parser nativo XLSX + Papa Parse para CSV — já consistente com o resto do projeto). Não adicionar SheetJS.

Limitação aceita: o parser nativo lê `xl/worksheets/sheet1.xml` (primeira sheet). Para suporte ao nome "MatrizMovimentoTotal" estendo o dialog com um helper local que, antes de cair em `parseFile`, abre o `.xlsx`, lê `xl/workbook.xml` + `xl/_rels/workbook.xml.rels` e, se existir uma sheet com aquele nome, extrai a sheet correspondente; senão usa a primeira. Implementação reaproveita a função `extractZipEntry` (cópia local da que está em `importExport.ts`).

## Conteúdo do novo arquivo

`src/components/transport/TransportImportDialog.tsx`:

1. **UI**
   - `Dialog` com título "Importar Planilha de Corridas".
   - Área de drag-and-drop estilizada (border-dashed, hover) + botão "Selecionar arquivo" (input file oculto). Aceita `.csv,.xlsx`.
   - Texto explicativo: aceita CSV exportado de 99/Uber ou XLSX no mesmo formato; sheet preferida `MatrizMovimentoTotal`.
   - Preview: nome do arquivo + nº de linhas detectadas (após parse inicial).
   - `Progress` (shadcn) durante a importação, mostrando `processed/total`.
   - Botão "Importar" (disabled se sem arquivo ou processando).

2. **Parsing**
   - CSV: ler texto, descartar linha 0 se começa com `sep=`, dividir por linha respeitando aspas, separador `,` (fallback `;`).
   - XLSX: extrair sheet com nome `MatrizMovimentoTotal` se presente, senão sheet1; converter shared strings e células para array `Record<string,string>`.
   - Resultado normalizado: `{ headers, rows }`.

3. **Mapeamento** (helper `mapRow`) — busca case-insensitive em uma lista de aliases para cada campo:
   - `ride_id`: "Corrida" | "Id da Corrida"
   - `collaborator_name`: "Nome do Colaborador" | "Nome Colaborador"
   - `collaborator_email`: "E-mail do colaborador" | "Email Colaborador"
   - `collaborator_id_external`: "Matrícula" | "Matricula"
   - `value`: "Valor da Corrida" | "Tarifa" (trim, troca `,` por `.`, `Number`)
   - `distance_km`: "Distancia (KM)" | "Odometro (km)" (mesmo tratamento)
   - `origin_address`: "Endereço de Origem" | "Endereço de Origem Real"
   - `destination_address`: "Endereço de Destino" | "Endereço Final Real"
   - `origin_city`: "Cidade de Origem" | "Cidade Origem"
   - `ride_start_at`: "Data de Início da Corrida" | "Data Origem"
   - `ride_end_at`: "Data de Fim da Corrida" | "Data Final"
   - `category`: "Categoria"
   - `supervisor_name`: "Nome do Supervisor" | "Nome Supervisor"
   - `supervisor_email`: "E-mail do Supervisor" | "Email Supervisor"
   - Datas (suporte a `DD/MM/YYYY HH:MM`, `YYYY-MM-DD HH:MM` e ISO) → ISO; `month` = mês da data, `year` = ano.

4. **Upsert**
   - Linhas sem `ride_id` vão para `ignored` (contador).
   - `supabase.from('transport_rides').upsert(batch, { onConflict: 'ride_id' })` em lotes de 100.
   - Para distinguir "importadas vs atualizadas", consultar previamente os `ride_id` existentes do payload (`select ride_id ... in (...)`) e calcular `updated = intersecção` e `imported = payload.length − updated − ignored`.
   - Atualizar `Progress` a cada lote concluído.

5. **Resultado**
   - Toast (sonner) sucesso: `"X importadas, Y atualizadas, Z ignoradas (sem ride_id)"`.
   - `onImported?.()` para refetch; fecha dialog; reset estado.

Nenhum outro arquivo é modificado.