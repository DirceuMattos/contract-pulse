ALTER TABLE public.hr_people ADD COLUMN matricula text;
CREATE UNIQUE INDEX hr_people_matricula_unique ON public.hr_people (matricula) WHERE matricula IS NOT NULL;