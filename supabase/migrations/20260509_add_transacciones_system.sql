-- Migration: add_transacciones_system
-- Run in Supabase SQL Editor or via CLI
-- Adds: category_balances, category_balance_logs, spending_transactions
-- and two SECURITY DEFINER functions for atomic operations.

-- ─── 1. Category balance buckets ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.category_balances (
  category    text          PRIMARY KEY
              CHECK (category IN ('salary', 'maintenance', 'savings', 'ads', 'construction')),
  balance     numeric(12,2) NOT NULL DEFAULT 0,
  updated_at  timestamptz   NOT NULL DEFAULT now()
);

INSERT INTO public.category_balances (category) VALUES
  ('salary'), ('maintenance'), ('savings'), ('ads'), ('construction')
ON CONFLICT DO NOTHING;

-- ─── 2. Audit log for god-level balance changes ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.category_balance_logs (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  category     text          NOT NULL,
  old_balance  numeric(12,2) NOT NULL,
  new_balance  numeric(12,2) NOT NULL,
  set_by_name  text          NOT NULL,
  notes        text,
  created_at   timestamptz   NOT NULL DEFAULT now()
);

-- ─── 3. Spending transactions (withdrawals from category budgets) ────────────
CREATE TABLE IF NOT EXISTS public.spending_transactions (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  category         text          NOT NULL
                   CHECK (category IN ('salary', 'maintenance', 'savings', 'ads', 'construction')),
  amount           numeric(12,2) NOT NULL CHECK (amount > 0),
  concept          text          NOT NULL,
  performed_by     text          NOT NULL,
  transaction_date date          NOT NULL DEFAULT CURRENT_DATE,
  notes            text,
  created_at       timestamptz   NOT NULL DEFAULT now()
);

-- ─── 4. Atomic: insert transaction + decrease balance ───────────────────────
CREATE OR REPLACE FUNCTION public.create_spending_transaction(
  p_category         text,
  p_amount           numeric,
  p_concept          text,
  p_performed_by     text,
  p_transaction_date date,
  p_notes            text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.spending_transactions
    (category, amount, concept, performed_by, transaction_date, notes)
  VALUES
    (p_category, p_amount, p_concept, p_performed_by, p_transaction_date, p_notes)
  RETURNING id INTO v_id;

  UPDATE public.category_balances
  SET balance    = balance - p_amount,
      updated_at = now()
  WHERE category = p_category;

  RETURN v_id;
END;
$$;

-- ─── 5. Atomic: set balance + audit log ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_category_balance(
  p_category     text,
  p_new_balance  numeric,
  p_set_by_name  text,
  p_notes        text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_old_balance numeric;
BEGIN
  SELECT balance INTO v_old_balance
  FROM public.category_balances
  WHERE category = p_category;

  INSERT INTO public.category_balance_logs
    (category, old_balance, new_balance, set_by_name, notes)
  VALUES
    (p_category, COALESCE(v_old_balance, 0), p_new_balance, p_set_by_name, p_notes);

  UPDATE public.category_balances
  SET balance    = p_new_balance,
      updated_at = now()
  WHERE category = p_category;
END;
$$;

-- ─── 6. RLS (permissive — adjust to your auth model) ────────────────────────
ALTER TABLE public.category_balances       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_balance_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spending_transactions   ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read everything
CREATE POLICY "auth_read_category_balances"
  ON public.category_balances FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "auth_read_category_balance_logs"
  ON public.category_balance_logs FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "auth_read_spending_transactions"
  ON public.spending_transactions FOR SELECT
  TO authenticated USING (true);

-- Allow authenticated users to insert spending transactions
-- (the function is SECURITY DEFINER so it bypasses RLS anyway)
CREATE POLICY "auth_insert_spending_transactions"
  ON public.spending_transactions FOR INSERT
  TO authenticated WITH CHECK (true);
