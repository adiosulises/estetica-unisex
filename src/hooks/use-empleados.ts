"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Empleado } from "@/types/empleados";
import type { CrearEmpleadoValues, EditarEmpleadoValues } from "@/lib/validations/empleados";

const QUERY_KEY = "empleados";

export function useEmpleados() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async (): Promise<Empleado[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return data as Empleado[];
    },
  });
}

export function useCreateEmpleado() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: CrearEmpleadoValues) => {
      const res = await fetch("/api/empleados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al crear empleado");
      return json.employee as Empleado;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useUpdateEmpleado(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: EditarEmpleadoValues) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("employees")
        .update({
          full_name: values.full_name,
          phone: values.phone || null,
          role: values.role,
          salary_pct: values.salary_pct,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Empleado;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useToggleEmpleadoActivo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      // Actualizar en Auth (ban/unban) via API
      const res = await fetch(`/api/empleados/${id}`, {
        method: is_active ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        // Para reactivar, quitamos el ban
        body: !is_active ? JSON.stringify({ ban_duration: "none" }) : undefined,
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Error al cambiar estado");
      }

      // Actualizar is_active en employees
      const supabase = createClient();
      const { error } = await supabase
        .from("employees")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      const res = await fetch(`/api/empleados/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al cambiar contraseña");
    },
  });
}
