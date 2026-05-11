-- Brand floor rent monthly payments
CREATE TABLE IF NOT EXISTS brand_floor_rents (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id       uuid        NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  period_month   text        NOT NULL,                          -- 'YYYY-MM'
  amount         numeric(10,2) NOT NULL,
  payment_method text        CHECK (payment_method IN ('cash','card','transfer','mixed')),
  status         text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  paid_at        timestamptz,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_id, period_month)
);

ALTER TABLE brand_floor_rents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated can manage floor rents"
  ON brand_floor_rents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add floor_income column to store_liquidations header
ALTER TABLE store_liquidations
  ADD COLUMN IF NOT EXISTS floor_income numeric(10,2) NOT NULL DEFAULT 0;

-- RPC: mark floor rent as paid → creates cash_movement income
CREATE OR REPLACE FUNCTION mark_floor_rent_paid(
  p_rent_id       uuid,
  p_payment_method text,
  p_notes         text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_brand_name  text;
  v_amount      numeric;
  v_employee_id uuid;
BEGIN
  v_employee_id := auth.uid();

  SELECT b.name, bfr.amount
  INTO   v_brand_name, v_amount
  FROM   brand_floor_rents bfr
  JOIN   brands b ON b.id = bfr.brand_id
  WHERE  bfr.id = p_rent_id AND bfr.status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Renta no encontrada o ya está pagada';
  END IF;

  UPDATE brand_floor_rents
  SET    status = 'paid',
         paid_at = now(),
         payment_method = p_payment_method,
         notes = COALESCE(p_notes, notes)
  WHERE  id = p_rent_id;

  INSERT INTO cash_movements (type, amount, description, payment_method, employee_id)
  VALUES (
    'floor_income',
    v_amount,
    'Renta de piso — ' || v_brand_name,
    p_payment_method::payment_method,
    v_employee_id
  );
END;
$$;
