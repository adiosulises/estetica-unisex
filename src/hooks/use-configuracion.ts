"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface Config {
  id: string;
  rent_amount: number;
  monthly_goal: number;
  iva_rate: number;
  card_rate: number;
  iva_includes_transfer: boolean;
  salary_pool_pct: number;
  maintenance_pct: number;
  savings_pct: number;
  ads_pct: number;
  construction_pct: number;
  /** 0 = fin de mes calendario. 1–31 = el período cierra ese día de cada mes. */
  period_cut_day: number;
}

export function useConfig() {
  return useQuery({
    queryKey: ["config"],
    queryFn: async (): Promise<Config> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("payroll_config")
        .select("*")
        .single();
      if (error) throw error;
      return data as Config;
    },
    staleTime: 5 * 60_000,
  });
}

export function useUpdateConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<Omit<Config, "id">>) => {
      const supabase = createClient();
      const { data: existing } = await supabase
        .from("payroll_config")
        .select("id")
        .single();
      if (!existing) throw new Error("No config found");
      const { error } = await supabase
        .from("payroll_config")
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["config"] }),
  });
}
