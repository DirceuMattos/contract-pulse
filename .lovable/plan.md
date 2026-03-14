

## Plano: Bloco A (Flags Talento/Guardiao no RH) + Bloco B (Overhead Central em Configuracoes)

---

### BLOCO A — Flags Talento e Guardiao

**1. Migracao SQL** — Adicionar 2 colunas booleanas em `hr_people`:

```sql
ALTER TABLE public.hr_people ADD COLUMN is_talento boolean NOT NULL DEFAULT false;
ALTER TABLE public.hr_people ADD COLUMN is_guardiao boolean NOT NULL DEFAULT false;
```

**2. `src/types/index.ts`** — Adicionar campos ao `HRPerson`:

```typescript
isTalento?: boolean;
isGuardiao?: boolean;
```

**3. `src/lib/dbMappers.ts`** — Mapear `is_talento`/`is_guardiao` em `hrPersonFromDb` e `hrPersonToDb`.

**4. `src/pages/HRPeoplePage.tsx`** — Lista de RH:

- Adicionar badges "Talento" (amarelo/dourado) e "Guardiao" (azul) na coluna Nome
- Adicionar 2 filtros toggle: "Somente Talentos" e "Somente Guardioes"
- Integrar nos filtros existentes e no `sessionStorage`

**5. `src/pages/HRPersonDetailPage.tsx`** — Detalhe do RH:

- Na secao Perfil, adicionar 2 switches (Talento e Guardiao)
- Tooltips conforme especificado
- Switches desabilitados para quem nao tem `canEdit`
- Ao alterar, chamar `updatePerson`

**6. Permissoes**: Logica ja existente — `canEdit` controla edicao (C-Level + Intermediario). Demais perfis veem badges mas nao editam.

---

### BLOCO B — Overhead Central em Configuracoes

**1. `src/pages/SettingsPage.tsx`** — Nova secao "Overhead Central (mensal)":

- 5 inputs moeda (R$): Custos Administrativos, Infraestrutura, Governanca/Socios, Custos Indiretos, Consultoria
- Total calculado (read-only)
- Validacao: nao permitir negativos
- Hint: "O total sera rateado automaticamente entre contratos na proxima etapa."
- Botao "Ver detalhamento do rateio" desabilitado
- Toast ao salvar

**2. Persistencia**: Salvar em `localStorage` com chave `overhead-central`. Carregar no mount do componente. Nao altera banco nem contratos.

---

### Arquivos impactados

| Arquivo | Alteracao |
|---|---|
| Migracao SQL | `is_talento`, `is_guardiao` em `hr_people` |
| `src/types/index.ts` | 2 campos no `HRPerson` |
| `src/lib/dbMappers.ts` | Mapear novos campos |
| `src/pages/HRPeoplePage.tsx` | Badges + filtros Talento/Guardiao |
| `src/pages/HRPersonDetailPage.tsx` | Switches Talento/Guardiao com tooltips |
| `src/pages/SettingsPage.tsx` | Secao Overhead Central |

