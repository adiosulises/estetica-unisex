"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MonthlySummary {
  totalRevenue: number;       // suma de totals de ventas completadas
  totalTransactions: number;  // número de ventas
  totalItems: number;         // unidades vendidas
  avgTicket: number;          // totalRevenue / totalTransactions
  totalIva: number;           // IVA acumulado del mes
  byPayment: {
    cash: number;
    card: number;
    transfer: number;
  };
}

export interface DailySales {
  date: string;       // YYYY-MM-DD
  revenue: number;
  transactions: number;
  items: number;
}

export interface BrandBreakdown {
  brandId: string | null;
  brandName: string;
  revenue: number;       // suma de unit_price * quantity de ítems de esa marca
  items: number;
  brandAmount: number;   // lo que va para la marca
  storeAmount: number;   // comisión de la tienda
}

export interface TopProduct {
  productId: string;
  productName: string;
  sku: string;
  brandName: string | null;
  totalQty: number;
  totalRevenue: number;
}

export interface EmployeeBreakdown {
  employeeId: string;
  employeeName: string;
  transactions: number;
  revenue: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns [start, end] ISO strings for a month like "2026-05" in Hermosillo time */
function monthRange(month: string): [string, string] {
  // month = "YYYY-MM"
  const [y, m] = month.split("-").map(Number);
  // Hermosillo = UTC-7 (no DST)
  const startLocal = new Date(y, m - 1, 1, 0, 0, 0);
  const endLocal = new Date(y, m, 1, 0, 0, 0);
  // Shift to UTC+7
  const offset = 7 * 60 * 60 * 1000;
  const start = new Date(startLocal.getTime() + offset).toISOString();
  const end = new Date(endLocal.getTime() + offset).toISOString();
  return [start, end];
}

// ─── Monthly Summary ─────────────────────────────────────────────────────────

export function useMonthSummary(month: string) {
  return useQuery({
    queryKey: ["reportes-summary", month],
    queryFn: async (): Promise<MonthlySummary> => {
      const supabase = createClient();
      const [start, end] = monthRange(month);

      const { data, error } = await supabase
        .from("sales")
        .select(
          "total, iva_collected, paid_cash, paid_card, paid_transfer"
        )
        .eq("status", "completed")
        .gte("created_at", start)
        .lt("created_at", end);

      if (error) throw error;

      // Item counts
      const rows = data ?? [];
      const totalRevenue = rows.reduce((s, r) => s + (r.total ?? 0), 0);
      const totalTransactions = rows.length;
      const totalIva = rows.reduce((s, r) => s + (r.iva_collected ?? 0), 0);
      const cash = rows.reduce((s, r) => s + (r.paid_cash ?? 0), 0);
      const card = rows.reduce((s, r) => s + (r.paid_card ?? 0), 0);
      const transfer = rows.reduce((s, r) => s + (r.paid_transfer ?? 0), 0);

      // Fetch total item units via sale_items — need sale IDs first
      const { data: salesWithIds } = await supabase
        .from("sales")
        .select("id")
        .eq("status", "completed")
        .gte("created_at", start)
        .lt("created_at", end);

      const validIds = (salesWithIds ?? []).map((s) => s.id);
      let totalItems = 0;
      if (validIds.length > 0) {
        const { data: itemsData } = await supabase
          .from("sale_items")
          .select("quantity")
          .in("sale_id", validIds);
        totalItems = (itemsData ?? []).reduce((s, i) => s + (i.quantity ?? 0), 0);
      }

      return {
        totalRevenue,
        totalTransactions,
        totalItems,
        avgTicket: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
        totalIva,
        byPayment: { cash, card, transfer },
      };
    },
    staleTime: 60_000,
  });
}

// ─── Daily Breakdown ─────────────────────────────────────────────────────────

export function useDailySales(month: string) {
  return useQuery({
    queryKey: ["reportes-daily", month],
    queryFn: async (): Promise<DailySales[]> => {
      const supabase = createClient();
      const [start, end] = monthRange(month);

      const { data: sales, error } = await supabase
        .from("sales")
        .select("id, total, created_at")
        .eq("status", "completed")
        .gte("created_at", start)
        .lt("created_at", end)
        .order("created_at");

      if (error) throw error;

      const saleIds = (sales ?? []).map((s) => s.id);
      let itemsByDay: Record<string, number> = {};
      if (saleIds.length > 0) {
        const { data: items } = await supabase
          .from("sale_items")
          .select("sale_id, quantity")
          .in("sale_id", saleIds);

        const saleIdToDate: Record<string, string> = {};
        for (const s of sales ?? []) {
          // Convert UTC to Hermosillo (UTC-7)
          const local = new Date(new Date(s.created_at).getTime() - 7 * 3600 * 1000);
          saleIdToDate[s.id] = local.toISOString().slice(0, 10);
        }
        for (const item of items ?? []) {
          const d = saleIdToDate[item.sale_id];
          if (d) itemsByDay[d] = (itemsByDay[d] ?? 0) + (item.quantity ?? 0);
        }
      }

      // Group by local date
      const byDate: Record<string, { revenue: number; transactions: number }> = {};
      for (const s of sales ?? []) {
        const local = new Date(new Date(s.created_at).getTime() - 7 * 3600 * 1000);
        const date = local.toISOString().slice(0, 10);
        if (!byDate[date]) byDate[date] = { revenue: 0, transactions: 0 };
        byDate[date].revenue += s.total ?? 0;
        byDate[date].transactions += 1;
      }

      return Object.entries(byDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({
          date,
          revenue: v.revenue,
          transactions: v.transactions,
          items: itemsByDay[date] ?? 0,
        }));
    },
    staleTime: 60_000,
  });
}

// ─── Brand Breakdown ─────────────────────────────────────────────────────────

export function useBrandBreakdown(month: string) {
  return useQuery({
    queryKey: ["reportes-brands", month],
    queryFn: async (): Promise<BrandBreakdown[]> => {
      const supabase = createClient();
      const [start, end] = monthRange(month);

      // Get completed sale IDs for the month
      const { data: sales, error: salesErr } = await supabase
        .from("sales")
        .select("id")
        .eq("status", "completed")
        .gte("created_at", start)
        .lt("created_at", end);

      if (salesErr) throw salesErr;

      const saleIds = (sales ?? []).map((s) => s.id);
      if (saleIds.length === 0) return [];

      const { data: items, error: itemsErr } = await supabase
        .from("sale_items")
        .select(
          "quantity, unit_price, brand_amount, store_amount, variant:product_variants(product:products(brand_id, brand:brands(name)))"
        )
        .in("sale_id", saleIds);

      if (itemsErr) throw itemsErr;

      const byBrand: Record<
        string,
        { brandName: string; revenue: number; items: number; brandAmount: number; storeAmount: number }
      > = {};

      for (const item of items ?? []) {
        const variant = item.variant as {
          product: { brand_id: string | null; brand: { name: string } | null } | null;
        } | null;
        const brandId = variant?.product?.brand_id ?? "sin-marca";
        const brandName = variant?.product?.brand?.name ?? "Sin marca";
        if (!byBrand[brandId]) {
          byBrand[brandId] = { brandName, revenue: 0, items: 0, brandAmount: 0, storeAmount: 0 };
        }
        byBrand[brandId].revenue += (item.unit_price ?? 0) * (item.quantity ?? 0);
        byBrand[brandId].items += item.quantity ?? 0;
        byBrand[brandId].brandAmount += item.brand_amount ?? 0;
        byBrand[brandId].storeAmount += item.store_amount ?? 0;
      }

      return Object.entries(byBrand)
        .map(([brandId, v]) => ({
          brandId: brandId === "sin-marca" ? null : brandId,
          ...v,
        }))
        .sort((a, b) => b.revenue - a.revenue);
    },
    staleTime: 60_000,
  });
}

// ─── Top Products ─────────────────────────────────────────────────────────────

export function useTopProducts(month: string, limit = 10) {
  return useQuery({
    queryKey: ["reportes-top-products", month, limit],
    queryFn: async (): Promise<TopProduct[]> => {
      const supabase = createClient();
      const [start, end] = monthRange(month);

      const { data: sales, error: salesErr } = await supabase
        .from("sales")
        .select("id")
        .eq("status", "completed")
        .gte("created_at", start)
        .lt("created_at", end);

      if (salesErr) throw salesErr;

      const saleIds = (sales ?? []).map((s) => s.id);
      if (saleIds.length === 0) return [];

      const { data: items, error: itemsErr } = await supabase
        .from("sale_items")
        .select(
          "quantity, unit_price, variant:product_variants(sku, product:products(id, name, brand:brands(name)))"
        )
        .in("sale_id", saleIds);

      if (itemsErr) throw itemsErr;

      const byProduct: Record<
        string,
        { productName: string; sku: string; brandName: string | null; totalQty: number; totalRevenue: number }
      > = {};

      for (const item of items ?? []) {
        const v = item.variant as {
          sku: string;
          product: { id: string; name: string; brand: { name: string } | null } | null;
        } | null;
        const productId = v?.product?.id ?? "unknown";
        if (!byProduct[productId]) {
          byProduct[productId] = {
            productName: v?.product?.name ?? "Desconocido",
            sku: v?.sku ?? "",
            brandName: v?.product?.brand?.name ?? null,
            totalQty: 0,
            totalRevenue: 0,
          };
        }
        byProduct[productId].totalQty += item.quantity ?? 0;
        byProduct[productId].totalRevenue += (item.unit_price ?? 0) * (item.quantity ?? 0);
      }

      return Object.entries(byProduct)
        .map(([productId, v]) => ({ productId, ...v }))
        .sort((a, b) => b.totalQty - a.totalQty)
        .slice(0, limit);
    },
    staleTime: 60_000,
  });
}

// ─── Employee Breakdown ───────────────────────────────────────────────────────

export function useEmployeeBreakdown(month: string) {
  return useQuery({
    queryKey: ["reportes-employees", month],
    queryFn: async (): Promise<EmployeeBreakdown[]> => {
      const supabase = createClient();
      const [start, end] = monthRange(month);

      const { data, error } = await supabase
        .from("sales")
        .select("total, employee_id, employee:employees(name)")
        .eq("status", "completed")
        .gte("created_at", start)
        .lt("created_at", end);

      if (error) throw error;

      const byEmp: Record<string, { name: string; transactions: number; revenue: number }> = {};

      for (const s of data ?? []) {
        const empId = s.employee_id ?? "sin-empleado";
        const emp = s.employee as { name: string } | null;
        const name = emp?.name ?? "Sin empleado";
        if (!byEmp[empId]) byEmp[empId] = { name, transactions: 0, revenue: 0 };
        byEmp[empId].transactions += 1;
        byEmp[empId].revenue += s.total ?? 0;
      }

      return Object.entries(byEmp)
        .map(([employeeId, v]) => ({
          employeeId,
          employeeName: v.name,
          transactions: v.transactions,
          revenue: v.revenue,
        }))
        .sort((a, b) => b.revenue - a.revenue);
    },
    staleTime: 60_000,
  });
}
