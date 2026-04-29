"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cambiarPasswordSchema, type CambiarPasswordValues } from "@/lib/validations/empleados";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  onSubmit: (values: CambiarPasswordValues) => Promise<void>;
  onCancel: () => void;
}

export function CambiarPasswordForm({ onSubmit, onCancel }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CambiarPasswordValues>({
    resolver: zodResolver(cambiarPasswordSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col gap-4">
      <Input
        id="password"
        label="Nueva contraseña *"
        type="password"
        placeholder="Mínimo 8 caracteres"
        error={errors.password?.message}
        {...register("password")}
      />
      <Input
        id="confirm"
        label="Confirmar contraseña *"
        type="password"
        placeholder="Repite la contraseña"
        error={errors.confirm?.message}
        {...register("confirm")}
      />
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Cambiando..." : "Cambiar contraseña"}
        </Button>
      </div>
    </form>
  );
}
