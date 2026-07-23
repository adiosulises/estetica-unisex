-- Migration: add_vintage
-- Adds: vintage_consignatarios table, consignatario_id on products,
--       BEFORE INSERT trigger on sale_items to override brand_amount for vintage products.

-- ─── 1. Consignatarios ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vintage_consignatarios (
  id         uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text          NOT NULL,
  initial    text          NOT NULL,   -- used in SKU: "M" → VTG-M
  share_pct  numeric(5,2)  NOT NULL DEFAULT 75,
  active     boolean       NOT NULL DEFAULT true,
  created_at timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE public.vintage_consignatarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated can manage vintage_consignatarios"
  ON public.vintage_consignatarios FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── 2. Link products to a consignatario ────────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS consignatario_id uuid
  REFERENCES public.vintage_consignatarios(id) ON DELETE SET NULL;

-- ─── 3. Override brand_amount on sale_items for vintage products ─────────────
-- The existing create_sale RPC computes brand_amount from brands.contract_value.
-- This trigger fires BEFORE INSERT and replaces brand_amount with the
-- consignatario's individual share_pct when the product has one.
CREATE OR REPLACE FUNCTION public.trg_sale_items_vintage_amount()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_share_pct numeric;
BEGIN
  SELECT vc.share_pct INTO v_share_pct
  FROM   public.products p
  JOIN   public.vintage_consignatarios vc ON vc.id = p.consignatario_id
  WHERE  p.id = (
    SELECT product_id FROM public.product_variants WHERE id = NEW.variant_id
  );

  IF v_share_pct IS NOT NULL THEN
    NEW.brand_amount := ROUND(NEW.unit_price * NEW.quantity * v_share_pct / 100.0, 2);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sale_items_vintage_amount ON public.sale_items;
CREATE TRIGGER trg_sale_items_vintage_amount
  BEFORE INSERT ON public.sale_items
  FOR EACH ROW EXECUTE FUNCTION public.trg_sale_items_vintage_amount();
