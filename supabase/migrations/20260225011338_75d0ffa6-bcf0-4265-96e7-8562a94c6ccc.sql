ALTER TABLE public.resources
  ADD COLUMN hr_person_id uuid REFERENCES public.hr_people(id) ON DELETE SET NULL;