

## Diagnóstico

Os logs mostram claramente: **47 assinaturas encontradas, 0 passam no filtro**. O problema está na detecção de status:

O código verifica `s.dt_desativacao_sac` — mas o sufixo `_sac` refere-se ao **sacado (cliente)**, não à assinatura. Esse campo vem preenchido em todos os registros porque pertence ao objeto do cliente, não ao plano. Resultado: todas as 47 assinaturas são marcadas como "cancelada" erroneamente.

## Plano de Correção

### 1. Corrigir detecção de status na edge function

**Arquivo**: `supabase/functions/superlogica-search-subscriptions/index.ts`

- Trocar `dt_desativacao_sac` por `dt_desativacao_plc` (campo correto do plano/assinatura)
- Trocar `dt_congelamento_sac` por `dt_congelamento_plc`
- Adicionar fallback: verificar também `fl_ativo_plc` se disponível

### 2. Agrupar itens por assinatura e somar valores

A API retorna itens individuais (serviços) dentro de uma assinatura. O código deve:

- Agrupar por `id_planocliente_plc` (ID da assinatura)
- Somar os valores (`fl_valor_plc`) de todos os itens do mesmo grupo
- Retornar uma entrada agregada por assinatura com o valor total
- Usar o label do primeiro item ou o nome do plano como identificador

### 3. Remover filtro de amount > 0 individual

O filtro `amount > 0` deve ser aplicado **após a soma** do grupo, não em itens individuais.

### 4. Adicionar log de debug temporário

Logar os campos de status de 1-2 itens raw para confirmar os nomes corretos dos campos antes de filtrar.

### 5. Redeploy e teste

Reimplantar a edge function e testar com o CNPJ `46316600000164`.

### Resultado esperado

Em vez de 47 itens individuais (todos filtrados), o sistema retornará assinaturas agregadas com valor total, permitindo vinculação automática pelo botão "Auto-vincular todos".

