"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface VintageConsignatario {
  id: string;
  name: string;
  initial: string;
  share_pct: number;
  active: boolean;
  created_at: string;
}

const QK = "vintage-consignatarios";

export function useConsignatarios(includeInactive = false) {
  return useQuery({
    queryKey: [QK, { includeInactive }],
    queryFn: async (): Promise<VintageConsignatario[]> => {
      const supabase = createClient();
      let q = supabase
        .from("vintage_consignatarios")
        .select("*")
        .order("name", { ascending: true });
      if (!includeInactive) q = q.eq("active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as VintageConsignatario[];
    },
    staleTime: 60_000,
  });
}

export function useCreateConsignatario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { name: string; initial: string; share_pct: number }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("vintage_consignatarios")
        .insert(values)
        .select()
        .single();
      if (error) throw error;
      return data as VintageConsignatario;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK] }),
  });
}

export function useUpdateConsignatario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...values
    }: { id: string; name?: string; initial?: string; share_pct?: number; active?: boolean }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("vintage_consignatarios")
        .update(values)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK] }),
  });
}
