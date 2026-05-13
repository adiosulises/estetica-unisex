"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useConfig } from "@/hooks/use-configuracion";
import { useEmpleados } from "@/hooks/use-empleados";

const TZ = "America/Hermosillo";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StoreLiquidacion {
  id: string;
  period_month: string;
  gross_sales: number;
  iva_amount: number;
  card_commission: number;
  brand_total: number;
  store_net: number;
  floor_income: number;
  rent_deducted: number;
  distributable: number;
  status: string;
  notes: string | null;
  created_at: string;
}

// ─── Floor rents ──────────────────────────────────────────────────────────────

export interface BrandFloorRent {
  id: string;
  brand_id: string;
  brand_name: string;
  period_month: string;
  amount: number;
  payment_method: string | null;
  status: "pending" | "paid";
  paid_at: string | null;
  notes: string | null;
}

export function useFloorRentsForMonth(month: string) {
  return useQuery({
    queryKey: ["floor-rents", month],
    queryFn: async (): Promise<BrandFloorRent[]> => {
      if (!month) return [];
      const supabase = createClient();

      // Get all floor-type brands
      const { data: floorBrands, error: bErr } = await supabase
        .from("brands")
        .select("id, name, contract_value")
        .eq("contract_type", "floor")
        .eq("is_active", true)
        .is("deleted_at", null);
      if (bErr) throw bErr;
      if (!floorBrands?.length) return [];

      // Get existing rent records for this month
      const { data: rents, error: rErr } = await supabase
        .from("brand_floor_rents")
        .select("*")
        .eq("period_month", month);
      if (rErr) throw rErr;

      const rentMap = new Map((rents ?? []).map((r) => [r.brand_id, r]));

      // Merge: one row per floor brand, using DB record if exists else default amount
      return floorBrands.map((b) => {
        const existing = rentMap.get(b.id);
        return {
          id: existing?.id ?? "",
          brand_id: b.id,
          brand_name: b.name,
          period_month: month,
          amount: existing ? Number(existing.amount) : Number(b.contract_value ?? 0),
          payment_method: existing?.payment_method ?? null,
          status: (existing?.status ?? "pending") as "pending" | "paid",
          paid_at: existing?.paid_at ?? null,
          notes: existing?.notes ?? null,
        };
      });
    },
    staleTime: 30_000,
    enabled: !!month,
  });
}

export function useUpsertFloorRent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      brand_id, period_month, amount, notes,
    }: {
      brand_id: string; period_month: string; amount: number; notes?: string;
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("brand_floor_rents")
        .upsert({
          brand_id,
          period_month,
          amount,
          notes: notes ?? null,
          status: "pending",
        }, { onConflict: "brand_id,period_month" });
      if (error) throw error;
    },
    onSuccess: (_, { period_month }) => {
      qc.invalidateQueries({ queryKey: ["floor-rents", period_month] });
      qc.invalidateQueries({ queryKey: ["month-sales-summary", period_month] });
    },
  });
}

export function useMarkFloorRentPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      rentId, paymentMethod, notes,
    }: {
      rentId: string; paymentMethod: string; notes?: string;
    }) => {
      const supabase = createClient();
      const { error } = await supabase.rpc("mark_floor_rent_paid", {
        p_rent_id:        rentId,
        p_payment_method: paymentMethod,
        p_notes:          notes ?? undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["floor-rents"] });
      qc.invalidateQueries({ queryKey: ["month-sales-summary"] });
      qc.invalidateQueries({ queryKey: ["caja-movements-today"] });
    },
  });
}

export interface StoreLiquidacionItem {
  id: string;
  liquidation_id: string;
  category: string;
  employee_id: string | null;
  employee_name: string | null;
  allocated_amount: number;
  payment_method: string | null;
  status: "pending" | "paid";
  paid_at: string | null;
  notes: string | null;
  sort_order: number;
}

export interface StoreLiquidacionWithItems extends StoreLiquidacion {
  items: StoreLiquidacionItem[];
}

// ─── Category labels ──────────────────────────────────────────────────────────

export const LIQ_CATEGORY_LABELS: Record<string, string> = {
  iva:          "IVA (SAT)",
  rent:         "Renta",
  salary:       "Sueldo",
  maintenance:  "Mantenimiento",
  savings:      "Ahorros",
  ads:          "Publicidad",
  construction: "Construcción",
};

export const LIQ_CATEGORY_COLORS: Record<string, string> = {
  iva:          "#ef4444",
  rent:         "#f97316",
  salary:       "#6366f1",
  maintenance:  "#f59e0b",
  savings:      "#10b981",
  ads:          "#3b82f6",
  construction: "#f97316",
};

// ─── Query: get liquidation for a month ──────────────────────────────────────

export function useStoreLiquidacion(month: string) {
  return useQuery({
    queryKey: ["store-liquidacion", month],
    queryFn: async (): Promise<StoreLiquidacionWithItems | null> => {
      const supabase = createClient();
      const { data: liq, error } = await supabase
        .from("store_liquidations")
        .select("*")
        .eq("period_month", month)
        .maybeSingle();
      if (error) throw error;
      if (!liq) return null;

      const { data: items, error: itemsErr } = await supabase
        .from("store_liquidation_items")
        .select("*")
        .eq("liquidation_id", liq.id)
        .order("sort_order");
      if (itemsErr) throw itemsErr;

      return { ...(liq as StoreLiquidacion), items: (items ?? []) as StoreLiquidacionItem[] };
    },
    staleTime: 30_000,
  });
}

// ─── Query: month sales summary ───────────────────────────────────────────────

export interface MonthSalesSummary {
  gross_sales: number;
  paid_card: number;
  paid_transfer: number;
  iva_collected: number;  // sum(sales.iva_collected) — pre-calculated per sale
  store_net: number;      // sum(sale_items.store_amount)
  brand_total: number;    // sum(sale_items.brand_amount)
  floor_income: number;   // sum of PAID brand floor rents this month
}

export function useMonthSalesSummary(month: string) {
  return useQuery({
    queryKey: ["month-sales-summary", month],
    queryFn: async (): Promise<MonthSalesSummary> => {
      if (!month) return { gross_sales: 0, paid_card: 0, paid_transfer: 0, iva_collected: 0, store_net: 0, brand_total: 0, floor_income: 0 };
      const supabase = createClient();

      const [y, m] = month.split("-").map(Number);
      const start = new Date(y, m - 1, 1).toLocaleDateString("en-CA", { timeZone: TZ });
      const end   = new Date(y, m, 0).toLocaleDateString("en-CA", { timeZone: TZ });

      // Sales totals (including iva_collected stored per sale)
      const { data: salesData, error: sErr } = await supabase
        .from("sales")
        .select("total, paid_card, paid_transfer, iva_collected")
        .eq("status", "completed")
        .gte("created_at", `${start}T00:00:00-07:00`)
        .lte("created_at", `${end}T23:59:59-07:00`);
      if (sErr) throw sErr;

      const gross_sales    = (salesData ?? []).reduce((s, r) => s + Number(r.total), 0);
      const paid_card      = (salesData ?? []).reduce((s, r) => s + Number(r.paid_card), 0);
      const paid_transfer  = (salesData ?? []).reduce((s, r) => s + Number(r.paid_transfer), 0);
      const iva_collected  = (salesData ?? []).reduce((s, r) => s + Number(r.iva_collected ?? 0), 0);

      // Sale items: store vs brand amounts
      const { data: salesIds, error: idsErr } = await supabase
        .from("sales")
        .select("id")
        .eq("status", "completed")
        .gte("created_at", `${start}T00:00:00-07:00`)
        .lte("created_at", `${end}T23:59:59-07:00`);
      if (idsErr) throw idsErr;

      const ids = (salesIds ?? []).map((s) => s.id);
      let store_net = 0, brand_total = 0;
      if (ids.length > 0) {
        const { data: itemsData, error: iErr } = await supabase
          .from("sale_items")
          .select("store_amount, brand_amount")
          .in("sale_id", ids);
        if (iErr) throw iErr;
        store_net   = (itemsData ?? []).reduce((s, r) => s + Number(r.store_amount ?? 0), 0);
        brand_total = (itemsData ?? []).reduce((s, r) => s + Number(r.brand_amount ?? 0), 0);
      }

      // Paid floor rents for the month (adds to distributable)
      const { data: floorData, error: fErr } = await supabase
        .from("brand_floor_rents")
        .select("amount")
        .eq("period_month", month)
        .eq("status", "paid");
      if (fErr) throw fErr;
      const floor_income = (floorData ?? []).reduce((s, r) => s + Number(r.amount), 0);

      return { gross_sales, paid_card, paid_transfer, iva_collected, store_net, brand_total, floor_income };
    },
    staleTime: 60_000,
    enabled: !!month,
  });
}

// ─── Mutation: generate liquidation ──────────────────────────────────────────

export function useGenerateStoreLiquidacion() {
  const qc = useQueryClient();
  const { data: config } = useConfig();
  const { data: empleados = [] } = useEmpleados();

  return useMutation({
    mutationFn: async ({
      month,
      summary,
    }: {
      month: string;
      summary: MonthSalesSummary;
    }) => {
      if (!config) throw new Error("Configuración no cargada");

      const supabase = createClient();

      const CARD_RATE        = config.card_rate ?? 0.046;

      // IVA: use the pre-accumulated value stored per sale in the DB
      const iva_amount      = summary.iva_collected;
      const card_commission = summary.paid_card * CARD_RATE;
      const store_net       = summary.store_net;
      const brand_total     = summary.brand_total;
      const floor_income    = summary.floor_income;
      const rent_deducted   = config.rent_amount;
      // distributable = store net from sales + floor rent income - local rent
      const distributable   = Math.max(0, store_net + floor_income - rent_deducted);

      // Create header (upsert)
      const { data: liq, error: liqErr } = await supabase
        .from("store_liquidations")
        .upsert({
          period_month: month,
          gross_sales: summary.gross_sales,
          iva_amount,
          card_commission,
          brand_total,
          store_net,
          floor_income,
          rent_deducted,
          distributable,
          status: "draft",
        }, { onConflict: "period_month" })
        .select()
        .single();
      if (liqErr) throw liqErr;

      // Delete existing items (regenerate)
      await supabase
        .from("store_liquidation_items")
        .delete()
        .eq("liquidation_id", liq.id)
        .eq("status", "pending"); // don't delete already-paid items

      // Build items
      const items: {
        liquidation_id: string;
        category: string;
        employee_id: string | null;
        employee_name: string | null;
        allocated_amount: number;
        sort_order: number;
      }[] = [];

      let order = 0;

      // IVA
      items.push({
        liquidation_id: liq.id,
        category: "iva",
        employee_id: null,
        employee_name: null,
        allocated_amount: Math.round(iva_amount * 100) / 100,
        sort_order: order++,
      });

      // Renta
      items.push({
        liquidation_id: liq.id,
        category: "rent",
        employee_id: null,
        employee_name: null,
        allocated_amount: Math.round(rent_deducted * 100) / 100,
        sort_order: order++,
      });

      // Salary pool → per employee
      const salaryPool = distributable * (config.salary_pool_pct ?? 0);
      const activeEmps = empleados.filter((e) => e.is_active && e.salary_pct > 0);
      for (const emp of activeEmps) {
        items.push({
          liquidation_id: liq.id,
          category: "salary",
          employee_id: emp.id,
          employee_name: emp.full_name,
          allocated_amount: Math.round(salaryPool * emp.salary_pct * 100) / 100,
          sort_order: order++,
        });
      }
      // Unassigned salary (if pcts don't add up to 1)
      const assignedPct = activeEmps.reduce((s, e) => s + e.salary_pct, 0);
      if (assignedPct < 0.999 && salaryPool > 0) {
        const remainder = salaryPool * (1 - assignedPct);
        if (remainder > 0.01) {
          items.push({
            liquidation_id: liq.id,
            category: "salary",
            employee_id: null,
            employee_name: "Sin asignar",
            allocated_amount: Math.round(remainder * 100) / 100,
            sort_order: order++,
          });
        }
      }

      // Other categories
      const otherCats = [
        { key: "maintenance",  pct: config.maintenance_pct ?? 0 },
        { key: "savings",      pct: config.savings_pct ?? 0 },
        { key: "ads",          pct: config.ads_pct ?? 0 },
        { key: "construction", pct: config.construction_pct ?? 0 },
      ];
      for (const cat of otherCats) {
        if (cat.pct > 0) {
          items.push({
            liquidation_id: liq.id,
            category: cat.key,
            employee_id: null,
            employee_name: null,
            allocated_amount: Math.round(distributable * cat.pct * 100) / 100,
            sort_order: order++,
          });
        }
      }

      if (items.length > 0) {
        const { error: insertErr } = await supabase
          .from("store_liquidation_items")
          .insert(items);
        if (insertErr) throw insertErr;
      }

      return liq.id;
    },
    onSuccess: (_, { month }) => {
      qc.invalidateQueries({ queryKey: ["store-liquidacion", month] });
    },
  });
}

// ─── Query: IVA accumulated for a month ──────────────────────────────────────

export function useMonthIvaCollected(month: string) {
  return useQuery({
    queryKey: ["month-iva-collected", month],
    queryFn: async (): Promise<number> => {
      if (!month) return 0;
      const supabase = createClient();
      const [y, m] = month.split("-").map(Number);
      const start = new Date(y, m - 1, 1).toLocaleDateString("en-CA", { timeZone: TZ });
      const end   = new Date(y, m, 0).toLocaleDateString("en-CA", { timeZone: TZ });

      const { data, error } = await supabase
        .from("sales")
        .select("iva_collected")
        .eq("status", "completed")
        .gte("created_at", `${start}T00:00:00-07:00`)
        .lte("created_at", `${end}T23:59:59-07:00`);
      if (error) throw error;

      return (data ?? []).reduce((s, r) => s + Number(r.iva_collected ?? 0), 0);
    },
    staleTime: 60_000,
    enabled: !!month,
  });
}

// ─── Mutation: mark item paid ─────────────────────────────────────────────────

export function useMarkItemPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      itemId,
      paymentMethod,
      notes,
    }: {
      itemId: string;
      paymentMethod: string;
      notes?: string;
    }) => {
      const supabase = createClient();
      const { error } = await supabase.rpc("mark_liquidation_item_paid", {
        p_item_id:        itemId,
        p_payment_method: paymentMethod,
        p_notes:          notes ?? undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-liquidacion"] });
      qc.invalidateQueries({ queryKey: ["category-balances"] });
      qc.invalidateQueries({ queryKey: ["caja-movements-today"] });
    },
  });
}
