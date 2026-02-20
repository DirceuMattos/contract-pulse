
## Adicionar Responsável do Cliente no Módulo de Contratos

### Contexto

A seção "Responsáveis" no formulário de contratos atualmente tem 3 campos internos: Responsável Interno, P.O./CS e Responsável Comercial. A solicitação é incluir os dados do responsável do lado do cliente (nome, e-mail e telefone), com e-mail e telefone sendo opcionais.

### O que será alterado

São necessárias mudanças em 6 pontos encadeados:

**1. Banco de dados — nova migração SQL**

Adicionar 3 colunas na tabela `contracts`:
- `responsavel_cliente` (text, nullable) — nome do responsável no cliente
- `responsavel_cliente_email` (text, nullable) — e-mail do responsável no cliente
- `responsavel_cliente_telefone` (text, nullable) — telefone do responsável no cliente

**2. Tipo TypeScript — `src/types/index.ts`**

Adicionar os 3 campos opcionais na interface `Contract`:
```
responsavelCliente?: string;
responsavelClienteEmail?: string;
responsavelClienteTelefone?: string;
```

**3. Mapeadores de banco — `src/lib/dbMappers.ts`**

Atualizar `contractFromDb` e `contractToDb` para incluir os 3 novos campos com mapeamento `snake_case` ↔ `camelCase`.

**4. Validação do formulário — `src/lib/validators.ts`**

Adicionar no `contractFormSchema`:
- `responsavelCliente` — string opcional, máximo 100 caracteres
- `responsavelClienteEmail` — string opcional, validação de e-mail quando preenchida (`.optional().or(z.literal(''))`)
- `responsavelClienteTelefone` — string opcional (reutilizar o `phoneSchema` existente)

Atualizar o tipo `ContractFormData`.

**5. Formulário de criação/edição — `src/components/forms/ContractForm.tsx`**

Na seção "Responsáveis", adicionar um separador visual e 3 novos campos após os responsáveis internos:
- Título separador: "Responsável no Cliente"
- Campo: "Nome do Responsável no Cliente" (input texto, opcional)
- Campo: "E-mail" (input email, opcional)
- Campo: "Telefone" (input texto, opcional)

Inicializar os valores nos `defaultValues` do `useForm`.

**6. Página de criação/edição — `src/pages/ContractFormPage.tsx`**

Incluir os 3 novos campos no objeto `contractData` enviado para `addContract`/`updateContract`.

**7. Página de detalhe do contrato — `src/pages/ContractDetailPage.tsx`**

Na aba "Escopo" (ou criando uma seção "Responsáveis" dentro dela, seguindo o padrão existente), exibir as informações do responsável do cliente quando preenchidas, com links clicáveis para e-mail e telefone.

### Detalhes técnicos

**Migração SQL:**
```sql
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS responsavel_cliente text,
  ADD COLUMN IF NOT EXISTS responsavel_cliente_email text,
  ADD COLUMN IF NOT EXISTS responsavel_cliente_telefone text;
```

**Validação do e-mail no schema Zod:**
```typescript
responsavelClienteEmail: z.string().email('E-mail inválido').optional().or(z.literal('')),
```

**Exibição na página de detalhe:**
- O responsável do cliente só será exibido se o campo `responsavelCliente` estiver preenchido
- E-mail aparece como link `mailto:`
- Telefone aparece como link `tel:`

**Formulário:**
- O layout dos responsáveis ficará assim: linha 1 com os 3 responsáveis internos (como hoje), depois um separador com título "Responsável no Cliente", e linha 2 com os 3 novos campos (nome, e-mail, telefone) em grid de 3 colunas no desktop
