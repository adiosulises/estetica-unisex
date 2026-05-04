"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface BrandPending {
  brand_id: string;
  brand_name: string;
  contract_type: string;
  contract_value: number;
  pending_amount: number;
  item_count: number;
}

export interface PendingItem {
  sale_item_id: string;
  sale_folio: string;
  sale_date: string;
  product_name: string;
  variant_sku: string;
  quantity: number;
  unit_price: number;
  brand_amount: number;
}

export interface Payout {
  id: string;
  brand_id: string;
  brand_name: string;
  period_start: string;
  period_end: string;
  total_sold: number;
  brand_amount: number;
  store_amount: number;
  status: string;
  paid_at: string | null;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Brands with unpaid sale_items, sorted by pending amount */
export function usePendingByBrand() {
  return useQuery({
    queryKey: ["liquidaciones-pending"],
    queryFn: async (): Promise<BrandPending[]> => {
      const supabase = createClient();

      // sale_items that are NOT yet referenced by any brand_payout_items
      const { data, error } = await supabase
        .from("sale_items")
        .select(`
          id,
          brand_amount,
          store_amount,
          brand:brands(id, name, contract_type, contract_value)
        `)
        .not("brand_id", "is", null)
        .gt("brand_amount", 0);

      if (error) throw error;

      // Get already paid sale_item ids
      const { data: paidItems, error: paidErr } = await supabase
        .from("brand_payout_items")
        .select("sale_item_id");
      if (paidErr) throw paidErr;

      const paidSet = new Set((paidItems ?? []).map((p: any) => p.sale_item_id));

      // Filter unpaid and aggregate by brand
      const map = new Map<string, BrandPending>();
      for (const item of data ?? []) {
        if (paidSet.has(item.id)) continue;
        const brand = item.brand as any;
        if (!brand) continue;
        const existing = map.get(brand.id);
        if (existing) {
          existing.pending_amount += Number(item.brand_amount);
          existing.item_count += 1;
        } else {
          map.set(brand.id, {
            brand_id: brand.id,
            brand_name: brand.name,
            contract_type: brand.contract_type,
            contract_value: Number(brand.contract_value),
            pending_amount: Number(item.brand_amount),
            item_count: 1,
          });
        }
      }

      return Array.from(map.values()).sort((a, b) => b.pending_amount - a.pending_amount);
    },
    staleTime: 30_000,
  });
}

/** Unpaid items for a specific brand */
export function usePendingItems(brandId: string | null) {
  return useQuery({
    queryKey: ["liquidaciones-items", brandId],
    queryFn: async (): Promise<PendingItem[]> => {
      if (!brandId) return [];
      const supabase = createClient();

      const { data: paidItems, error: paidErr } = await supabase
        .from("brand_payout_items")
        .select("sale_item_id");
      if (paidErr) throw paidErr;
      const paidSet = new Set((paidItems ?? []).map((p: any) => p.sale_item_id));

      const { data, error } = await supabase
        .from("sale_items")
        .select(`
          id,
          quantity,
          unit_price,
          brand_amount,
          variant:product_variants(sku, product:products(name)),
          sale:sales(folio, created_at)
        `)
        .eq("brand_id", brandId)
        .gt("brand_amount", 0)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data ?? [])
        .filter((item: any) => !paidSet.has(item.id))
        .map((item: any) => ({
          sale_item_id: item.id,
          sale_folio: item.sale?.folio ?? "—",
          sale_date: item.sale?.created_at ?? "",
          product_name: item.variant?.product?.name ?? "—",
          variant_sku: item.variant?.sku ?? "—",
          quantity: item.quantity,
          unit_price: Number(item.unit_price),
          brand_amount: Number(item.brand_amount),
        }));
    },
    enabled: !!brandId,
    staleTime: 30_000,
  });
}

/** Historical payouts for a brand */
export function useBrandPayouts(brandId: string | null) {
  return useQuery({
    queryKey: ["brand-payouts", brandId],
    queryFn: async (): Promise<Payout[]> => {
      if (!brandId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from("brand_payouts")
        .select("*, brand:brands(name)")
        .eq("brand_id", brandId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((p: any) => ({
        ...p,
        brand_name: p.brand?.name ?? "—",
      }));
    },
    enabled: !!brandId,
    staleTime: 30_000,
  });
}

// ─── Mutation: register payout ────────────────────────────────────────────────
interface CreatePayoutPayload {
  brand_id: string;
  items: PendingItem[];
  payment_method: string;
  notes?: string;
}

export function useCreatePayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ brand_id, items, payment_method, notes }: CreatePayoutPayload) => {
      const supabase = createClient();

      const total_sold = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
      const brand_amount = items.reduce((s, i) => s + i.brand_amount, 0);
      const store_amount = total_sold - brand_amount;

      const dates = items.map((i) => i.sale_date).sort();
      const period_start = dates[0]?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
      const period_end   = dates[dates.length - 1]?.slice(0, 10) ?? period_start;

      // 1. Create brand_payout record
      const { data: payout, error: payoutErr } = await supabase
        .from("brand_payouts")
        .insert({
          brand_id,
          period_start,
          period_end,
          total_sold,
          brand_amount,
          store_amount,
          status: "paid",
          paid_at: new Date().toISOString(),
          payment_method,
          notes: notes ?? null,
        })
        .select()
        .single();
      if (payoutErr) throw payoutErr;

      // 2. Insert payout items
      const payoutItems = items.map((i) => ({
        payout_id: payout.id,
        sale_item_id: i.sale_item_id,
        product_name: i.product_name,
        variant_sku: i.variant_sku,
        quantity: i.quantity,
        unit_price: i.unit_price,
        brand_amount: i.brand_amount,
      }));
      const { error: itemsErr } = await supabase.from("brand_payout_items").insert(payoutItems);
      if (itemsErr) throw itemsErr;

      // 3. Record cash movement (negative = salida de dinero)
      const { error: mvErr } = await supabase.from("cash_movements").insert({
        type: "brand_payment",
        amount: -brand_amount,
        description: `Liquidación marca — ${period_start} a ${period_end}`,
        reference_id: payout.id,
        reference_type: "brand_payout",
        payment_method,
      });
      if (mvErr) throw mvErr;

      return payout;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["liquidaciones-pending"] });
      qc.invalidateQueries({ queryKey: ["liquidaciones-items"] });
      qc.invalidateQueries({ queryKey: ["brand-payouts"] });
      qc.invalidateQueries({ queryKey: ["caja-movements-today"] });
    },
  });
}
