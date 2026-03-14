## Plan: Bloco A (Flags Talento/Guardião no RH) + Bloco B (Overhead Central em Configurações)

**STATUS: ✅ IMPLEMENTADO**

### O que foi feito

#### BLOCO A — Flags Talento e Guardião

1. **Migração SQL** — Adicionadas colunas `is_talento` e `is_guardiao` (boolean, default false) em `hr_people`.
2. **Types** — Campos `isTalento` e `isGuardiao` adicionados ao `HRPerson`.
3. **Mappers** — `hrPersonFromDb` e `hrPersonToDb` mapeiam os novos campos.
4. **Lista RH** — Badges "⭐ Talento" (dourado) e "🛡️ Guardião" (azul) na coluna Nome. Filtros checkbox para ambos.
5. **Detalhe RH** — Switches Talento/Guardião com tooltips na seção Dados Profissionais. Desabilitados para quem não tem `canEdit`.
6. **Permissões** — `canEdit` controla edição (C-Level + Intermediário). Demais veem badges mas não editam.

#### BLOCO B — Overhead Central

1. **SettingsPage** — Nova seção "Overhead Central (mensal)" com 5 inputs R$ + total read-only.
2. **Persistência** — `localStorage` com chave `overhead-central`.
3. **UX** — Botão "Ver detalhamento do rateio" desabilitado (futuro Bloco C). Toast ao salvar.
