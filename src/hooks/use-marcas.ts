"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Marca } from "@/types/marcas";
import type { MarcaFormValues } from "@/lib/validations/marcas";

const QUERY_KEY = "marcas";

async function fetchMarcas(includeInactive = false): Promise<Marca[]> {
  const supabase = createClient();
  let query = supabase
    .from("brands")
    .select("*")
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (!includeInactive) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) throw error;
  return data as Marca[];
}

async function fetchMarca(id: string): Promise<Marca> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Marca;
}

export function useMarcas(includeInactive = false) {
  return useQuery({
    queryKey: [QUERY_KEY, { includeInactive }],
    queryFn: () => fetchMarcas(includeInactive),
  });
}

export function useMarca(id: string) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => fetchMarca(id),
    enabled: !!id,
  });
}

export function useCreateMarca() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: MarcaFormValues) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("brands")
        .insert({
          name: values.name,
          sku_prefix: values.sku_prefix ? values.sku_prefix.toUpperCase() : null,
          contact_name: values.contact_name || null,
          contact_email: values.contact_email || null,
          contact_phone: values.contact_phone || null,
          contract_type: values.contract_type,
          contract_value: values.contract_value,
          bank_account: values.bank_account || null,
          notes: values.notes || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Marca;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useUpdateMarca(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: MarcaFormValues) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("brands")
        .update({
          name: values.name,
          sku_prefix: values.sku_prefix ? values.sku_prefix.toUpperCase() : null,
          contact_name: values.contact_name || null,
          contact_email: values.contact_email || null,
          contact_phone: values.contact_phone || null,
          contract_type: values.contract_type,
          contract_value: values.contract_value,
          bank_account: values.bank_account || null,
          notes: values.notes || null,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Marca;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useToggleMarcaActiva() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("brands")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
