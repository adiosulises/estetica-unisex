-- Cancel a sale: god-only, restores variant stock, returns error if not authorized
CREATE OR REPLACE FUNCTION public.cancel_sale(p_sale_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_item record;
BEGIN
  -- role check
  SELECT my_role() INTO v_role;
  IF v_role <> 'god' THEN
    RAISE EXCEPTION 'Solo administradores god pueden cancelar ventas';
  END IF;

  -- cancel the sale
  UPDATE sales SET status = 'cancelled' WHERE id = p_sale_id;

  -- restore stock for each item
  FOR v_item IN
    SELECT variant_id, quantity FROM sale_items WHERE sale_id = p_sale_id
  LOOP
    UPDATE product_variants
    SET stock = stock + v_item.quantity
    WHERE id = v_item.variant_id;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_sale(uuid) TO authenticated;
