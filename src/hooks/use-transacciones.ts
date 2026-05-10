"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

// ─── Constants ────────────────────────────────────────────────────────────────

export const CATEGORIES = [
  { key: "salary",       label: "Sueldos",      color: "#6366f1" },
  { key: "maintenance",  label: "Mantenimiento", color: "#f59e0b" },
  { key: "savings",      label: "Ahorros",       color: "#10b981" },
  { key: "ads",          label: "Publicidad",    color: "#3b82f6" },
  { key: "construction", label: "Construcción",  color: "#f97316" },
] as const;

export type CategoryKey = typeof CATEGORIES[number]["key"];

export function getCategoryLabel(key: string): string {
  return CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

export function getCategoryColor(key: string): string {
  return CATEGORIES.find((c) => c.key === key)?.color ?? "#888";
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CategoryBalance {
  category: CategoryKey;
  balance: number;
  updated_at: string;
}

export interface CategoryBalanceLog {
  id: string;
  category: string;
  old_balance: number;
  new_balance: number;
  set_by_name: string;
  notes: string | null;
  created_at: string;
}

export interface SpendingTransaction {
  id: string;
  category: CategoryKey;
  amount: number;
  concept: string;
  performed_by: string;
  transaction_date: string;
  notes: string | null;
  created_at: string;
}

export interface CombinedTransaction {
  id: string;
  type: "spending" | "brand_payout";
  category: string;           // CategoryKey or 'brand_payout'
  amount: number;
  concept: string;
  performed_by: string;
  transaction_date: string;
  brand_name?: string;
  created_at: string;
}

// ─── Category Balances ────────────────────────────────────────────────────────

export function useCategoryBalances() {
  return useQuery({
    queryKey: ["category-balances"],
    queryFn: async (): Promise<CategoryBalance[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("category_balances")
        .select("*")
        .order("category");
      if (error) throw error;
      return (data ?? []) as CategoryBalance[];
    },
    staleTime: 30_000,
  });
}

export function useCategoryBalanceLogs(category: CategoryKey | null) {
  return useQuery({
    queryKey: ["category-balance-logs", category],
    queryFn: async (): Promise<CategoryBalanceLog[]> => {
      if (!category) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from("category_balance_logs")
        .select("*")
        .eq("category", category)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as CategoryBalanceLog[];
    },
    enabled: !!category,
    staleTime: 30_000,
  });
}

// ─── Set Category Balance (god only) ─────────────────────────────────────────

interface SetBalancePayload {
  category: CategoryKey;
  new_balance: number;
  set_by_name: string;
  notes?: string;
}

export function useSetCategoryBalance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ category, new_balance, set_by_name, notes }: SetBalancePayload) => {
      const supabase = createClient();
      const { error } = await supabase.rpc("set_category_balance", {
        p_category:    category,
        p_new_balance: new_balance,
        p_set_by_name: set_by_name,
        p_notes:       notes ?? undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["category-balances"] });
      qc.invalidateQueries({ queryKey: ["category-balance-logs"] });
    },
  });
}

// ─── Spending Transactions ────────────────────────────────────────────────────

export function useSpendingTransactions(filters?: { month?: string }) {
  return useQuery({
    queryKey: ["spending-transactions", filters],
    queryFn: async (): Promise<SpendingTransaction[]> => {
      const supabase = createClient();
      let q = supabase
        .from("spending_transactions")
        .select("*")
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (filters?.month) {
        // month = "YYYY-MM"
        const start = `${filters.month}-01`;
        const [y, m] = filters.month.split("-").map(Number);
        const endDate = new Date(y, m, 0); // last day of month
        const end = `${filters.month}-${String(endDate.getDate()).padStart(2, "0")}`;
        q = q.gte("transaction_date", start).lte("transaction_date", end);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SpendingTransaction[];
    },
    staleTime: 30_000,
  });
}

// ─── Create Spending Transaction ──────────────────────────────────────────────

interface CreateTransactionPayload {
  category: CategoryKey;
  amount: number;
  concept: string;
  performed_by: string;
  transaction_date: string; // YYYY-MM-DD
  notes?: string;
}

export function useCreateSpendingTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: CreateTransactionPayload) => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("create_spending_transaction", {
        p_category:         p.category,
        p_amount:           p.amount,
        p_concept:          p.concept,
        p_performed_by:     p.performed_by,
        p_transaction_date: p.transaction_date,
        p_notes:            p.notes ?? undefined,
      });
      if (error) throw error;
      return data as string; // uuid of new transaction
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["spending-transactions"] });
      qc.invalidateQueries({ queryKey: ["category-balances"] });
    },
  });
}

// ─── Combined Transaction Feed ────────────────────────────────────────────────

export function useCombinedTransactions(filters?: { month?: string; category?: string }) {
  const { data: spending = [], isLoading: sLoading } = useSpendingTransactions(
    filters?.month ? { month: filters.month } : undefined
  );

  const brandPayoutsQuery = useQuery({
    queryKey: ["brand-payouts-all", filters?.month],
    queryFn: async () => {
      const supabase = createClient();
      let q = supabase
        .from("brand_payouts")
        .select("id, brand_amount, brand:brands(name), paid_at, created_at, notes")
        .eq("status", "paid")
        .order("paid_at", { ascending: false });

      if (filters?.month) {
        const start = `${filters.month}-01`;
        const [y, m] = filters.month.split("-").map(Number);
        const endDate = new Date(y, m, 0);
        const end = `${filters.month}-${String(endDate.getDate()).padStart(2, "0")}`;
        q = q.gte("paid_at", start).lte("paid_at", end + "T23:59:59");
      }

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const combined: CombinedTransaction[] = [
    ...spending.map((t): CombinedTransaction => ({
      id: t.id,
      type: "spending",
      category: t.category,
      amount: t.amount,
      concept: t.concept,
      performed_by: t.performed_by,
      transaction_date: t.transaction_date,
      created_at: t.created_at,
    })),
    ...(brandPayoutsQuery.data ?? []).map((p): CombinedTransaction => {
      const brand = p.brand as { name: string } | null;
      return {
        id: p.id,
        type: "brand_payout",
        category: "brand_payout",
        amount: (p.brand_amount as number),
        concept: `Liquidación de marca`,
        performed_by: "Sistema",
        transaction_date: (p.paid_at as string | null)?.slice(0, 10) ?? (p.created_at as string).slice(0, 10),
        brand_name: brand?.name ?? "—",
        created_at: p.created_at as string,
      };
    }),
  ]
    .filter((t) => !filters?.category || t.category === filters.category)
    .sort((a, b) => {
      // Sort by transaction_date desc, then created_at desc
      const dateDiff = b.transaction_date.localeCompare(a.transaction_date);
      if (dateDiff !== 0) return dateDiff;
      return b.created_at.localeCompare(a.created_at);
    });

  return {
    data: combined,
    isLoading: sLoading || brandPayoutsQuery.isLoading,
  };
}
