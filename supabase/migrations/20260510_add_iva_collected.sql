-- Add iva_collected column to sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS iva_collected numeric(10,2) NOT NULL DEFAULT 0;

-- Trigger function: set iva_collected on INSERT based on config
CREATE OR REPLACE FUNCTION trg_sales_set_iva()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  cfg_includes_transfer boolean;
  iva_base numeric;
BEGIN
  SELECT iva_includes_transfer INTO cfg_includes_transfer FROM payroll_config LIMIT 1;
  cfg_includes_transfer := COALESCE(cfg_includes_transfer, false);

  iva_base := COALESCE(NEW.paid_card, 0);
  IF cfg_includes_transfer THEN
    iva_base := iva_base + COALESCE(NEW.paid_transfer, 0);
  END IF;

  NEW.iva_collected := ROUND((iva_base * 16.0 / 116.0)::numeric, 2);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sales_set_iva ON sales;
CREATE TRIGGER trg_sales_set_iva
  BEFORE INSERT ON sales
  FOR EACH ROW EXECUTE FUNCTION trg_sales_set_iva();

-- Backfill existing completed sales using current config
UPDATE sales s
SET iva_collected = ROUND((
  COALESCE(s.paid_card, 0) +
  CASE WHEN (SELECT iva_includes_transfer FROM payroll_config LIMIT 1) THEN COALESCE(s.paid_transfer, 0) ELSE 0 END
) * 16.0 / 116.0, 2)
WHERE s.status = 'completed';
