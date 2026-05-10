-- Add iva_includes_transfer flag to payroll_config
ALTER TABLE public.payroll_config
  ADD COLUMN IF NOT EXISTS iva_includes_transfer boolean NOT NULL DEFAULT false;
