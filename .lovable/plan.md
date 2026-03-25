

## Validação visual de campos obrigatórios

### Problema
Quando o usuário clica em "Salvar" com campos obrigatórios vazios, o formulario simplesmente nao salva — sem feedback visual. Em formularios longos (como Contrato, com 5 seções em accordion), o usuario nao sabe onde esta o erro.

### Solucao

Duas alteracoes centrais que cobrem **todos os 8 formularios** do sistema:

#### 1. Toast de erro global ao falhar validacao
Criar um wrapper `onInvalid` em cada `form.handleSubmit(onSubmit, onInvalid)` que:
- Exibe um toast vermelho: "Existem campos obrigatórios não preenchidos"
- Faz scroll automatico ate o primeiro campo com erro

**Arquivos afetados** (8 formularios):
- `src/components/forms/ContractForm.tsx`
- `src/components/forms/ClientForm.tsx`
- `src/components/forms/ResourceForm.tsx`
- `src/components/forms/OverheadForm.tsx`
- `src/components/hr/HRPersonForm.tsx`
- `src/components/hr/HRTimelineEventForm.tsx`
- `src/components/users/UserFormDialog.tsx`
- `src/pages/SettingsPage.tsx`

Em cada um, alterar:
```tsx
form.handleSubmit(onSubmit)
```
Para:
```tsx
form.handleSubmit(onSubmit, (errors) => {
  toast({
    title: 'Campos obrigatórios',
    description: 'Preencha todos os campos obrigatórios destacados em vermelho.',
    variant: 'destructive',
  });
  // Scroll to first error
  const firstErrorKey = Object.keys(errors)[0];
  const el = document.querySelector(`[name="${firstErrorKey}"]`) 
    || document.getElementById(`${firstErrorKey}-form-item`);
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
})
```

#### 2. Destaque visual nos campos com erro (ContractForm especifico)
O `ContractForm` usa `Accordion` — se o campo com erro esta em uma secao fechada, o usuario nao o ve. Solucao: ao falhar validacao, abrir automaticamente as secoes que contem erros.

No `ContractForm.tsx`, controlar o estado do accordion programaticamente e expandir secoes com erros.

### Resultado esperado
- Toast vermelho claro informando que ha campos pendentes
- Scroll automatico ate o primeiro campo com erro
- Campos com erro destacados em vermelho (ja funciona via `FormMessage` existente)
- No formulario de contrato, secoes com erros se abrem automaticamente

