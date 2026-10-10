"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, ArrowLeft, CheckCircle, Store, User } from "lucide-react";
import { batchSchema, type BatchFormValues } from "@/lib/validations/inventario";
import { useCreateBatch } from "@/hooks/use-productos";
import { useMarcas } from "@/hooks/use-marcas";
import { useEmpleados } from "@/hooks/use-empleados";
import { useConsignatarios } from "@/hooks/use-vintage";
import { ProductoBatchCard } from "@/components/inventario/producto-batch-card";
import { Button } from "@/components/ui/button";

function makeDefault(brandId: string, consigId = ""): BatchFormValues["products"][0] {
  return {
    brand_id: brandId,
    consignatario_id: consigId || undefined,
    name: "",
    sku_prefix: "",
    category: "ROPA CONSIGNA",
    base_price: 0,
    description: "",
    production_cost: 0,
    production_paid_by: "none",
    production_paid_by_employee_id: "",
    production_notes: "",
    variants: [],
  };
}

export default function EntradaMarcaPage() {
  const router = useRouter();
  const [photoFiles, setPhotoFiles] = useState<Record<number, File>>({});
  const [savedSkus, setSavedSkus] = useState<string[] | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [selectedConsigId, setSelectedConsigId] = useState("");

  const { data: marcas = [] } = useMarcas();
  const { data: empleados = [] } = useEmpleados();
  const { data: consignatarios = [] } = useConsignatarios();
  const createBatch = useCreateBatch();

  const methods = useForm<BatchFormValues>({
    resolver: zodResolver(batchSchema),
    defaultValues: { products: [makeDefault("")] },
  });

  const { fields, append, remove } = useFieldArray({
    control: methods.control,
    name: "products",
  });

  function handleBrandChange(brandId: string) {
    setSelectedBrandId(brandId);
    const current = methods.getValues("products");
    current.forEach((_, i) => {
      methods.setValue(`products.${i}.brand_id`, brandId);
    });
  }

  function handleConsigChange(consigId: string) {
    setSelectedConsigId(consigId);
    const current = methods.getValues("products");
    current.forEach((_, i) => {
      methods.setValue(`products.${i}.consignatario_id`, consigId);
    });
  }

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
    setSavedSkus(results.flatMap((r) => r.variantSkus));
  }

  const selectedBrand  = marcas.find((m) => m.id === selectedBrandId);
  const selectedConsig = consignatarios.find((c) => c.id === selectedConsigId);

  if (savedSkus) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-8 text-center">
          <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-1">¡Entrada guardada!</h2>
          <p className="text-sm text-[var(--muted-foreground)] mb-6">
            {savedSkus.length} variante{savedSkus.length !== 1 ? "s" : ""} registradas
            {selectedBrand ? ` para ${selectedBrand.name}` : ""}.
          </p>
          <div className="bg-[var(--muted)] rounded-lg p-4 mb-6 text-left">
            <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-2">
              SKUs generados
            </p>
            <div className="flex flex-wrap gap-2">
              {savedSkus.map((sku) => (
                <span key={sku} className="font-mono text-xs bg-[var(--accent)] text-[var(--accent-foreground)] px-2 py-1 rounded">
                  {sku}
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => router.push("/inventario")}>
              Ver inventario
            </Button>
            <Button onClick={() => router.push(`/etiquetas?skus=${savedSkus.join(",")}`)}>
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
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Entrada por marca</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Selecciona la marca una vez y da de alta todos sus artículos.
        </p>
      </div>

      {/* Global pickers */}
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-5 mb-4 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
            <Store size={18} className="text-[var(--primary)]" />
          </div>
          <div className="flex-1">
            <label className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide block mb-1">
              Marca
            </label>
            <select
              value={selectedBrandId}
              onChange={(e) => handleBrandChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              <option value="">— Selecciona una marca —</option>
              {marcas.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>

        {consignatarios.length > 0 && (
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[var(--muted)] flex items-center justify-center flex-shrink-0">
              <User size={18} className="text-[var(--muted-foreground)]" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide block mb-1">
                Consignatario vintage <span className="font-normal normal-case">(opcional)</span>
              </label>
              <select
                value={selectedConsigId}
                onChange={(e) => handleConsigChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              >
                <option value="">— Sin consignatario —</option>
                {consignatarios.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.initial}) · {c.share_pct}%
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {!selectedBrandId && !selectedConsigId ? (
        <div className="text-center py-16 text-[var(--muted-foreground)]">
          <Store size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Selecciona una marca o consignatario para comenzar</p>
        </div>
      ) : (
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
                hideBrandSelector
                hideConsigSelector={!!selectedConsigId}
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
              onClick={() => append(makeDefault(selectedBrandId, selectedConsigId))}
              className="w-full"
            >
              <Plus size={15} />
              Agregar otro artículo{selectedBrand ? ` de ${selectedBrand.name}` : selectedConsig ? ` de ${selectedConsig.name}` : ""}
            </Button>

            {createBatch.error && (
              <p className="text-sm text-[var(--destructive)] text-center">
                {(createBatch.error as Error).message}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
              <Button type="button" variant="secondary" onClick={() => router.back()} disabled={createBatch.isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createBatch.isPending} size="lg">
                {createBatch.isPending
                  ? `Guardando ${fields.length} artículo${fields.length > 1 ? "s" : ""}...`
                  : `Guardar ${fields.length} artículo${fields.length > 1 ? "s" : ""}${selectedBrand ? ` de ${selectedBrand.name}` : selectedConsig ? ` de ${selectedConsig.name}` : ""}`}
              </Button>
            </div>
          </form>
        </FormProvider>
      )}
    </div>
  );
}
