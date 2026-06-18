## Objetivo
Exibir o botão "+ Novo Contrato" (no Header global) somente nas telas dos módulos Contratos e Clientes. Em qualquer outra rota ele fica oculto.

## Alteração
**Arquivo:** `src/components/layout/Header.tsx` (linhas 128–136)

- Usar `useLocation()` do `react-router-dom` para obter a rota atual.
- Renderizar o `<Button>` "Novo Contrato" condicionalmente apenas quando o pathname começar com `/contratos` ou `/clientes`.

```tsx
const location = useLocation();
const showNovoContrato =
  location.pathname.startsWith('/contratos') ||
  location.pathname.startsWith('/clientes');

{showNovoContrato && (
  <Button ...>...Novo Contrato...</Button>
)}
```

## Não alterar
- `DashboardPage.tsx`, `ContractsPage.tsx`, `ContractFormPage.tsx` permanecem como estão (o botão no DashboardPage é o card-atalho da própria dashboard — não é o mesmo controle do Header; e o `ContractsPage` é módulo Contratos, então deve manter).
- Nenhuma outra lógica, estilo ou comportamento é tocado.
