Substituir o parser de datas em `TransportImportDialog.tsx` para suportar o formato brasileiro `DD-MM-YYYY HH:MM:SS` (99Corp).

Técnico:
1. Substituir a função `toISO` (linha 218) pela `parseBRDate` fornecida, que aceita tanto `DD-MM-YYYY` quanto `DD/MM/YYYY` com ou sem hora.
2. Em `buildRow`, trocar `toISO` por `parseBRDate` nas conversões de `ride_start_at` e `ride_end_at`.
3. Em `buildRowUber`, trocar `toISO` por `parseBRDate` na conversão de `ride_start_at`.
4. Manter `normalizeUberDate` e demais lógicas inalteradas.