-- Adiciona EQUIPMENT e EQUIPMENT_REQUESTS ao enum module_key.
--
-- POR QUE
-- A migration 20260812120100_equipment_modules_and_head.sql cadastrou os dois
-- módulos em role_module_permissions, cuja coluna module_key é text — e por isso
-- passou. Mas user_module_permissions.module_key é do TIPO enum module_key, e
-- os dois valores nunca foram adicionados ao enum.
--
-- Efeito em produção desde 12/08: salvar permissão a nível de usuário falha com
-- "invalid input value for enum module_key: EQUIPMENT". Descoberto no teste de
-- fumaça da migração para Supabase próprio, em 20/08.
--
-- O projeto tem 11 migrations anteriores que seguem exatamente este padrão, uma
-- por módulo novo: HR, AI, AI_LOGS, RECEIVABLES, OVERTIME, TRANSPORT,
-- JOB_REQUESTS, JOB_SKILLS, PROFILES_ADMIN, HR_DASHBOARD, SUPPORT_COSTS.
-- A do módulo de Equipamentos ficou faltando.
--
-- ATENÇÃO: ALTER TYPE ... ADD VALUE é irreversível. O PostgreSQL não tem
-- DROP VALUE. Em arquivo separado de propósito, para ser sua própria transação.

ALTER TYPE public.module_key ADD VALUE IF NOT EXISTS 'EQUIPMENT';
ALTER TYPE public.module_key ADD VALUE IF NOT EXISTS 'EQUIPMENT_REQUESTS';
