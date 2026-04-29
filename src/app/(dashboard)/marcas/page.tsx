"use client";

import { useState } from "react";
import { Plus, Search, Building2 } from "lucide-react";
import { useMarcas, useCreateMarca, useUpdateMarca, useToggleMarcaActiva } from "@/hooks/use-marcas";
import { Modal } from "@/components/ui/modal";
import { MarcaForm } from "@/components/marcas/marca-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { Marca } from "@/types/marcas";
import type { MarcaFormValues } from "@/lib/validations/marcas";

export default function MarcasPage() {
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Marca | null>(null);

  const { data: marcas = [], isLoading } = useMarcas(showInactive);
  const createMarca = useCreateMarca();
  const updateMarca = useUpdateMarca(editing?.id ?? "");
  const toggleActiva = useToggleMarcaActiva();

  const filtered = marcas.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.contact_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(marca: Marca) {
    setEditing(marca);
    setModalOpen(true);
  }

  async function handleSubmit(values: MarcaFormValues) {
    if (editing) {
      await updateMarca.mutateAsync(values);
    } else {
      await createMarca.mutateAsync(values);
    }
    setModalOpen(false);
    setEditing(null);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Marcas</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            {marcas.length} marca{marcas.length !== 1 ? "s" : ""} registrada{marcas.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} />
          Nueva marca
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            placeholder="Buscar marca..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded"
          />
          Mostrar inactivas
        </label>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-sm text-[var(--muted-foreground)] py-12 text-center">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 size={40} className="text-[var(--muted-foreground)] mb-3 opacity-40" />
          <p className="text-sm text-[var(--muted-foreground)]">
            {search ? "Sin resultados para tu búsqueda" : "Todavía no hay marcas registradas"}
          </p>
          {!search && (
            <Button onClick={openCreate} variant="secondary" size="sm" className="mt-3">
              Registrar primera marca
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)]">Marca</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)]">Contacto</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)]">Contrato</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)]">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((marca, i) => (
                <tr
                  key={marca.id}
                  className={i < filtered.length - 1 ? "border-b border-[var(--border)]" : ""}
                >
                  <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                    {marca.name}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">
                    <div>{marca.contact_name ?? "—"}</div>
                    {marca.contact_phone && (
                      <div className="text-xs mt-0.5">{marca.contact_phone}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">
                    {marca.contract_type === "pct" ? (
                      <span>{Math.round(marca.contract_value * 100)}% para la marca</span>
                    ) : (
                      <span>Piso — {formatCurrency(marca.contract_value)}/mes</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={marca.is_active ? "success" : "outline"}>
                      {marca.is_active ? "Activa" : "Inactiva"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEdit(marca)}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          toggleActiva.mutate({ id: marca.id, is_active: !marca.is_active })
                        }
                      >
                        {marca.is_active ? "Desactivar" : "Activar"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        title={editing ? `Editar ${editing.name}` : "Nueva marca"}
        size="lg"
      >
        <MarcaForm
          defaultValues={editing ?? undefined}
          onSubmit={handleSubmit}
          onCancel={() => { setModalOpen(false); setEditing(null); }}
        />
      </Modal>
    </div>
  );
}
