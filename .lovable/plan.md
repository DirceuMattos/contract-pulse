

## Simplificar legendas dos cards — mostrar apenas Resultado

### Alteração

**Arquivo**: `src/pages/DashboardPage.tsx`

Nas 3 legendas financeiras (Saúde ~linha 633, Segmento ~linha 679, Tipo ~linha 725), substituir:

```
{label} — Receita: R$ X | Custo: R$ Y | Resultado: R$ Z
```

Por:

```
{label} — Resultado: R$ Z
```

Mantendo a cor condicional (verde se positivo, vermelho se negativo) e o `canViewValues` guard.

