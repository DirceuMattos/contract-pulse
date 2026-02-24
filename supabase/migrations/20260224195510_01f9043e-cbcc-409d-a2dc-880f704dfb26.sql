-- Fix: quantity column must accept fractional values like 0.5, 0.2, etc.
ALTER TABLE public.simulation_hr_items
  ALTER COLUMN quantity TYPE numeric USING quantity::numeric;