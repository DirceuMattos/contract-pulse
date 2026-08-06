-- P3 (Feedz sync): pessoas com transição estágio→efetivo têm 2 vínculos no Feedz,
-- com matrículas diferentes mas o MESMO email. A constraint de email único
-- (idx_hr_people_email_unique) impedia manter os 2 registros ("duplicate key ...
-- idx_hr_people_email_unique" ao criar o vínculo efetivo).
-- A unicidade real da pessoa/vínculo passa a ser a matrícula
-- (hr_people_matricula_unique já existe). O email vira atributo, não chave.
-- 2026-08-06

DROP INDEX IF EXISTS public.idx_hr_people_email_unique;
