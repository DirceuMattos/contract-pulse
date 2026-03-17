

## Plano: Renomear coluna "Tempo" e exibir tag "Inativo"

**Arquivo: `src/pages/HRPeoplePage.tsx`**

### Alteração 1 — Renomear header da coluna
Linha 358: trocar `>Tempo <` por `>Tempo de Casa <`.

### Alteração 2 — Exibir tag "Inativo" em vez do tempo calculado
Linhas 391-393: quando `p.situacao === 'inativo'`, renderizar um Badge vermelho com texto "Inativo" em vez do texto de tempo de casa.

```tsx
<TableCell className="py-2">
  {p.situacao === 'inativo' ? (
    <Badge className="bg-red-500 text-white text-xs">Inativo</Badge>
  ) : (
    <span className="text-xs whitespace-nowrap">{tempoCasa}</span>
  )}
</TableCell>
```

2 pontos de alteração, ~5 linhas modificadas.

