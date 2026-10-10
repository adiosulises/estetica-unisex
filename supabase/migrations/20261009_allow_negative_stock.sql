-- Allow stock to go negative (e.g. selling on consignment or backorder)
ALTER TABLE public.product_variants
  DROP CONSTRAINT IF EXISTS product_variants_stock_check;
