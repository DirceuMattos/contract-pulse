-- I10 Fase 0 — Perfil "Head" de Área
--
-- Isolado numa migration própria de propósito: o PostgreSQL não permite USAR um
-- valor de enum na mesma transação em que ele foi adicionado. As permissões e
-- policies que referenciam 'head' vivem na migration seguinte.

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'head';
