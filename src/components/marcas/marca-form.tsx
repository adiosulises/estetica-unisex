"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { marcaSchema, type MarcaFormValues } from "@/lib/validations/marcas";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { Marca } from "@/types/marcas";

interface MarcaFormProps {
  defaultValues?: Marca;
  onSubmit: (values: MarcaFormValues) => Promise<void>;
  onCancel: () => void;
}

export function MarcaForm({ defaultValues, onSubmit, onCancel }: MarcaFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MarcaFormValues>({
    resolver: zodResolver(marcaSchema),
    defaultValues: defaultValues
      ? {
          name: defaultValues.name,
          sku_prefix: defaultValues.sku_prefix ?? "",
          contact_name: defaultValues.contact_name ?? "",
          contact_email: defaultValues.contact_email ?? "",
          contact_phone: defaultValues.contact_phone ?? "",
          contract_type: defaultValues.contract_type,
          contract_value: defaultValues.contract_value,
          bank_account: defaultValues.bank_account ?? "",
          notes: defaultValues.notes ?? "",
        }
      : {
          contract_type: "pct",
          contract_value: 0.75,
        },
  });

  const contractType = watch("contract_type");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <Input
            id="name"
            label="Nombre de la marca *"
            placeholder="Ej. Tora Studio"
            error={errors.name?.message}
            {...register("name")}
          />
        </div>
        <Input
          id="sku_prefix"
          label="Prefijo SKU"
          placeholder="Ej. TS"
          maxLength={6}
          hint="2–6 chars · se usa en etiquetas"
          error={errors.sku_prefix?.message}
          {...register("sku_prefix")}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          id="contact_name"
          label="Nombre de contacto"
          placeholder="Ej. Ana García"
          error={errors.contact_name?.message}
          {...register("contact_name")}
        />
        <Input
          id="contact_phone"
          label="Teléfono"
          placeholder="664 123 4567"
          type="tel"
          error={errors.contact_phone?.message}
          {...register("contact_phone")}
        />
      </div>

      <Input
        id="contact_email"
        label="Email"
        placeholder="marca@ejemplo.com"
        type="email"
        error={errors.contact_email?.message}
        {...register("contact_email")}
      />

      <div className="grid grid-cols-2 gap-4">
        <Select
          id="contract_type"
          label="Tipo de contrato *"
          error={errors.contract_type?.message}
          {...register("contract_type")}
        >
          <option value="pct">Porcentaje (consigna)</option>
          <option value="floor">Renta fija (piso)</option>
        </Select>

        <Input
          id="contract_value"
          label={contractType === "pct" ? "% para la marca (0–1) *" : "Renta mensual (MXN) *"}
          placeholder={contractType === "pct" ? "0.75" : "500"}
          type="number"
          step={contractType === "pct" ? "0.01" : "1"}
          min={contractType === "pct" ? "0" : "1"}
          max={contractType === "pct" ? "1" : undefined}
          hint={
            contractType === "pct"
              ? "Ej. 0.75 = 75% para la marca, 25% para la tienda"
              : "Monto fijo mensual que la marca paga a la tienda"
          }
          error={errors.contract_value?.message}
          {...register("contract_value", { valueAsNumber: true })}
        />
      </div>

      <Input
        id="bank_account"
        label="Cuenta bancaria para transferencias"
        placeholder="CLABE, número de cuenta o SPEI"
        error={errors.bank_account?.message}
        {...register("bank_account")}
      />

      <Textarea
        id="notes"
        label="Notas"
        placeholder="Información adicional sobre la marca..."
        error={errors.notes?.message}
        {...register("notes")}
      />

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : defaultValues ? "Guardar cambios" : "Crear marca"}
        </Button>
      </div>
    </form>
  );
}
