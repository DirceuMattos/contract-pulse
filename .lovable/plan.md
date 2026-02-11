
# Plano: Bloco 5 -- Campo Esfera + Prazo de Renovacao em Meses + Data Prevista

## Resumo
Adicionar tres campos ao contrato: **Esfera** (municipal/estadual/federal, condicional a segmento govtech), **Prazo de renovacao (meses)** e **Data base para renovacao** (opcional). Exibir "Data prevista de renovacao" calculada no detalhe do contrato e gerar alerta de "Renovacao proxima" no Dashboard.

---

## 1. Tipos

### Arquivo: `src/types/index.ts`

Adicionar ao `Contract`:

```typescript
export type GovSphere = 'municipal' | 'estadual' | 'federal';

// Dentro de Contract, apos 'tags':
govSphere?: GovSphere;

// Dentro de Contract, apos 'statusRenovacao':
renewalTermMonths?: number;
renewalBaseDate?: string;
```

---

## 2. Validacao (Zod)

### Arquivo: `src/lib/validators.ts`

Adicionar ao `contractFormSchema`:

```typescript
govSphere: z.enum(['municipal', 'estadual', 'federal']).optional(),
renewalTermMonths: z.number().int().min(1).max(120).optional(),
renewalBaseDate: z.string().optional(),
```

---

## 3. Formulario de Contrato

### Arquivo: `src/components/forms/ContractForm.tsx`

Na secao "Vigencia e Renovacao", adicionar:

1. **Campo Esfera** (condicional): visivel apenas quando `segmento === 'govtech'`
   - Select com opcoes: Municipal, Estadual, Federal
   - Tooltip: "Aplicavel apenas para contratos GovTech/Governo."
   - Opcional (sem bloqueio), mas ao salvar sem esfera com segmento govtech, mostrar aviso suave via toast

2. **Campo Prazo de renovacao (meses)**: input numerico, step 1, range 1-120
   - Label: "Prazo de renovacao (meses)"
   - Hint: "Usado para calcular a data prevista de renovacao. Ex.: 12."

3. **Campo Data base para renovacao**: date picker opcional
   - Tooltip: "Se nao preenchido, usaremos a data final do contrato para calcular a renovacao."

Default values no form: carregar de `contract?.govSphere`, `contract?.renewalTermMonths`, `contract?.renewalBaseDate`

---

## 4. ContractFormPage -- Propagacao

### Arquivo: `src/pages/ContractFormPage.tsx`

Adicionar `govSphere`, `renewalTermMonths`, `renewalBaseDate` ao objeto `contractData` no `handleSubmit`.

---

## 5. Calculo da Data Prevista

### Arquivo: `src/lib/calculations.ts`

Nova funcao:

```typescript
export function calculateRenewalExpectedDate(contract: Contract): string | null {
  if (!contract.renewalTermMonths) return null;
  const base = contract.renewalBaseDate || contract.dataFim;
  const baseDate = new Date(base);
  baseDate.setMonth(baseDate.getMonth() + contract.renewalTermMonths);
  return baseDate.toISOString().split('T')[0]; // yyyy-MM-dd
}
```

---

## 6. Detalhe do Contrato

### Arquivo: `src/pages/ContractDetailPage.tsx`

Na aba "Vigencia" (card de Vigencia e Renovacao, linhas ~600-620):

- Se `contract.segmento === 'govtech'` e `contract.govSphere`: exibir "Esfera: Municipal/Estadual/Federal"
- Apos "Renovacao Automatica" e "Status de Renovacao":
  - "Prazo de renovacao: X meses" (se preenchido)
  - "Data prevista de renovacao: DD/MM/AAAA" (se calculavel, usando `calculateRenewalExpectedDate`)
  - Se nao calculavel: "Preencha o prazo de renovacao para calcular."
  - Tooltip explicando regra (base usada + meses)

---

## 7. Alerta de Renovacao Proxima

### Arquivo: `src/lib/alertGenerator.ts`

Nova regra apos alertas de vigencia:

```
Se renewalExpectedDate existe e esta em ate 60 dias:
  - <= 30 dias: severity 'critico'
  - <= 60 dias: severity 'atencao'
  - alertCategory: 'prazo'
  - type: 'renovacao-proxima' (novo AlertType)
```

### Arquivo: `src/types/index.ts`

Adicionar `'renovacao-proxima'` ao `AlertType`.

---

## 8. Dados Mock

### Arquivo: `src/data/mockData.ts`

- Para contratos govtech (~70%): adicionar `govSphere` (municipal, estadual, federal distribuidos)
- Para 6+ contratos: adicionar `renewalTermMonths` (12 ou 24)
- Para 2-3 contratos: ajustar datas para que `renewalExpectedDate` fique em ate 60 dias (testar alerta)
- Contratos privados: sem `govSphere`

---

## 9. Propagacao de Alertas

### Arquivos: `src/pages/AlertsPage.tsx`, `src/components/notifications/NotificationCenter.tsx`

Adicionar tratamento para o novo tipo `'renovacao-proxima'` nos labels/icones de alerta.

---

## Arquivos Alterados

| Arquivo | Acao |
|---------|------|
| `src/types/index.ts` | GovSphere, novos campos Contract, novo AlertType |
| `src/lib/validators.ts` | Campos govSphere, renewalTermMonths, renewalBaseDate no schema |
| `src/components/forms/ContractForm.tsx` | 3 novos campos na secao Vigencia |
| `src/pages/ContractFormPage.tsx` | Propagar novos campos no handleSubmit |
| `src/lib/calculations.ts` | Funcao calculateRenewalExpectedDate |
| `src/pages/ContractDetailPage.tsx` | Exibir esfera, prazo e data prevista |
| `src/lib/alertGenerator.ts` | Regra renovacao-proxima |
| `src/data/mockData.ts` | Seed com govSphere e renewalTermMonths |
| `src/pages/AlertsPage.tsx` | Label/icone para renovacao-proxima |
| `src/components/notifications/NotificationCenter.tsx` | Label/icone para renovacao-proxima |

## Ordem de Implementacao

1. Tipos (`types/index.ts`)
2. Validacao (`validators.ts`)
3. Calculo (`calculations.ts`)
4. Mock data (`mockData.ts`)
5. Formulario (`ContractForm.tsx` + `ContractFormPage.tsx`)
6. Detalhe (`ContractDetailPage.tsx`)
7. Alertas (`alertGenerator.ts` + `AlertsPage.tsx` + `NotificationCenter.tsx`)
