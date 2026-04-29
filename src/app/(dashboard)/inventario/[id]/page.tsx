"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Plus, Tag } from "lucide-react";
import { useProducto, useUpdateVariante, useUpdateProducto, useAddVariante } from "@/hooks/use-productos";
import { StockBadge } from "@/components/inventario/stock-badge";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { getStockStatus } from "@/types/inventario";
import type { Variante } from "@/types/inventario";

export default function ProductoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [editingVariant, setEditingVariant] = useState<Variante | null>(null);
  const [addingVariant, setAddingVariant] = useState(false);

  const { data: producto, isLoading, error } = useProducto(id);
  const updateVariante = useUpdateVariante();
  const updateProducto = useUpdateProducto(id);
  const addVariante = useAddVariante(id);

  if (isLoading) return <div className="p-6 text-sm text-[var(--muted-foreground)]">Cargando...</div>;
  if (error || !producto) return (
    <div className="p-6">
      <p className="text-sm text-[var(--destructive)]">Producto no encontrado.</p>
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="mt-2">Volver</Button>
    </div>
  );

  const variants = producto.product_variants ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6 transition-colors"
      >
        <ArrowLeft size={15} />
        Volver a inventario
      </button>

      {/* Header del producto */}
      <div className="flex gap-5 mb-6">
        {producto.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={producto.photo_url}
            alt={producto.name}
            className="w-28 h-28 rounded-xl object-cover border border-[var(--border)] flex-shrink-0"
          />
        ) : (
          <div className="w-28 h-28 rounded-xl bg-[var(--muted)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
            <Tag size={32} className="text-[var(--muted-foreground)] opacity-40" />
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">{producto.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="font-mono text-sm text-[var(--muted-foreground)] bg-[var(--muted)] px-2 py-0.5 rounded">
              {producto.sku_prefix}
            </span>
            <span className="text-sm text-[var(--muted-foreground)]">{producto.category}</span>
            {producto.brand?.name && (
              <span className="text-sm text-[var(--muted-foreground)]">· {producto.brand.name}</span>
            )}
          </div>
          <div className="mt-2 text-lg font-semibold text-[var(--foreground)]">
            {formatCurrency(producto.base_price)}
          </div>
          {producto.description && (
            <p className="text-sm text-[var(--muted-foreground)] mt-1">{producto.description}</p>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push(`/etiquetas?skus=${variants.map((v) => v.sku).join(",")}`)}
          >
            <Tag size={14} />
            Etiquetas
          </Button>
        </div>
      </div>

      {/* Tabla de variantes */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">
          Variantes ({variants.length})
        </h2>
        <Button size="sm" variant="secondary" onClick={() => setAddingVariant(true)}>
          <Plus size={14} />
          Agregar variante
        </Button>
      </div>

      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
              <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)]">SKU</th>
              <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)]">Talla</th>
              <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)]">Color</th>
              <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)]">Precio</th>
              <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)]">Stock</th>
              <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)]">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {variants.map((v, i) => (
              <tr key={v.id} className={i < variants.length - 1 ? "border-b border-[var(--border)]" : ""}>
                <td className="px-4 py-3 font-mono text-xs text-[var(--foreground)]">{v.sku}</td>
                <td className="px-4 py-3 text-[var(--foreground)]">{v.size ?? "—"}</td>
                <td className="px-4 py-3 text-[var(--muted-foreground)]">{v.color ?? "—"}</td>
                <td className="px-4 py-3 text-[var(--foreground)]">
                  {v.price != null ? formatCurrency(v.price) : (
                    <span className="text-[var(--muted-foreground)] text-xs">Base ({formatCurrency(producto.base_price)})</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <InlineStockEdit
                    value={v.stock}
                    onSave={(stock) => updateVariante.mutate({ id: v.id, data: { stock } })}
                  />
                </td>
                <td className="px-4 py-3">
                  <StockBadge status={getStockStatus(v)} />
                </td>
                <td className="px-4 py-3">
                  <Button size="sm" variant="ghost" onClick={() => setEditingVariant(v)}>
                    <Pencil size={13} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal editar variante */}
      <Modal
        open={!!editingVariant}
        onClose={() => setEditingVariant(null)}
        title={`Editar variante — ${editingVariant?.sku}`}
        size="sm"
      >
        {editingVariant && (
          <EditVarianteForm
            variante={editingVariant}
            basePrice={producto.base_price}
            onSave={async (data) => {
              await updateVariante.mutateAsync({ id: editingVariant.id, data });
              setEditingVariant(null);
            }}
            onCancel={() => setEditingVariant(null)}
          />
        )}
      </Modal>

      {/* Modal agregar variante */}
      <Modal
        open={addingVariant}
        onClose={() => setAddingVariant(false)}
        title="Agregar variante"
        size="sm"
      >
        <AddVarianteForm
          basePrice={producto.base_price}
          onSave={async (data) => {
            await addVariante.mutateAsync(data);
            setAddingVariant(false);
          }}
          onCancel={() => setAddingVariant(false)}
        />
      </Modal>
    </div>
  );
}

// ─── Sub-componentes inline ───────────────────────────────────────────────────

function InlineStockEdit({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        min="0"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const n = parseInt(draft, 10);
          if (!isNaN(n) && n >= 0) onSave(n);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setEditing(false);
        }}
        className="w-16 px-2 py-1 text-sm rounded border border-[var(--primary)] bg-[var(--background)] focus:outline-none"
      />
    );
  }

  return (
    <button
      onClick={() => { setDraft(String(value)); setEditing(true); }}
      className="text-[var(--foreground)] hover:text-[var(--primary)] font-medium tabular-nums transition-colors"
      title="Clic para editar stock"
    >
      {value}
    </button>
  );
}

function EditVarianteForm({
  variante,
  basePrice,
  onSave,
  onCancel,
}: {
  variante: Variante;
  basePrice: number;
  onSave: (data: Partial<Variante>) => Promise<void>;
  onCancel: () => void;
}) {
  const [size, setSize] = useState(variante.size ?? "");
  const [color, setColor] = useState(variante.color ?? "");
  const [price, setPrice] = useState(variante.price != null ? String(variante.price) : "");
  const [stock, setStock] = useState(String(variante.stock));
  const [threshold, setThreshold] = useState(String(variante.low_stock_threshold));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave({
      size: size || null,
      color: color || null,
      price: price ? parseFloat(price) : null,
      stock: parseInt(stock, 10),
      low_stock_threshold: parseInt(threshold, 10),
    });
    setSaving(false);
  }

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Talla" value={size} onChange={(e) => setSize(e.target.value)} placeholder="M" />
        <Input label="Color" value={color} onChange={(e) => setColor(e.target.value)} placeholder="Negro" />
      </div>
      <Input
        label={`Precio (vacío = base ${formatCurrency(basePrice)})`}
        type="number"
        step="0.01"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder={String(basePrice)}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Stock" type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} />
        <Input label="Alerta bajo" type="number" min="0" value={threshold} onChange={(e) => setThreshold(e.target.value)} hint="Avisar cuando ≤ este número" />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
      </div>
    </div>
  );
}

function AddVarianteForm({
  basePrice,
  onSave,
  onCancel,
}: {
  basePrice: number;
  onSave: (data: { size?: string; color?: string; price?: number; stock: number; low_stock_threshold: number }) => Promise<void>;
  onCancel: () => void;
}) {
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("1");
  const [threshold, setThreshold] = useState("0");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave({
      size: size || undefined,
      color: color || undefined,
      price: price ? parseFloat(price) : undefined,
      stock: parseInt(stock, 10),
      low_stock_threshold: parseInt(threshold, 10),
    });
    setSaving(false);
  }

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Talla" value={size} onChange={(e) => setSize(e.target.value)} placeholder="M" />
        <Input label="Color" value={color} onChange={(e) => setColor(e.target.value)} placeholder="Negro" />
      </div>
      <Input
        label={`Precio (vacío = base ${formatCurrency(basePrice)})`}
        type="number"
        step="0.01"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder={String(basePrice)}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Stock inicial" type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} />
        <Input label="Alerta bajo" type="number" min="0" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : "Agregar"}</Button>
      </div>
    </div>
  );
}
