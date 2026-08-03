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
  opening_card: number;
  closing_cash: number | null;
  closing_card: number | null;
  expected_cash: number | null;
  expected_card: number | null;
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
    mutationFn: async ({ opening_cash, opening_card = 0, notes }: { opening_cash: number; opening_card?: number; notes?: string }) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("cash_registers")
        .insert({
          date: todayLocal(),
          opening_cash,
          opening_card,
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

export function useReopenRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("cash_registers")
        .update({
          closing_cash: null,
          closing_card: null,
          expected_cash: null,
          expected_card: null,
          difference: null,
          closed_by: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["caja-register"] }),
  });
}

export function useCloseRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id, closing_cash, closing_card = 0,
      expected_cash, expected_card = 0,
      total_sales, total_cash_sales, total_card_sales, total_transfer_sales,
      notes,
    }: {
      id: string; closing_cash: number; closing_card?: number;
      expected_cash: number; expected_card?: number;
      total_sales: number; total_cash_sales: number;
      total_card_sales: number; total_transfer_sales: number;
      notes?: string;
    }) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const difference = (closing_cash - expected_cash) + (closing_card - expected_card);
      const { error } = await supabase
        .from("cash_registers")
        .update({
          closing_cash, closing_card, expected_cash, expected_card,
          difference, total_sales, total_cash_sales, total_card_sales,
          total_transfer_sales, closed_by: user?.id ?? null,
          notes: notes ?? null, updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;

      // Auto-register positive difference as store surplus
      if (difference > 0.009) {
        await supabase.from("cash_movements").insert({
          type: "store_surplus" as any,
          amount: difference,
          description: `Sobrante de corte`,
          payment_method: "cash",
          employee_id: user?.id ?? null,
        });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["caja-register"] }),
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
        type: type as "sale" | "brand_payment" | "floor_income" | "salary" | "rent" | "maintenance" | "savings" | "debt_payment" | "construction" | "production_reimbursement" | "event_income" | "deposit" | "withdrawal" | "adjustment",
        amount,
        description,
        payment_method: (payment_method ?? null) as "cash" | "card" | "transfer" | "mixed" | null,
        employee_id: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["caja-movements-today"] });
    },
  });
}

// ─── Historial de cajas ───────────────────────────────────────────────────────

export interface CashRegisterHistoryRow extends CashRegister {
  opened_by_name: string | null;
  closed_by_name: string | null;
}

export function useCajaHistory(month: string) {
  return useQuery({
    queryKey: ["caja-history", month],
    queryFn: async (): Promise<CashRegisterHistoryRow[]> => {
      if (!month) return [];
      const supabase = createClient();
      const [y, m] = month.split("-").map(Number);
      const start = new Date(y, m - 1, 1).toLocaleDateString("en-CA", { timeZone: TZ });
      const end   = new Date(y, m, 0).toLocaleDateString("en-CA", { timeZone: TZ });

      const { data, error } = await supabase
        .from("cash_registers")
        .select(`
          *,
          opened_by_emp:employees!cash_registers_opened_by_fkey(full_name),
          closed_by_emp:employees!cash_registers_closed_by_fkey(full_name)
        `)
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: false });
      if (error) throw error;

      return (data ?? []).map((r: any) => ({
        ...r,
        opened_by_name: r.opened_by_emp?.full_name ?? null,
        closed_by_name: r.closed_by_emp?.full_name ?? null,
      })) as CashRegisterHistoryRow[];
    },
    staleTime: 60_000,
    enabled: !!month,
  });
}

export interface SaleRow {
  id: string;
  folio: string;
  total: number;
  paid_cash: number;
  paid_card: number;
  paid_transfer: number;
  discount_total: number;
  notes: string | null;
  created_at: string;
}

export function useTodaySalesList() {
  return useQuery({
    queryKey: ["caja-sales-list", todayLocal()],
    queryFn: async (): Promise<SaleRow[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("sales")
        .select("id, folio, total, paid_cash, paid_card, paid_transfer, notes, created_at, sale_items(discount)")
        .eq("status", "completed")
        .gte("created_at", `${todayLocal()}T00:00:00-07:00`)
        .lt("created_at", `${todayLocal()}T23:59:59-07:00`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((s: any) => ({
        ...s,
        discount_total: (s.sale_items ?? []).reduce((sum: number, i: any) => sum + Number(i.discount ?? 0), 0),
      })) as SaleRow[];
    },
    staleTime: 30_000,
  });
}

export function useDaySalesList(date: string | null) {
  return useQuery({
    queryKey: ["caja-sales-list", date],
    queryFn: async (): Promise<SaleRow[]> => {
      if (!date) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from("sales")
        .select("id, folio, total, paid_cash, paid_card, paid_transfer, notes, created_at, sale_items(discount)")
        .eq("status", "completed")
        .gte("created_at", `${date}T00:00:00-07:00`)
        .lte("created_at", `${date}T23:59:59-07:00`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((s: any) => ({
        ...s,
        discount_total: (s.sale_items ?? []).reduce((sum: number, i: any) => sum + Number(i.discount ?? 0), 0),
      })) as SaleRow[];
    },
    enabled: !!date,
    staleTime: 60_000,
  });
}

export function useCancelSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (saleId: string) => {
      const supabase = createClient();
      const { error } = await supabase.rpc("cancel_sale", { p_sale_id: saleId });
      if (error) throw error;
    },
    onSuccess: (_data, saleId) => {
      qc.invalidateQueries({ queryKey: ["caja-sales-list"] });
      qc.invalidateQueries({ queryKey: ["caja-sales-today"] });
      qc.invalidateQueries({ queryKey: ["inventario"] });
      qc.invalidateQueries({ queryKey: ["historial-sales"] });
      qc.invalidateQueries({ queryKey: ["sale-items", saleId] });
    },
    onError: (err) => {
      console.error("[useCancelSale]", err);
    },
  });
}

// ─── Sobrante acumulado ───────────────────────────────────────────────────────

export interface SobraanteEntry {
  id: string;
  amount: number;
  description: string;
  created_at: string;
}

export function useSobraanteHistory() {
  return useQuery({
    queryKey: ["sobrante-history"],
    queryFn: async (): Promise<SobraanteEntry[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("cash_movements")
        .select("id, amount, description, created_at")
        .eq("type", "store_surplus" as any)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SobraanteEntry[];
    },
    staleTime: 60_000,
  });
}

export function useSobraanteTotal() {
  return useQuery({
    queryKey: ["sobrante-total"],
    queryFn: async (): Promise<number> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("cash_movements")
        .select("amount")
        .eq("type", "store_surplus" as any);
      if (error) throw error;
      return (data ?? []).reduce((s, r) => s + Number(r.amount), 0);
    },
    staleTime: 60_000,
  });
}

// ─── Breakdown de la caja ─────────────────────────────────────────────────────

export interface CajaBreakdown {
  /** Suma de brand_amount de sale_items no liquidados */
  brands_pending: number;
  /** IVA acumulado desde último cobro */
  iva_pending: number;
  /** Sobrantes de corte acumulados */
  sobrante: number;
  /** Renta acumulada (prorated) */
  rent_pending: number;
}

export function useCajaBreakdown(rentAmount: number | undefined) {
  return useQuery({
    queryKey: ["caja-breakdown", rentAmount],
    queryFn: async (): Promise<CajaBreakdown> => {
      const supabase = createClient();

      // 1. Marcas pendientes de liquidar
      const { data: saleItems } = await supabase
        .from("sale_items")
        .select("id, brand_amount, unit_price, quantity, brand:brands(contract_type), sale:sales(status)")
        .not("brand_id", "is", null);

      const { data: paidItems } = await supabase
        .from("brand_payout_items")
        .select("sale_item_id");
      const paidSet = new Set((paidItems ?? []).map((p: any) => p.sale_item_id));

      const brands_pending = (saleItems ?? []).reduce((sum, item: any) => {
        if (paidSet.has(item.id)) return sum;
        if (item.sale?.status === "cancelled") return sum;
        const isFloor = item.brand?.contract_type === "floor";
        const amount = isFloor
          ? Number(item.unit_price) * Number(item.quantity)
          : Number(item.brand_amount);
        return sum + amount;
      }, 0);

      // 2. IVA acumulado
      const { data: ivaCharges } = await supabase
        .from("store_charges")
        .select("period_end")
        .eq("charge_type", "iva")
        .order("period_end", { ascending: false })
        .limit(1)
        .maybeSingle();

      const ivaSince = ivaCharges?.period_end ?? null;
      let iva_pending = 0;
      if (ivaSince) {
        const { data: ivaData } = await supabase
          .from("sales")
          .select("iva_collected")
          .eq("status", "completed")
          .gt("created_at", ivaSince);
        iva_pending = (ivaData ?? []).reduce((s, r) => s + Number(r.iva_collected ?? 0), 0);
      } else {
        const { data: ivaData } = await supabase
          .from("sales")
          .select("iva_collected")
          .eq("status", "completed");
        iva_pending = (ivaData ?? []).reduce((s, r) => s + Number(r.iva_collected ?? 0), 0);
      }

      // 3. Sobrante acumulado
      const { data: sobraanteData } = await supabase
        .from("cash_movements")
        .select("amount")
        .eq("type", "store_surplus" as any);
      const sobrante = (sobraanteData ?? []).reduce((s, r) => s + Number(r.amount), 0);

      // 4. Renta acumulada (prorated por día)
      const { data: rentCharges } = await supabase
        .from("store_charges")
        .select("period_end")
        .eq("charge_type", "rent")
        .order("period_end", { ascending: false })
        .limit(1)
        .maybeSingle();

      let rent_pending = 0;
      if (rentAmount && rentAmount > 0) {
        const rentSince = rentCharges?.period_end ?? null;
        const sinceDate = rentSince ? new Date(rentSince) : null;
        if (sinceDate) {
          const days = Math.max(0, (Date.now() - sinceDate.getTime()) / (24 * 60 * 60 * 1000));
          rent_pending = Math.min((rentAmount / 30.4368) * days, rentAmount);
        }
      }

      return { brands_pending, iva_pending, sobrante, rent_pending };
    },
    staleTime: 60_000,
  });
}

export function useDayMovements(date: string | null) {
  return useQuery({
    queryKey: ["caja-movements-day", date],
    queryFn: async (): Promise<CashMovement[]> => {
      if (!date) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from("cash_movements")
        .select("*")
        .gte("created_at", `${date}T00:00:00-07:00`)
        .lte("created_at", `${date}T23:59:59-07:00`)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CashMovement[];
    },
    enabled: !!date,
    staleTime: 60_000,
  });
}
