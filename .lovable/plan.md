

## Plano: Ordenar Recursos Alocados por Custo (Maior → Menor)

### Mudança

No arquivo `src/pages/ContractResourcesPage.tsx`, na linha 473-479, adicionar `.sort()` entre o `.filter()` e o `.map()` para ordenar pelo custo calculado em ordem decrescente.

```typescript
.filter(r => { ... })
.sort((a, b) => calculateResourceCost(b, settings) - calculateResourceCost(a, settings))
.map((resource) => { ... })
```

### Arquivo alterado

| Arquivo | Mudança |
|---------|---------|
| `src/pages/ContractResourcesPage.tsx` | Adicionar `.sort()` por custo decrescente na cadeia filter→map (linha ~478) |

