"use client";

import { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FotoUpload } from "@/components/inventario/foto-upload";
import { VariantesInput } from "@/components/inventario/variantes-input";
import type { BatchFormValues } from "@/lib/validations/inventario";
import type { Marca } from "@/types/marcas";
import type { Empleado } from "@/types/empleados";

const CATEGORIAS = [
  "ROPA MARCA PROPIA",
  "ROPA CONSIGNA",
  "JOYERÍA",
  "ACCESORIOS",
  "CALZADO",
  "BOLSAS",
  "OTROS",
];

interface Props {
  index: number;
  marcas: Marca[];
  empleados: Empleado[];
  photoFiles: Record<number, File>;
  onPhotoChange: (index: number, file: File | null) => void;
  onRemove: () => void;
  canRemove: boolean;
}

export function ProductoBatchCard({
  index,
  marcas,
  empleados,
  photoFiles,
  onPhotoChange,
  onRemove,
  canRemove,
}: Props) {
  const [open, setOpen] = useState(true);
  const {
    register,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useFormContext<BatchFormValues>();

  const productErrors = errors.products?.[index];
  const productionPaidBy = watch(`products.${index}.production_paid_by`);
  const basePrice = watch(`products.${index}.base_price`) ?? 0;
  const name = watch(`products.${index}.name`);
  const brandId = watch(`products.${index}.brand_id`);

  // Auto-fill SKU prefix cuando se selecciona una marca
  useEffect(() => {
    if (!brandId) return;
    const marca = marcas.find((m) => m.id === brandId);
    if (marca?.sku_prefix) {
      setValue(`products.${index}.sku_prefix`, marca.sku_prefix, {
        shouldDirty: false,
      });
    }
  }, [brandId, marcas, index, setValue]);

  return (
    <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--card)]">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3 cursor-pointer bg-[var(--muted)] hover:bg-[var(--border)] transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-[var(--muted-foreground)] bg-[var(--border)] px-2 py-0.5 rounded">
            #{index + 1}
          </span>
          <span className="text-sm font-medium text-[var(--foreground)]">
            {name || "Nuevo producto"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {canRemove && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors p-1"
            >
              <Trash2 size={15} />
            </button>
          )}
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {open && (
        <div className="p-5 flex flex-col gap-5">
          {/* Fila 1: foto + datos principales */}
          <div className="flex gap-5">
            <div className="w-44 flex-shrink-0">
              <FotoUpload
                value={photoFiles[index] ?? null}
                onChange={(f) => onPhotoChange(index, f)}
              />
            </div>

            <div className="flex-1 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  id={`products.${index}.name`}
                  label="Nombre del producto *"
                  placeholder="Ej. Tora Tee"
                  error={productErrors?.name?.message}
                  {...register(`products.${index}.name`)}
                />
                <Input
                  id={`products.${index}.sku_prefix`}
                  label="Prefijo SKU *"
                  placeholder="Ej. TT"
                  maxLength={6}
                  hint="2–6 chars, solo letras/números"
                  error={productErrors?.sku_prefix?.message}
                  {...register(`products.${index}.sku_prefix`)}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Select
                  id={`products.${index}.brand_id`}
                  label="Marca"
                  error={productErrors?.brand_id?.message}
                  {...register(`products.${index}.brand_id`)}
                >
                  <option value="">— Sin marca —</option>
                  {marcas.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </Select>

                <Select
                  id={`products.${index}.category`}
                  label="Categoría *"
                  error={productErrors?.category?.message}
                  {...register(`products.${index}.category`)}
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>

                <Input
                  id={`products.${index}.base_price`}
                  label="Precio base *"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="350"
                  hint="Precio de etiqueta"
                  error={productErrors?.base_price?.message}
                  {...register(`products.${index}.base_price`, { valueAsNumber: true })}
                />
              </div>

              <Input
                id={`products.${index}.description`}
                label="Descripción"
                placeholder="Descripción opcional del producto"
                error={productErrors?.description?.message}
                {...register(`products.${index}.description`)}
              />
            </div>
          </div>

          {/* Variantes */}
          <VariantesInput
            control={control}
            productIndex={index}
            errors={errors.products}
            basePrice={basePrice}
          />

          {/* Costo de producción */}
          <div className="border border-[var(--border)] rounded-lg p-4 flex flex-col gap-4">
            <span className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
              Costo de producción (opcional)
            </span>
            <div className="grid grid-cols-3 gap-4">
              <Input
                id={`products.${index}.production_cost`}
                label="Costo total (MXN)"
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                error={productErrors?.production_cost?.message}
                {...register(`products.${index}.production_cost`, {
                  setValueAs: (v) => v === "" ? 0 : Number(v),
                })}
              />

              <Select
                id={`products.${index}.production_paid_by`}
                label="¿Quién adelantó?"
                {...register(`products.${index}.production_paid_by`)}
              >
                <option value="none">Nadie / N/A</option>
                <option value="store">La tienda</option>
                <option value="employee">Un empleado</option>
              </Select>

              {productionPaidBy === "employee" && (
                <Select
                  id={`products.${index}.production_paid_by_employee_id`}
                  label="Empleado *"
                  error={productErrors?.production_paid_by_employee_id?.message}
                  {...register(`products.${index}.production_paid_by_employee_id`)}
                >
                  <option value="">Seleccionar...</option>
                  {empleados.map((e) => (
                    <option key={e.id} value={e.id}>{e.full_name}</option>
                  ))}
                </Select>
              )}
            </div>

            <Input
              id={`products.${index}.production_notes`}
              label="Notas de producción"
              placeholder="Ej. Pago con tarjeta Banorte el 15 enero"
              {...register(`products.${index}.production_notes`)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
