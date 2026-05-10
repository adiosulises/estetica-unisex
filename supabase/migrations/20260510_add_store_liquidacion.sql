-- Migration: add_store_liquidacion
-- Monthly store settlement: distributes store net income to budget categories.
-- Run in Supabase SQL Editor.

-- ─── 1. Monthly liquidation header ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.store_liquidations (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  period_month     text          NOT NULL UNIQUE,          -- 'YYYY-MM'
  gross_sales      numeric(12,2) NOT NULL DEFAULT 0,
  iva_amount       numeric(12,2) NOT NULL DEFAULT 0,
  card_commission  numeric(12,2) NOT NULL DEFAULT 0,
  brand_total      numeric(12,2) NOT NULL DEFAULT 0,
  store_net        numeric(12,2) NOT NULL DEFAULT 0,       -- sum(store_amount)
  rent_deducted    numeric(12,2) NOT NULL DEFAULT 0,
  distributable    numeric(12,2) NOT NULL DEFAULT 0,       -- store_net - rent
  status           text          NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft', 'closed')),
  notes            text,
  created_at       timestamptz   NOT NULL DEFAULT now()
);

-- ─── 2. Line items (one per category / per employee for salary) ───────────────
CREATE TABLE IF NOT EXISTS public.store_liquidation_items (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  liquidation_id   uuid          NOT NULL
                   REFERENCES public.store_liquidations(id) ON DELETE CASCADE,
  category         text          NOT NULL,   -- 'iva'|'rent'|'salary'|'maintenance'|'savings'|'ads'|'construction'
  employee_id      uuid          REFERENCES public.employees(id),
  employee_name    text,                     -- denormalized for salary sub-lines
  allocated_amount numeric(12,2) NOT NULL,
  payment_method   text          CHECK (payment_method IN ('cash','card','transfer','mixed')),
  status           text          NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','paid')),
  paid_at          timestamptz,
  notes            text,
  sort_order       integer       NOT NULL DEFAULT 0,
  created_at       timestamptz   NOT NULL DEFAULT now()
);

-- ─── 3. Atomic: mark one item as paid ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.mark_liquidation_item_paid(
  p_item_id        uuid,
  p_payment_method text,
  p_notes          text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_item    public.store_liquidation_items%ROWTYPE;
  v_mv_type public.movement_type;
BEGIN
  SELECT * INTO v_item
  FROM public.store_liquidation_items
  WHERE id = p_item_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Item not found: %', p_item_id; END IF;
  IF v_item.status = 'paid' THEN RETURN; END IF;   -- idempotent

  -- Map category → movement_type enum
  v_mv_type := CASE v_item.category
    WHEN 'salary'       THEN 'salary'::public.movement_type
    WHEN 'maintenance'  THEN 'maintenance'::public.movement_type
    WHEN 'savings'      THEN 'savings'::public.movement_type
    WHEN 'construction' THEN 'construction'::public.movement_type
    WHEN 'rent'         THEN 'rent'::public.movement_type
    ELSE                     'withdrawal'::public.movement_type
  END;

  -- Outflow in cash_movements (negative = money leaving the register)
  INSERT INTO public.cash_movements
    (type, amount, description, payment_method, reference_id, reference_type)
  VALUES (
    v_mv_type,
    -v_item.allocated_amount,
    COALESCE(
      p_notes,
      CASE v_item.category
        WHEN 'iva'          THEN 'IVA — liquidación mensual'
        WHEN 'rent'         THEN 'Renta — liquidación mensual'
        WHEN 'salary'       THEN 'Sueldo: ' || COALESCE(v_item.employee_name, 'Pool')
        WHEN 'maintenance'  THEN 'Mantenimiento — liquidación mensual'
        WHEN 'savings'      THEN 'Ahorros — liquidación mensual'
        WHEN 'ads'          THEN 'Publicidad — liquidación mensual'
        WHEN 'construction' THEN 'Construcción — liquidación mensual'
        ELSE 'Liquidación mensual'
      END
    ),
    p_payment_method::public.payment_method,
    v_item.id,
    'store_liquidation_item'
  );

  -- Fund the category balance bucket (adds money to the spending pot)
  IF v_item.category IN ('salary','maintenance','savings','ads','construction') THEN
    UPDATE public.category_balances
    SET balance    = balance + v_item.allocated_amount,
        updated_at = now()
    WHERE category = v_item.category;
  END IF;

  -- Mark paid
  UPDATE public.store_liquidation_items
  SET status         = 'paid',
      payment_method = p_payment_method,
      paid_at        = now(),
      notes          = COALESCE(p_notes, notes)
  WHERE id = p_item_id;
END;
$$;

-- ─── 4. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.store_liquidations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_liquidation_items  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_store_liquidations"
  ON public.store_liquidations FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_store_liquidation_items"
  ON public.store_liquidation_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
