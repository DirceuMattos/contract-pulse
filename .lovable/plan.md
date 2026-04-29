## Preservar quebras de linha em observações (HR)

Em `src/pages/HRPersonDetailPage.tsx`, linha 467, o campo `person.observacoes` é renderizado em modo leitura como:

```tsx
<p className="text-sm">{person.observacoes || '—'}</p>
```

Adicionar a classe `whitespace-pre-wrap` para preservar quebras de linha e parágrafos:

```tsx
<p className="text-sm whitespace-pre-wrap">{person.observacoes || '—'}</p>
```

Nenhuma outra alteração no arquivo ou no projeto. O campo `observacoesDesligamento` (linha 452) é renderizado via componente `Row` e está fora do escopo desta mudança.