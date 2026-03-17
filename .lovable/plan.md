

## Plano: Incluir benefícios e todos os tipos de vínculo no custo do contrato

### Alteração

Arquivo: `src/lib/resourceResolver.ts`

Duas mudanças nas funções `resolveResource` e `resolveResourceForCalc`:

**1. Benefícios somam ao custoBase**

Criar helper `calcHRCustoBase(person)`:
```typescript
function calcHRCustoBase(person: HRPerson): number {
  const beneficiosValor = person.beneficiosLista?.length
    ? person.beneficiosLista.reduce((s, b) => s + (b.valor || 0), 0)
    : (person.beneficios || 0);
  return (person.remuneracaoMensal || 0) + beneficiosValor;
}
```

Todos os benefícios em valor são sempre incluídos (sem filtrar por `somaRemuneracao`), conforme solicitado.

**2. Tipos sócio, cooperado e estagiário entram normalmente**

Mapeamento de `tipoVinculo` para `tipo` do Resource:
- `clt` → `'clt'`
- `pj` → `'pj'`
- `cooperado`, `socio`, `estagio` → `'outro'`

No `calculateResourceCost` (calculations.ts), o tipo `'outro'` já é tratado como custo direto sem multiplicadores de encargos/impostos, que é o comportamento correto.

### Resumo das mudanças

| Função | custoBase | tipo |
|---|---|---|
| `resolveResource` | `remuneracaoMensal + benefícios` | tipoVinculo direto (display) |
| `resolveResourceForCalc` | `remuneracaoMensal + benefícios` | mapeado para `clt/pj/outro` |

Nenhum outro arquivo precisa ser alterado.

