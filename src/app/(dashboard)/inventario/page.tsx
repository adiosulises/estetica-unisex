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

  // Cargamos TODOS los productos siempre para que la selección de etiquetas
  // no se pierda al cambiar el filtro de marca (el filtro se aplica client-side)
  const { data: productos = [], isLoading } = useProductos();
  const { data: marcas = [] } = useMarcas();

  const filtered = productos.filter((p) => {
    const matchesBrand = !brandId || p.brand_id === brandId;

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

    return matchesBrand && matchesSearch && matchesStock;
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
    <div className="p-6 max-w-6xl mx-auto pb-28">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Inventario</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            {filtered.length} producto{filtered.length !== 1 ? "s" : ""} · {totalVariantes} variante{totalVariantes !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {printMode ? (
            <Button variant="secondary" onClick={exitPrintMode}>
              <X size={15} />
              Cancelar
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => setPrintMode(true)}>
              <Tag size={15} />
              Etiquetas
            </Button>
          )}
          <Link href="/inventario/nuevo">
            <Button>
              <Plus size={16} />
              Alta en batch
            </Button>
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {printMode && (
          <button
            onClick={toggleAll}
            className="text-sm text-[var(--primary)] hover:underline"
          >
            {selectedIds.size === filtered.length ? "Deseleccionar todo" : "Seleccionar todo"}
          </button>
        )}

        <div className="relative flex-1 min-w-48 max-w-xs">
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
          className="px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] appearance-none cursor-pointer"
        >
          <option value="">Todas las marcas</option>
          {marcas.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>

        <div className="flex rounded-lg border border-[var(--border)] overflow-hidden text-sm">
          {(["all", "low", "out"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStockFilter(s)}
              className={`px-3 py-2 transition-colors ${
                stockFilter === s
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--background)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
              }`}
            >
              {s === "all" ? "Todos" : s === "low" ? "Stock bajo" : "Agotados"}
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
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                {printMode && (
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filtered.length && filtered.length > 0}
                      onChange={toggleAll}
                      className="rounded accent-[var(--primary)]"
                    />
                  </th>
                )}
                <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)]">Producto</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)]">Marca</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)]">Categoría</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)]">Precio</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)]">Variantes</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)]">Stock</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((producto, i) => {
                const variants = producto.product_variants ?? [];
                const status = getProductStockStatus(variants);
                const totalStock = variants.reduce((s, v) => s + v.stock, 0);
                const isSelected = selectedIds.has(producto.id);

                return (
                  <tr
                    key={producto.id}
                    className={`transition-colors ${
                      i < filtered.length - 1 ? "border-b border-[var(--border)]" : ""
                    } ${
                      printMode
                        ? isSelected
                          ? "bg-[var(--primary)]/5 cursor-pointer"
                          : "hover:bg-[var(--muted)] cursor-pointer"
                        : "hover:bg-[var(--muted)] cursor-pointer"
                    }`}
                    onClick={() => printMode && toggleProduct(producto)}
                  >
                    {printMode && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleProduct(producto)}
                          className="rounded accent-[var(--primary)]"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      {printMode ? (
                        <div className="flex items-center gap-3">
                          {producto.photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={producto.photo_url}
                              alt={producto.name}
                              className="w-9 h-9 rounded-lg object-cover border border-[var(--border)] flex-shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-[var(--muted)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
                              <Package size={16} className="text-[var(--muted-foreground)]" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-[var(--foreground)]">{producto.name}</div>
                            <div className="text-xs text-[var(--muted-foreground)] font-mono">{producto.sku_prefix}</div>
                          </div>
                        </div>
                      ) : (
                        <Link href={`/inventario/${producto.id}`} className="block">
                          <div className="flex items-center gap-3">
                            {producto.photo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={producto.photo_url}
                                alt={producto.name}
                                className="w-9 h-9 rounded-lg object-cover border border-[var(--border)] flex-shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-[var(--muted)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
                                <Package size={16} className="text-[var(--muted-foreground)]" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-[var(--foreground)]">{producto.name}</div>
                              <div className="text-xs text-[var(--muted-foreground)] font-mono">{producto.sku_prefix}</div>
                            </div>
                          </div>
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">
                      {producto.brand?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">
                      {producto.category}
                    </td>
                    <td className="px-4 py-3 text-[var(--foreground)]">
                      {formatCurrency(producto.base_price)}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">
                      {variants.length}
                    </td>
                    <td className="px-4 py-3">
                      <StockBadge status={status} stock={totalStock} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Barra flotante de selección para etiquetas */}
      {printMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-4 bg-[var(--foreground)] text-[var(--background)] rounded-2xl px-5 py-3 shadow-2xl">
            <Tag size={16} />
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {selectedIds.size} producto{selectedIds.size !== 1 ? "s" : ""} ·{" "}
                {selectedSkus.length} etiqueta{selectedSkus.length !== 1 ? "s" : ""}
              </span>
              {/* Aviso si hay selección de marcas ocultas por el filtro activo */}
              {brandId && selectedIds.size > filtered.filter((p) => selectedIds.has(p.id)).length && (
                <span className="text-[11px] opacity-60">
                  Incluye selección de otras marcas
                </span>
              )}
            </div>
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
