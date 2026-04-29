"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { editarEmpleadoSchema, type EditarEmpleadoValues } from "@/lib/validations/empleados";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { Empleado } from "@/types/empleados";

interface Props {
  empleado: Empleado;
  onSubmit: (values: EditarEmpleadoValues) => Promise<void>;
  onCancel: () => void;
}

export function EditarEmpleadoForm({ empleado, onSubmit, onCancel }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditarEmpleadoValues>({
    resolver: zodResolver(editarEmpleadoSchema),
    defaultValues: {
      full_name: empleado.full_name,
      phone: empleado.phone ?? "",
      role: empleado.role,
      salary_pct: empleado.salary_pct,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col gap-4">
      <Input
        id="full_name"
        label="Nombre completo *"
        error={errors.full_name?.message}
        {...register("full_name")}
      />

      <Input
        id="phone"
        label="Teléfono"
        type="tel"
        placeholder="664 123 4567"
        error={errors.phone?.message}
        {...register("phone")}
      />

      <div className="grid grid-cols-2 gap-4">
        <Select
          id="role"
          label="Rol *"
          error={errors.role?.message}
          {...register("role")}
        >
          <option value="employee">Empleado</option>
          <option value="admin">Admin</option>
        </Select>

        <Input
          id="salary_pct"
          label="% del pool de sueldos"
          type="number"
          step="0.01"
          min="0"
          max="1"
          hint="Ej. 0.22 = 22% del pool"
          error={errors.salary_pct?.message}
          {...register("salary_pct", { valueAsNumber: true })}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
