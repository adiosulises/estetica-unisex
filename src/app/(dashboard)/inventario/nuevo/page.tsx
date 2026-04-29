"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, ArrowLeft, CheckCircle } from "lucide-react";
import { batchSchema, type BatchFormValues } from "@/lib/validations/inventario";
import { useCreateBatch } from "@/hooks/use-productos";
import { useMarcas } from "@/hooks/use-marcas";
import { useEmpleados } from "@/hooks/use-empleados";
import { ProductoBatchCard } from "@/components/inventario/producto-batch-card";
import { Button } from "@/components/ui/button";

const DEFAULT_PRODUCT: BatchFormValues["products"][0] = {
  brand_id: "",
  name: "",
  sku_prefix: "",
  category: "ROPA CONSIGNA",
  base_price: 0,
  description: "",
  production_cost: 0,
  production_paid_by: "none",
  production_paid_by_employee_id: "",
  production_notes: "",
  variants: [{ size: "M", color: "Negro", stock: 1, low_stock_threshold: 0 }],
};

export default function NuevoBatchPage() {
  const router = useRouter();
  const [photoFiles, setPhotoFiles] = useState<Record<number, File>>({});
  const [savedSkus, setSavedSkus] = useState<string[] | null>(null);

  const { data: marcas = [] } = useMarcas();
  const { data: empleados = [] } = useEmpleados();
  const createBatch = useCreateBatch();

  const methods = useForm<BatchFormValues>({
    resolver: zodResolver(batchSchema),
    defaultValues: { products: [{ ...DEFAULT_PRODUCT }] },
  });

  const { fields, append, remove } = useFieldArray({
    control: methods.control,
    name: "products",
  });

  function handlePhotoChange(index: number, file: File | null) {
    setPhotoFiles((prev) => {
      const next = { ...prev };
      if (file) next[index] = file;
      else delete next[index];
      return next;
    });
  }

  async function onSubmit(values: BatchFormValues) {
    const items = values.products.map((p, i) => ({
      values: p,
      photoFile: photoFiles[i],
    }));

    const results = await createBatch.mutateAsync(items);
    const allSkus = results.flatMap((r) => r.variantSkus);
    setSavedSkus(allSkus);
  }

  // Pantalla de éxito post-batch
  if (savedSkus) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-8 text-center">
          <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-1">
            ¡Batch guardado!
          </h2>
          <p className="text-sm text-[var(--muted-foreground)] mb-6">
            Se registraron {savedSkus.length} variante{savedSkus.length !== 1 ? "s" : ""} en inventario.
          </p>

          <div className="bg-[var(--muted)] rounded-lg p-4 mb-6 text-left">
            <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-2">
              SKUs generados
            </p>
            <div className="flex flex-wrap gap-2">
              {savedSkus.map((sku) => (
                <span
                  key={sku}
                  className="font-mono text-xs bg-[var(--accent)] text-[var(--accent-foreground)] px-2 py-1 rounded"
                >
                  {sku}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <Button
              variant="secondary"
              onClick={() => router.push("/inventario")}
            >
              Ver inventario
            </Button>
            <Button
              onClick={() => router.push(`/etiquetas?skus=${savedSkus.join(",")}`)}
            >
              Imprimir etiquetas
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6 transition-colors"
      >
        <ArrowLeft size={15} />
        Volver
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Alta en batch</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Agrega varios productos de un jalón. Los SKUs se generan automáticamente.
        </p>
      </div>

      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {fields.map((field, i) => (
            <ProductoBatchCard
              key={field.id}
              index={i}
              marcas={marcas}
              empleados={empleados}
              photoFiles={photoFiles}
              onPhotoChange={handlePhotoChange}
              onRemove={() => {
                remove(i);
                setPhotoFiles((prev) => {
                  const next: Record<number, File> = {};
                  Object.entries(prev).forEach(([k, v]) => {
                    const ki = Number(k);
                    if (ki < i) next[ki] = v;
                    else if (ki > i) next[ki - 1] = v;
                  });
                  return next;
                });
              }}
              canRemove={fields.length > 1}
            />
          ))}

          <Button
            type="button"
            variant="secondary"
            onClick={() => append({ ...DEFAULT_PRODUCT })}
            className="w-full"
          >
            <Plus size={15} />
            Agregar otro producto
          </Button>

          {createBatch.error && (
            <p className="text-sm text-[var(--destructive)] text-center">
              {(createBatch.error as Error).message}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
              disabled={createBatch.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createBatch.isPending} size="lg">
              {createBatch.isPending
                ? `Guardando ${fields.length} producto${fields.length > 1 ? "s" : ""}...`
                : `Guardar ${fields.length} producto${fields.length > 1 ? "s" : ""}`}
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
