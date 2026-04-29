## Adicionar labels visíveis aos filtros (HR)

Em `src/pages/HRPeoplePage.tsx`, dentro do `CardContent` de filtros (linhas 245-312), envolver cada um dos 6 Selects em uma `<div className="flex flex-col gap-1">` com um `<span className="text-xs font-medium text-muted-foreground">…</span>` acima:

| Select | Label |
|---|---|
| `filterSituacao` | Situação |
| `filterTeam` | Departamento |
| `filterVinculo` | Vínculo |
| `filterCargo` | Cargo |
| `filterComite` (mantém o `canViewComite &&` envolvendo o wrapper) | Comitê Gestor |
| `filterMesAdmissao` | Mês de Admissão |

Nenhum estado, valor, callback, lógica de filtro ou layout do grid externo é alterado. Os campos de busca e os checkboxes (Talentos/Guardiões/Em Avaliação) também ficam intocados.