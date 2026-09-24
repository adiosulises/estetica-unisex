-- Add payment method columns to spending_transactions
ALTER TABLE public.spending_transactions
  ADD COLUMN IF NOT EXISTS paid_cash     numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_card     numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_transfer numeric NOT NULL DEFAULT 0;

-- Replace create_spending_transaction to also write a cash_movement
CREATE OR REPLACE FUNCTION public.create_spending_transaction(
  p_category         text,
  p_amount           numeric,
  p_concept          text,
  p_performed_by     text,
  p_transaction_date date,
  p_notes            text    DEFAULT NULL,
  p_paid_cash        numeric DEFAULT 0,
  p_paid_card        numeric DEFAULT 0,
  p_paid_transfer    numeric DEFAULT 0
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id            uuid;
  v_payment_method text;
  v_register_id   uuid;
BEGIN
  INSERT INTO public.spending_transactions
    (category, amount, concept, performed_by, transaction_date, notes,
     paid_cash, paid_card, paid_transfer)
  VALUES
    (p_category, p_amount, p_concept, p_performed_by, p_transaction_date, p_notes,
     p_paid_cash, p_paid_card, p_paid_transfer)
  RETURNING id INTO v_id;

  UPDATE public.category_balances
  SET balance    = balance - p_amount,
      updated_at = now()
  WHERE category = p_category;

  -- Determine payment_method label for cash_movements
  v_payment_method := CASE
    WHEN p_paid_cash > 0 AND p_paid_card = 0 AND p_paid_transfer = 0 THEN 'cash'
    WHEN p_paid_card > 0 AND p_paid_cash = 0 AND p_paid_transfer = 0 THEN 'card'
    WHEN p_paid_transfer > 0 AND p_paid_cash = 0 AND p_paid_card = 0 THEN 'transfer'
    WHEN p_paid_cash > 0 THEN 'mixed'
    ELSE NULL
  END;

  -- Write cash_movement withdrawals (negative amounts) for each payment method
  -- so the register's expected balances go down automatically
  IF p_paid_cash > 0 THEN
    -- Find today's open register if any
    SELECT id INTO v_register_id
      FROM public.cash_registers
     WHERE date = p_transaction_date AND closed_by IS NULL
     LIMIT 1;

    INSERT INTO public.cash_movements
      (register_id, type, amount, payment_method, description, reference_id)
    VALUES
      (v_register_id, 'withdrawal', -p_paid_cash, 'cash', p_concept, v_id);
  END IF;

  IF p_paid_card > 0 THEN
    SELECT id INTO v_register_id
      FROM public.cash_registers
     WHERE date = p_transaction_date AND closed_by IS NULL
     LIMIT 1;

    INSERT INTO public.cash_movements
      (register_id, type, amount, payment_method, description, reference_id)
    VALUES
      (v_register_id, 'withdrawal', -p_paid_card, 'card', p_concept, v_id);
  END IF;

  IF p_paid_transfer > 0 THEN
    SELECT id INTO v_register_id
      FROM public.cash_registers
     WHERE date = p_transaction_date AND closed_by IS NULL
     LIMIT 1;

    INSERT INTO public.cash_movements
      (register_id, type, amount, payment_method, description, reference_id)
    VALUES
      (v_register_id, 'withdrawal', -p_paid_transfer, 'transfer', p_concept, v_id);
  END IF;

  RETURN v_id;
END;
$$;
