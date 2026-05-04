"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

const TZ = "America/Hermosillo"; // UTC-7 sin DST

function todayLocal(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ }); // YYYY-MM-DD
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface CashRegister {
  id: string;
  date: string;
  opening_cash: number;
  closing_cash: number | null;
  expected_cash: number | null;
  difference: number | null;
  total_sales: number;
  total_cash_sales: number;
  total_card_sales: number;
  total_transfer_sales: number;
  notes: string | null;
  opened_by: string | null;
  closed_by: string | null;
  created_at: string;
}

export interface CashMovement {
  id: string;
  type: string;
  amount: number;
  description: string;
  payment_method: string | null;
  employee_id: string | null;
  created_at: string;
}

export interface TodaySummary {
  sale_count: number;
  total_sales: number;
  cash_sales: number;
  card_sales: number;
  transfer_sales: number;
}

// ─── Queries ──────────────────────────────────────────────────────────────────
export function useTodayRegister() {
  return useQuery({
    queryKey: ["caja-register", todayLocal()],
    queryFn: async (): Promise<CashRegister | null> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("cash_registers")
        .select("*")
        .eq("date", todayLocal())
        .maybeSingle();
      if (error) throw error;
      return data as CashRegister | null;
    },
    staleTime: 30_000,
  });
}

export function useTodaySales() {
  return useQuery({
    queryKey: ["caja-sales-today", todayLocal()],
    queryFn: async (): Promise<TodaySummary> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("sales")
        .select("total, paid_cash, paid_card, paid_transfer")
        .eq("status", "completed")
        .gte("created_at", `${todayLocal()}T00:00:00-07:00`)
        .lt("created_at", `${todayLocal()}T23:59:59-07:00`);
      if (error) throw error;
      const rows = data ?? [];
      return {
        sale_count: rows.length,
        total_sales: rows.reduce((s, r) => s + Number(r.total), 0),
        cash_sales: rows.reduce((s, r) => s + Number(r.paid_cash), 0),
        card_sales: rows.reduce((s, r) => s + Number(r.paid_card), 0),
        transfer_sales: rows.reduce((s, r) => s + Number(r.paid_transfer), 0),
      };
    },
    staleTime: 30_000,
  });
}

export function useTodayMovements() {
  return useQuery({
    queryKey: ["caja-movements-today", todayLocal()],
    queryFn: async (): Promise<CashMovement[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("cash_movements")
        .select("*")
        .gte("created_at", `${todayLocal()}T00:00:00-07:00`)
        .lt("created_at", `${todayLocal()}T23:59:59-07:00`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CashMovement[];
    },
    staleTime: 15_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────
export function useOpenRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ opening_cash, notes }: { opening_cash: number; notes?: string }) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("cash_registers")
        .insert({
          date: todayLocal(),
          opening_cash,
          notes: notes ?? null,
          opened_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["caja-register"] });
    },
  });
}

export function useCloseRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      closing_cash,
      expected_cash,
      total_sales,
      total_cash_sales,
      total_card_sales,
      total_transfer_sales,
      notes,
    }: {
      id: string;
      closing_cash: number;
      expected_cash: number;
      total_sales: number;
      total_cash_sales: number;
      total_card_sales: number;
      total_transfer_sales: number;
      notes?: string;
    }) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const difference = closing_cash - expected_cash;
      const { error } = await supabase
        .from("cash_registers")
        .update({
          closing_cash,
          expected_cash,
          difference,
          total_sales,
          total_cash_sales,
          total_card_sales,
          total_transfer_sales,
          closed_by: user?.id ?? null,
          notes: notes ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["caja-register"] });
    },
  });
}

export function useAddMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      type,
      amount,
      description,
      payment_method,
    }: {
      type: string;
      amount: number; // positive = in, negative = out
      description: string;
      payment_method?: string;
    }) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("cash_movements").insert({
        type,
        amount,
        description,
        payment_method: payment_method ?? null,
        employee_id: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["caja-movements-today"] });
    },
  });
}
