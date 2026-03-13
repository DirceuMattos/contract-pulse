
Objetivo: tornar a sincronização segura e previsível agora, garantindo que ela atualize corretamente admitidos e desligados/desativados, sem voltar a corromper campos (como vínculo), e corrigir a exportação que está levando para tela em branco.

1) Diagnóstico confirmado no código e dados
- O campo de vínculo está sendo sobrescrito indevidamente no UPDATE (`tipo_vinculo: 'clt'` hardcoded).
- A remuneração pode ser zerada indevidamente quando o Feedz não envia valor (`remuneration` vazio/null vira `0`).
- O caso do Daniel (matrícula 1024) virou inconsistência porque hoje a rotina exige data de desligamento para inativar; no run mais recente ficou `NO_TERMINATION_DATE_WITH_INACTIVE_STATUS`.
- A tela branca ao exportar está compatível com fluxo de download frágil (URL blob revogada imediatamente após `click`).

2) Estratégia proposta (segura e objetiva)
Implementar modo operacional “ciclo de vida” como padrão:
- Criar (admitidos): quando está Ativo e não existe no sistema.
- Desligar/Inativar: quando está Desligado/Desativado e existe no sistema.
- Não atualizar campos sensíveis de cadastro em massa até concluir mapeamento confiável (vínculo, remuneração e outros).

Isso atende exatamente sua alternativa operacional (“admitidos + desligados/desativados”) e evita novo retrabalho manual por atualização errada.

3) Como achar e usar os campos correlatos corretos no Feedz
Mapeamento confirmado/seguro:
- `registration` -> `hr_people.matricula` (chave de matching)
- `employeeId` -> `hr_people.id_externo` (referência técnica)
- `status` -> `situacao` (ativo/inativo)
- `admission_at` -> `data_admissao`
- `department_data.name` / `department` -> equipe (via alias)
- `job_description.title` -> cargo (via alias)

Campo não confiável hoje:
- `tipo_vinculo`: não há campo equivalente confiável na listagem de colaboradores da API.
Ação: remover `tipo_vinculo` de UPDATE, `checkFields` e hash de idempotência.

4) Correção do desligamento/desativação (caso Daniel 1024)
No fluxo de inativação:
- Não bloquear mais quando status vier Desligado/Desativado sem data no payload principal.
- Buscar data de desligamento por fontes adicionais da API (ex.: endpoint de turnover / campos alternativos).
- Se ainda sem data: inativar mesmo assim com regra explícita (data fallback controlada + motivo padronizado), em vez de virar inconsistência e ficar ativo.
- Registrar no relatório que a data veio por fallback para auditoria.

5) Ajustes técnicos nos arquivos
- `supabase/functions/feedz-sync/index.ts`
  - Remover sobrescrita de `tipo_vinculo` no UPDATE.
  - Parar de atualizar remuneração quando Feedz não enviar valor numérico válido.
  - Reclassificar regra de desligamento para não depender estritamente de data no payload principal.
  - Introduzir escopo “lifecycle only” (admitir + desligar) como padrão operacional.
- `src/pages/SettingsPage.tsx`
  - Expor seletor de escopo de sincronização (com padrão seguro).
  - Melhorar UX do botão de exportação.
- `src/pages/FeedzReconciliationPage.tsx` e `src/lib/importExport.ts`
  - Blindar download XLSX (evitar tela branca com fluxo de blob robusto e tratamento de erro visível).
  - Manter relatório por cenários com foco em Criados, Desligados e Inconsistências no modo ciclo de vida.

6) Validação de aceite (antes de concluir)
- Matrícula 1001 (Adilson): vínculo não pode mais ser alterado para CLT.
- Matrícula 1024 (Daniel): deve sair de inconsistência e ser inativado corretamente.
- Sincronização repetida sem mudanças não pode gerar alterações falsas.
- Exportação via ícone em “Ações” deve baixar arquivo diretamente (sem navegar para página branca).
- Planilha final deve listar claramente Matrícula Feedz, Nome RH e Ação aplicada por cenário.

7) Resultado esperado após implementação
- Rotina estável, com risco reduzido de corrupção de dados.
- Operação prática imediata para o time: admitidos + desligados/desativados funcionando.
- Base pronta para evoluir depois para atualização completa de campos somente quando o mapeamento Feedz->sistema estiver 100% validado.
