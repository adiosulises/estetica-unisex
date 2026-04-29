"use client";

import { useFieldArray, type Control, type FieldErrors } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BatchFormValues } from "@/lib/validations/inventario";

interface VariantesInputProps {
  control: Control<BatchFormValues>;
  productIndex: number;
  errors?: FieldErrors<BatchFormValues>["products"];
  basePrice: number;
}

const TALLAS_COMUNES = ["XS", "S", "M", "L", "XL", "XXL"];

export function VariantesInput({ control, productIndex, errors, basePrice }: VariantesInputProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `products.${productIndex}.variants`,
  });

  function addTallasComunes() {
    const existing = fields.map((f) => f.size);
    TALLAS_COMUNES.forEach((size) => {
      if (!existing.includes(size)) {
        append({ size, color: "Negro", price: basePrice || undefined, stock: 1, low_stock_threshold: 0 });
      }
    });
  }

  function addBlank() {
    append({ size: "M", color: "Negro", price: basePrice || undefined, stock: 1, low_stock_threshold: 0 });
  }

  const variantErrors = errors?.[productIndex]?.variants;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--foreground)]">
          Variantes <span className="text-[var(--destructive)]">*</span>
        </span>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={addTallasComunes}>
            + Tallas S–XXL
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={addBlank}>
            <Plus size={14} />
            Agregar
          </Button>
        </div>
      </div>

      {typeof variantErrors === "object" && "message" in variantErrors && (
        <p className="text-xs text-[var(--destructive)]">{variantErrors.message as string}</p>
      )}

      {fields.length === 0 ? (
        <div className="text-xs text-[var(--muted-foreground)] py-3 text-center border border-dashed border-[var(--border)] rounded-lg">
          Sin variantes — agrega tallas o una variante única
        </div>
      ) : (
        <div className="border border-[var(--border)] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
                <th className="text-left px-3 py-2 text-xs font-medium text-[var(--muted-foreground)]">Talla</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-[var(--muted-foreground)]">Color</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-[var(--muted-foreground)]">Precio</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-[var(--muted-foreground)]">Stock</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-[var(--muted-foreground)]">Alerta</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {fields.map((field, vi) => (
                <VarianteRow
                  key={field.id}
                  control={control}
                  productIndex={productIndex}
                  variantIndex={vi}
                  basePrice={basePrice}
                  onRemove={() => remove(vi)}
                  isLast={vi === fields.length - 1}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Fila individual — componente separado para registrar los campos sin prop drilling excesivo
import { useFormContext } from "react-hook-form";

function VarianteRow({
  productIndex,
  variantIndex,
  basePrice,
  onRemove,
  isLast,
}: {
  control: Control<BatchFormValues>;
  productIndex: number;
  variantIndex: number;
  basePrice: number;
  onRemove: () => void;
  isLast: boolean;
}) {
  const { register } = useFormContext<BatchFormValues>();
  const base = `products.${productIndex}.variants.${variantIndex}` as const;

  return (
    <tr className={!isLast ? "border-b border-[var(--border)]" : ""}>
      <td className="px-3 py-1.5">
        <input
          {...register(`${base}.size`)}
          placeholder="M"
          className="w-16 px-2 py-1 text-sm rounded border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
        />
      </td>
      <td className="px-3 py-1.5">
        <input
          {...register(`${base}.color`)}
          placeholder="Negro"
          className="w-24 px-2 py-1 text-sm rounded border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
        />
      </td>
      <td className="px-3 py-1.5">
        <input
          {...register(`${base}.price`, { setValueAs: (v) => v === "" ? (basePrice || undefined) : Number(v) })}
          type="number"
          step="0.01"
          min="0"
          placeholder={String(basePrice)}
          defaultValue={basePrice}
          className="w-24 px-2 py-1 text-sm rounded border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
        />
      </td>
      <td className="px-3 py-1.5">
        <input
          {...register(`${base}.stock`, { valueAsNumber: true })}
          type="number"
          min="0"
          className="w-16 px-2 py-1 text-sm rounded border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
        />
      </td>
      <td className="px-3 py-1.5">
        <input
        defaultValue={0}
          {...register(`${base}.low_stock_threshold`, { valueAsNumber: true })}
          type="number"
          min="0"
          className="w-16 px-2 py-1 text-sm rounded border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
        />
      </td>
      <td className="px-3 py-1.5">
        <button
          type="button"
          onClick={onRemove}
          className="text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
}
