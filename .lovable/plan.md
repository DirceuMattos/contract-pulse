
## Adicionar campos de Responsável do Cliente no Simulador de Contratos (Etapa 1 — Identificação)

### Contexto

A mesma informação de "Responsável no Cliente" (nome, e-mail e telefone) que foi adicionada ao formulário de Contratos agora deve aparecer na tela de Identificação do Simulador (Step 1). Os dados ficam armazenados na entidade `ContractSimulation` e na tabela `simulations` do banco.

### O que precisa ser feito

São 4 pontos encadeados:

---

**1. Banco de dados — migração SQL**

Adicionar 3 colunas opcionais na tabela `simulations`:
- `responsavel_cliente` (text, nullable)
- `responsavel_cliente_email` (text, nullable)
- `responsavel_cliente_telefone` (text, nullable)

```sql
ALTER TABLE simulations
  ADD COLUMN IF NOT EXISTS responsavel_cliente text,
  ADD COLUMN IF NOT EXISTS responsavel_cliente_email text,
  ADD COLUMN IF NOT EXISTS responsavel_cliente_telefone text;
```

---

**2. Tipo TypeScript — `src/types/index.ts`**

Adicionar 3 campos opcionais na interface `ContractSimulation` (após `consultancyCost`):

```typescript
responsavelCliente?: string;
responsavelClienteEmail?: string;
responsavelClienteTelefone?: string;
```

---

**3. Mapeadores de banco — `src/lib/dbMappers.ts`**

Atualizar `simulationFromDb` para ler os 3 novos campos:
```typescript
responsavelCliente: (row.responsavel_cliente as string | null) ?? undefined,
responsavelClienteEmail: (row.responsavel_cliente_email as string | null) ?? undefined,
responsavelClienteTelefone: (row.responsavel_cliente_telefone as string | null) ?? undefined,
```

Atualizar `simulationToDb` para escrever os 3 novos campos:
```typescript
responsavel_cliente: sim.responsavelCliente ?? null,
responsavel_cliente_email: sim.responsavelClienteEmail ?? null,
responsavel_cliente_telefone: sim.responsavelClienteTelefone ?? null,
```

---

**4. UI — `src/components/calculator/Step1Identification.tsx`**

Adicionar uma seção "Responsável no Cliente" com separador visual, após os campos existentes e antes do campo de custo de consultoria. O layout seguirá o mesmo padrão do formulário de Contratos:

- Separador com título "Responsável no Cliente"
- Grid de 3 colunas (desktop) / 1 coluna (mobile):
  - **Nome** — Input texto, opcional
  - **E-mail** — Input tipo email, opcional, com hint "(opcional)"
  - **Telefone** — Input texto, opcional, com hint "(opcional)"

Os campos se ligam diretamente ao `onChange` do componente, usando as propriedades `responsavelCliente`, `responsavelClienteEmail` e `responsavelClienteTelefone` do objeto `ContractSimulation`.

---

### Detalhes técnicos

- Nenhuma alteração necessária em `CalculatorWizardPage.tsx` — o `onChange` já propaga qualquer campo de `Partial<ContractSimulation>` genericamente.
- Nenhuma alteração em `SimulationContext.tsx` — o `persistSimulation` usa `simulationToDb` que será atualizado.
- Os campos não são obrigatórios nem no tipo nem na validação — e-mail e telefone ficam totalmente opcionais.
- A função `createBlank` não precisa ser alterada, pois os campos são opcionais e terão valor `undefined` por padrão.
