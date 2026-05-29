"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Package, Tag, X } from "lucide-react";
import { useProductos } from "@/hooks/use-productos";
import { useMarcas } from "@/hooks/use-marcas";
import { StockBadge } from "@/components/inventario/stock-badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { getProductStockStatus } from "@/types/inventario";
import type { Producto } from "@/types/inventario";

export default function InventarioPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [brandId, setBrandId] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");

  // Modo de selección para imprimir etiquetas
  const [printMode, setPrintMode] = useState(false);
  // Set de product IDs seleccionados para etiquetas
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: productos = [], isLoading } = useProductos({ brandId: brandId || undefined });
  const { data: marcas = [] } = useMarcas();

  const filtered = productos.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku_prefix.toLowerCase().includes(search.toLowerCase()) ||
      (p.brand?.name ?? "").toLowerCase().includes(search.toLowerCase());

    const variants = p.product_variants ?? [];
    const status = getProductStockStatus(variants);

    const matchesStock =
      stockFilter === "all" ||
      (stockFilter === "low" && status === "low") ||
      (stockFilter === "out" && status === "out");

    return matchesSearch && matchesStock;
  });

  const totalVariantes = filtered.reduce(
    (acc, p) => acc + (p.product_variants?.length ?? 0),
    0
  );

  // SKUs de los productos seleccionados (todas sus variantes)
  const selectedSkus = productos
    .filter((p) => selectedIds.has(p.id))
    .flatMap((p) => (p.product_variants ?? []).map((v) => v.sku));

  function toggleProduct(p: Producto) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(p.id)) next.delete(p.id);
      else next.add(p.id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((p) => p.id)));
    }
  }

  function exitPrintMode() {
    setPrintMode(false);
    setSelectedIds(new Set());
  }

  function handlePrintSelected() {
    if (selectedSkus.length === 0) return;
    router.push(`/etiquetas?skus=${selectedSkus.join(",")}`);
  }

  return (
    <div className="px-4 py-6 pb-28 max-w-4xl mx-auto flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">Inventario</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            {filtered.length} producto{filtered.length !== 1 ? "s" : ""} · {totalVariantes} variante{totalVariantes !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {printMode ? (
            <Button variant="secondary" size="sm" onClick={exitPrintMode}>
              <X size={15} />
              Cancelar
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setPrintMode(true)}>
              <Tag size={15} />
              Etiquetas
            </Button>
          )}
          <Link href="/inventario/nuevo">
            <Button size="sm">
              <Plus size={16} />
              Alta
            </Button>
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {printMode && (
          <button
            onClick={toggleAll}
            className="text-sm text-[var(--primary)] hover:underline w-fit"
          >
            {selectedIds.size === filtered.length ? "Deseleccionar todo" : "Seleccionar todo"}
          </button>
        )}
        <div className="relative flex-1 min-w-0">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            placeholder="Buscar producto o SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          />
        </div>
        <select
          value={brandId}
          onChange={(e) => setBrandId(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] appearance-none cursor-pointer"
        >
          <option value="">Todas las marcas</option>
          {marcas.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <div className="flex rounded-lg border border-[var(--border)] overflow-hidden text-sm w-full sm:w-auto">
          {(["all", "low", "out"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStockFilter(s)}
              className={`flex-1 sm:flex-none px-3 py-2 transition-colors ${
                stockFilter === s
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--background)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
              }`}
            >
              {s === "all" ? "Todos" : s === "low" ? "Bajo" : "Agotados"}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-[var(--muted-foreground)] py-12 text-center">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Package size={40} className="text-[var(--muted-foreground)] mb-3 opacity-40" />
          <p className="text-sm text-[var(--muted-foreground)]">
            {search || brandId || stockFilter !== "all"
              ? "Sin resultados para los filtros aplicados"
              : "No hay productos en inventario"}
          </p>
          {!search && !brandId && stockFilter === "all" && (
            <Link href="/inventario/nuevo">
              <Button variant="secondary" size="sm" className="mt-3">
                Agregar primer batch
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
          {filtered.map((producto, i) => {
            const variants = producto.product_variants ?? [];
            const status = getProductStockStatus(variants);
            const totalStock = variants.reduce((s, v) => s + v.stock, 0);
            const isSelected = selectedIds.has(producto.id);

            const inner = (
              <div className="flex items-center gap-3">
                {printMode && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleProduct(producto)}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded accent-[var(--primary)] flex-shrink-0"
                  />
                )}
                {producto.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={producto.photo_url}
                    alt={producto.name}
                    className="w-11 h-11 rounded-xl object-cover border border-[var(--border)] flex-shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-[var(--muted)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
                    <Package size={18} className="text-[var(--muted-foreground)]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--foreground)] truncate">{producto.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)] font-mono">{producto.sku_prefix}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {[producto.brand?.name, producto.category].filter(Boolean).join(" · ")}
                    {variants.length > 0 && ` · ${variants.length} var.`}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-sm font-bold font-mono text-[var(--foreground)]">
                    {formatCurrency(producto.base_price)}
                  </span>
                  <StockBadge status={status} stock={totalStock} />
                </div>
              </div>
            );

            return (
              <div
                key={producto.id}
                className={`px-4 py-3 transition-colors ${
                  i < filtered.length - 1 ? "border-b border-[var(--border)]" : ""
                } ${
                  printMode
                    ? isSelected ? "bg-[var(--primary)]/5 cursor-pointer" : "hover:bg-[var(--muted)] cursor-pointer"
                    : "hover:bg-[var(--muted)]/50"
                }`}
                onClick={() => printMode && toggleProduct(producto)}
              >
                {printMode ? inner : (
                  <Link href={`/inventario/${producto.id}`} className="block">
                    {inner}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Barra flotante de selección para etiquetas */}
      {printMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-4 bg-[var(--foreground)] text-[var(--background)] rounded-2xl px-5 py-3 shadow-2xl">
            <Tag size={16} />
            <span className="text-sm font-medium">
              {selectedIds.size} producto{selectedIds.size !== 1 ? "s" : ""} ·{" "}
              {selectedSkus.length} variante{selectedSkus.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={handlePrintSelected}
              className="bg-white text-black text-sm font-semibold px-4 py-1.5 rounded-xl hover:bg-white/90 transition-colors"
            >
              Imprimir etiquetas →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
