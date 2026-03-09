

## Vincular Janaína ao RH Mestre

Duas operações de UPDATE direto no banco (sem migração de schema):

1. **Atualizar o recurso** `25faebc6-4074-465b-a90f-83de919fceec` na tabela `resources`:
   - `nome` → `'Janaina Rodrigues Valim'`
   - `hr_person_id` → `'2273fb09-58e2-4dfb-a40a-21fa88a4e0a7'`
   - `custo_base` → `3617.49` (valor do RH Mestre)

O sistema ja trata automaticamente recursos vinculados a pessoas inativas como "vagas" nos indicadores visuais (badge de alerta, contagem de vacantCount no Dashboard).

Nenhuma alteração de código é necessaria.

