## Plan: Bloco A (Flags Talento/Guardião no RH) + Bloco B (Overhead Central em Configurações) + Bloco C (Rateio)

**STATUS: ✅ IMPLEMENTADO**

### O que foi feito

#### BLOCO A — Flags Talento e Guardião

1. **Migração SQL** — Adicionadas colunas `is_talento` e `is_guardiao` (boolean, default false) em `hr_people`.
2. **Types** — Campos `isTalento` e `isGuardiao` adicionados ao `HRPerson`.
3. **Mappers** — `hrPersonFromDb` e `hrPersonToDb` mapeiam os novos campos.
4. **Lista RH** — Badges "⭐ Talento" (dourado) e "🛡️ Guardião" (azul) na coluna Nome. Filtros checkbox para ambos. Borda colorida na linha.
5. **Detalhe RH** — Switches Talento/Guardião com tooltips na seção Dados Profissionais. Desabilitados para quem não tem `canEdit`.
6. **Permissões** — `canEdit` controla edição (C-Level + Intermediário). Demais veem badges mas não editam.

#### BLOCO B — Overhead Central

1. **SettingsPage** — Nova seção "Overhead Central (mensal)" com 5 inputs R$ + total read-only.
2. **Persistência** — `localStorage` com chave `overhead-central`.
3. **UX** — Botão "Ver detalhamento do rateio" ativo (navega para /configuracoes/overhead-rateio). Toast ao salvar.

#### BLOCO C — Rateio do Overhead Central

1. **`src/lib/overheadAllocation.ts`** — Função `calculateOverheadAllocation` calcula percentual e overhead alocado por contrato, com ajuste de arredondamento no maior contrato.
2. **`src/pages/OverheadAllocationPage.tsx`** — Nova página `/configuracoes/overhead-rateio`:
   - Cards resumo: Pool total, Receita total, Soma alocada (com check ✓)
   - Tabela principal: Cliente, Contrato, Valor Mensal, Percentual, Overhead Alocado, Status, link abrir
   - Seção "Pendências do rateio": contratos excluídos (receita 0 ou não vigente) com motivo e link editar
   - Filtros: busca textual + select cliente
   - Tooltip de ajuste de arredondamento
3. **Rota** — Adicionada em App.tsx
4. **Não alterado** — Consultoria por contrato (CRUD de recursos) permanece intacta. Cálculo de break-even não alterado (Bloco E futuro).
