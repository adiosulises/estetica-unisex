"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Phone, CreditCard, FileText, Pencil } from "lucide-react";
import { useMarca, useUpdateMarca, useToggleMarcaActiva } from "@/hooks/use-marcas";
import { Modal } from "@/components/ui/modal";
import { MarcaForm } from "@/components/marcas/marca-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { MarcaFormValues } from "@/lib/validations/marcas";

export default function MarcaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  const { data: marca, isLoading, error } = useMarca(id);
  const updateMarca = useUpdateMarca(id);
  const toggleActiva = useToggleMarcaActiva();

  async function handleEdit(values: MarcaFormValues) {
    await updateMarca.mutateAsync(values);
    setEditOpen(false);
  }

  if (isLoading) {
    return <div className="p-6 text-sm text-[var(--muted-foreground)]">Cargando...</div>;
  }

  if (error || !marca) {
    return (
      <div className="p-6">
        <p className="text-sm text-[var(--destructive)]">Marca no encontrada.</p>
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mt-2">
          Volver
        </Button>
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
        Volver a marcas
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[var(--foreground)]">{marca.name}</h1>
            <Badge variant={marca.is_active ? "success" : "outline"}>
              {marca.is_active ? "Activa" : "Inactiva"}
            </Badge>
          </div>
          {marca.contact_name && (
            <p className="text-sm text-[var(--muted-foreground)] mt-1">{marca.contact_name}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => toggleActiva.mutate({ id: marca.id, is_active: !marca.is_active })}
          >
            {marca.is_active ? "Desactivar" : "Activar"}
          </Button>
          <Button size="sm" onClick={() => setEditOpen(true)}>
            <Pencil size={14} />
            Editar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4">
          <h2 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3">
            Contacto
          </h2>
          <div className="space-y-2">
            {marca.contact_email ? (
              <div className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                <Mail size={14} className="text-[var(--muted-foreground)]" />
                {marca.contact_email}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">Sin email registrado</p>
            )}
            {marca.contact_phone && (
              <div className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                <Phone size={14} className="text-[var(--muted-foreground)]" />
                {marca.contact_phone}
              </div>
            )}
          </div>
        </div>

        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4">
          <h2 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3">
            Contrato
          </h2>
          {marca.contract_type === "pct" ? (
            <div className="space-y-1">
              <p className="text-sm font-medium text-[var(--foreground)]">
                {Math.round(marca.contract_value * 100)}% para la marca
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {Math.round((1 - marca.contract_value) * 100)}% para la tienda
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-sm font-medium text-[var(--foreground)]">
                Renta fija: {formatCurrency(marca.contract_value)}/mes
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">La marca paga a la tienda</p>
            </div>
          )}
        </div>

        {marca.bank_account && (
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4">
            <h2 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3">
              Cuenta bancaria
            </h2>
            <div className="flex items-start gap-2 text-sm text-[var(--foreground)]">
              <CreditCard size={14} className="text-[var(--muted-foreground)] mt-0.5 flex-shrink-0" />
              <span className="font-mono">{marca.bank_account}</span>
            </div>
          </div>
        )}

        {marca.notes && (
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 sm:col-span-2">
            <h2 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3">
              Notas
            </h2>
            <div className="flex items-start gap-2 text-sm text-[var(--foreground)]">
              <FileText size={14} className="text-[var(--muted-foreground)] mt-0.5 flex-shrink-0" />
              <p className="whitespace-pre-wrap">{marca.notes}</p>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={`Editar ${marca.name}`}
        size="lg"
      >
        <MarcaForm
          defaultValues={marca}
          onSubmit={handleEdit}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>
    </div>
  );
}
