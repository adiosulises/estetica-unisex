"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useConfig } from "@/hooks/use-configuracion";
import type { Database } from "@/types/database";

export type ChargeType = "iva" | "rent";

export interface ChargeBalance {
  /** Date the current accumulation period started (last liquidation, or earliest sale) */
  since: string | null;
  /** Amount accumulated since `since` */
  accumulated: number;
}

export interface StoreCharge {
  id: string;
  charge_type: ChargeType;
  period_start: string;
  period_end: string;
  amount: number;
  payment_method: string;
  notes: string | null;
  created_at: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_MONTH = 30.4368;

async function getSince(chargeType: ChargeType): Promise<string | null> {
  const supabase = createClient();

  const { data: lastCharge, error: chargeErr } = await supabase
    .from("store_charges")
    .select("period_end")
    .eq("charge_type", chargeType)
    .order("period_end", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (chargeErr) throw chargeErr;

  if (lastCharge?.period_end) return lastCharge.period_end;

  // No previous liquidation — start counting from the earliest sale
  const { data: firstSale, error: saleErr } = await supabase
    .from("sales")
    .select("created_at")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (saleErr) throw saleErr;

  return firstSale?.created_at ?? null;
}

/** Running balance for IVA: sum of iva_collected on all sales since the last liquidation */
export function useIvaBalance() {
  return useQuery({
    queryKey: ["store-charge-balance", "iva"],
    queryFn: async (): Promise<ChargeBalance> => {
      const since = await getSince("iva");
      if (!since) return { since: null, accumulated: 0 };

      const supabase = createClient();
      const { data, error } = await supabase
        .from("sales")
        .select("iva_collected")
        .gt("created_at", since);
      if (error) throw error;

      const accumulated = (data ?? []).reduce((s, r) => s + Number(r.iva_collected ?? 0), 0);
      return { since, accumulated };
    },
    staleTime: 30_000,
  });
}

/** Running balance for Renta: config.rent_amount prorated daily since the last liquidation */
export function useRentBalance() {
  const { data: config } = useConfig();

  return useQuery({
    queryKey: ["store-charge-balance", "rent", config?.rent_amount],
    queryFn: async (): Promise<ChargeBalance> => {
      const since = await getSince("rent");
      if (!since || !config) return { since: null, accumulated: 0 };

      const days = Math.max(0, (Date.now() - new Date(since).getTime()) / MS_PER_DAY);
      const accumulated = (config.rent_amount / DAYS_PER_MONTH) * days;
      return { since, accumulated };
    },
    enabled: !!config,
    staleTime: 30_000,
  });
}

/** History of past liquidations for a charge type */
export function useStoreChargeHistory(chargeType: ChargeType, enabled = true) {
  return useQuery({
    queryKey: ["store-charge-history", chargeType],
    queryFn: async (): Promise<StoreCharge[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("store_charges")
        .select("*")
        .eq("charge_type", chargeType)
        .order("period_end", { ascending: false });
      if (error) throw error;
      return (data ?? []) as StoreCharge[];
    },
    enabled,
    staleTime: 30_000,
  });
}

interface LiquidarChargePayload {
  charge_type: ChargeType;
  period_start: string;
  amount: number;
  payment_method: string;
  notes?: string;
}

export function useLiquidarCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ charge_type, period_start, amount, payment_method, notes }: LiquidarChargePayload) => {
      const supabase = createClient();

      type ChargeInsert = Database["public"]["Tables"]["store_charges"]["Insert"];
      const payload: ChargeInsert = {
        charge_type,
        period_start,
        amount,
        payment_method,
        notes: notes ?? null,
      };

      const { error: insertErr } = await supabase.from("store_charges").insert(payload);
      if (insertErr) throw insertErr;

      const { error: mvErr } = await supabase.from("cash_movements").insert({
        type: charge_type === "iva" ? "iva" : "rent",
        amount: -amount,
        description: charge_type === "iva" ? "Liquidación de IVA" : "Liquidación de renta",
        payment_method: payment_method as "cash" | "card" | "transfer" | "mixed",
      });
      if (mvErr) throw mvErr;
    },
    onSuccess: (_, { charge_type }) => {
      qc.invalidateQueries({ queryKey: ["store-charge-balance", charge_type] });
      qc.invalidateQueries({ queryKey: ["store-charge-history", charge_type] });
      qc.invalidateQueries({ queryKey: ["caja-movements-today"] });
    },
  });
}
