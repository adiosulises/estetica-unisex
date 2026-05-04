"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface Config {
  id: string;
  rent_amount: number;
  monthly_goal: number;
  iva_rate: number;
  card_rate: number;
  salary_pool_pct: number;
  maintenance_pct: number;
  savings_pct: number;
  ads_pct: number;
  construction_pct: number;
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
      return data as unknown as Config;
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase
        .from("payroll_config")
        .update({ ...values, updated_at: new Date().toISOString() } as any)
        .eq("id", existing.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["config"] }),
  });
}
