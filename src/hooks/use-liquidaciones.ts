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
  sale_payment_method: string;
  product_name: string;
  variant_sku: string;
  quantity: number;
  unit_price: number;
  brand_amount: number;
  /** Only non-zero for floor brands: proportional IVA deduction for this item */
  iva_portion: number;
  /** Only non-zero for floor brands: proportional card commission deduction */
  card_comm_portion: number;
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

/** Brands with unpaid sale_items, sorted by pending amount.
 *  Includes both % (consignment) and floor-rent brands. */
export function usePendingByBrand() {
  return useQuery({
    queryKey: ["liquidaciones-pending"],
    queryFn: async (): Promise<BrandPending[]> => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("sale_items")
        .select(`
          id,
          brand_amount,
          unit_price,
          quantity,
          brand:brands(id, name, contract_type, contract_value)
        `)
        .not("brand_id", "is", null);

      if (error) throw error;

      const { data: paidItems, error: paidErr } = await supabase
        .from("brand_payout_items")
        .select("sale_item_id");
      if (paidErr) throw paidErr;

      const paidSet = new Set((paidItems ?? []).map((p: any) => p.sale_item_id));

      const map = new Map<string, BrandPending>();
      for (const item of data ?? []) {
        if (paidSet.has(item.id)) continue;
        const brand = item.brand as any;
        if (!brand) continue;

        // Floor brands: store holds full sale amount, owes brand unit_price × qty
        // Pct brands: owes brand the pre-calculated brand_amount
        const isFloor = brand.contract_type === "floor";
        const itemAmount = isFloor
          ? Number(item.unit_price) * Number(item.quantity)
          : Number(item.brand_amount);

        if (itemAmount === 0) continue;

        const existing = map.get(brand.id);
        if (existing) {
          existing.pending_amount += itemAmount;
          existing.item_count += 1;
        } else {
          map.set(brand.id, {
            brand_id: brand.id,
            brand_name: brand.name,
            contract_type: brand.contract_type,
            contract_value: Number(brand.contract_value),
            pending_amount: itemAmount,
            item_count: 1,
          });
        }
      }

      return Array.from(map.values()).sort((a, b) => b.pending_amount - a.pending_amount);
    },
    staleTime: 30_000,
  });
}

/** Unpaid items for a specific brand.
 *  contractType is used to calculate brand_amount for floor brands. */
export function usePendingItems(brandId: string | null, contractType?: string) {
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
          sale:sales(folio, created_at, total, paid_card, iva_collected, payment_method)
        `)
        .eq("brand_id", brandId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const isFloor = contractType === "floor";

      return (data ?? [])
        .filter((item: any) => {
          if (paidSet.has(item.id)) return false;
          const amount = isFloor
            ? Number(item.unit_price) * Number(item.quantity)
            : Number(item.brand_amount);
          return amount > 0;
        })
        .map((item: any) => {
          const gross = Number(item.unit_price) * Number(item.quantity);
          const saleTotal = Number(item.sale?.total ?? 1);
          const ratio = saleTotal > 0 ? gross / saleTotal : 0;

          // Proportional IVA and card commission for this item within its sale
          const ivaCollected  = Number(item.sale?.iva_collected ?? 0);
          const paidCard      = Number(item.sale?.paid_card ?? 0);
          const ivaPortion      = isFloor ? ivaCollected * ratio : 0;
          // Card commission shown for all brands (informational for pct, deducted for floor)
          const cardCommPortion = paidCard > 0 ? paidCard * 0.046 * ratio : 0;

          return {
            sale_item_id: item.id,
            sale_folio: item.sale?.folio ?? "—",
            sale_date: item.sale?.created_at ?? "",
            sale_payment_method: item.sale?.payment_method ?? "cash",
            product_name: item.variant?.product?.name ?? "—",
            variant_sku: item.variant?.sku ?? "—",
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
            // For floor brands: gross. For pct brands: pre-calculated brand_amount.
            brand_amount: isFloor ? gross : Number(item.brand_amount),
            iva_portion: ivaPortion,
            card_comm_portion: cardCommPortion,
          };
        });
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

      const total_sold   = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
      const brand_amount = items.reduce((s, i) => s + i.brand_amount, 0);
      const store_amount = total_sold - brand_amount;

      const dates        = items.map((i) => i.sale_date).sort();
      const period_start = dates[0]?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
      const period_end   = dates[dates.length - 1]?.slice(0, 10) ?? period_start;

      const pm = payment_method as "cash" | "card" | "transfer" | "mixed";

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
          status: "paid" as const,
          paid_at: new Date().toISOString(),
          payment_method: pm,
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
        type: "brand_payment" as const,
        amount: -brand_amount,
        description: `Liquidación marca — ${period_start} a ${period_end}`,
        reference_id: payout.id,
        reference_type: "brand_payout",
        payment_method: pm,
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
