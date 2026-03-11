

## Plano: Remover subprojeto "Geral" e melhorar fluxo de ativação de subprojetos

### Problema atual
Quando o usuário ativa subprojetos em um contrato, o sistema oferece criar automaticamente um subprojeto chamado "Geral" e migrar todos os recursos para ele. Isso é desnecessário — o usuário deveria simplesmente criar seus subprojetos reais e distribuir os recursos diretamente entre eles.

### Alterações propostas

**1. `MigrateToSubprojectsDialog.tsx` — Redesenhar o dialog de ativação**
- Remover a criação automática do subprojeto "Geral"
- Alterar o dialog para apenas informar que subprojetos foram ativados e orientar o usuário a criar seus subprojetos e distribuir os recursos
- Manter dois botões: "Entendi, ativar subprojetos" (confirma) e um texto explicativo de que os recursos existentes no contrato continuam disponíveis e podem ser alocados nos subprojetos que o usuário criar

**2. `ContractFormPage.tsx` — Simplificar o fluxo**
- Quando `hasSubprojects` é ativado e existem recursos HR, em vez de abrir o dialog de migração para "Geral", exibir apenas uma confirmação informativa
- Alternativa: remover completamente o dialog de migração e apenas ativar subprojetos diretamente, já que o usuário vai criar os subprojetos manualmente no painel de gestão

**3. `SquadsPage.tsx` — Sem alteração no filtro de subprojetos**
- O card "Geral" só aparece se existir um subprojeto com esse nome; como não será mais criado automaticamente, ele desaparece naturalmente

### Impacto
- Dados existentes: subprojetos "Geral" já criados continuarão existindo (o usuário pode renomeá-los ou excluí-los manualmente)
- Nenhuma alteração de banco de dados necessária
- Fluxo mais limpo: ativar subprojetos → criar subprojetos com nomes reais → alocar recursos

