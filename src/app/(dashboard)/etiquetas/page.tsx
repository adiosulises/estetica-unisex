"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Download, Loader2, Tag, X, Printer,
  Plus, Minus, Search, CheckCircle2, Clock,
} from "lucide-react";
import { useVariantesBySku } from "@/hooks/use-productos";
import { useSearchVariantes, useDebounce } from "@/hooks/use-pos";
import { Button } from "@/components/ui/button";
import { DEFAULT_SHEET, type SheetConfig } from "@/lib/etiquetas/sheet-configs";
import { generateLabelsPdf, printLabelsPdf, type LabelData } from "@/lib/etiquetas/generate-pdf";
import { markPrinted, getPrintedRecord } from "@/lib/etiquetas/print-history";
import { formatCurrency } from "@/lib/utils";

export default function EtiquetasPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [generating, setGenerating] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [sheet] = useState<SheetConfig>(DEFAULT_SHEET);
  const [startAt, setStartAt] = useState(1);

  // ── SKUs seleccionados (permite duplicados para imprimir varias copias) ──────
  const initialSkus = useMemo(() => {
    const raw = searchParams.get("skus") ?? "";
    return raw ? raw.split(",").filter(Boolean) : [];
  }, [searchParams]);

  const [selectedSkus, setSelectedSkus] = useState<string[]>(initialSkus);

  // ── Búsqueda para agregar más etiquetas ──────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 250);
  const { data: searchResults = [], isFetching: searching } = useSearchVariantes(debouncedSearch);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Historial de impresión (localStorage) ────────────────────────────────────
  const [printedRecord, setPrintedRecord] = useState<Record<string, string>>({});
  useEffect(() => { setPrintedRecord(getPrintedRecord()); }, []);

  // ── Scroll preservation al eliminar ─────────────────────────────────────────
  const listRef = useRef<HTMLUListElement>(null);

  // ── Unique SKUs para la query (sin duplicados) ───────────────────────────────
  const uniqueSkus = useMemo(() => [...new Set(selectedSkus)], [selectedSkus]);
  const { data: variantes = [] } = useVariantesBySku(uniqueSkus);

  const labelsPerPage = sheet.cols * sheet.rows;

  // ── LabelData expandida respetando duplicados ─────────────────────────────────
  const labels: LabelData[] = useMemo(() => {
    const map = new Map(variantes.map((v) => [v.sku, v]));
    return selectedSkus
      .map((sku) => {
        const v = map.get(sku);
        if (!v) return null;
        return {
          sku: v.sku,
          name: v.productName,
          brand: v.brandName,
          size: v.size,
          color: v.color,
          price: v.price ?? v.basePrice,
        } satisfies LabelData;
      })
      .filter((l): l is LabelData => l !== null);
  }, [selectedSkus, variantes]);

  // ── Grupos para la lista UI: {sku, qty} ──────────────────────────────────────
  const skuGroups = useMemo(() => {
    const counts = new Map<string, number>();
    for (const sku of selectedSkus) counts.set(sku, (counts.get(sku) ?? 0) + 1);
    const seen = new Set<string>();
    return selectedSkus
      .filter((sku) => { if (seen.has(sku)) return false; seen.add(sku); return true; })
      .map((sku) => {
        const v = variantes.find((x) => x.sku === sku);
        return {
          sku,
          qty: counts.get(sku)!,
          name: v?.productName ?? sku,
          price: v ? (v.price ?? v.basePrice) : 0,
          lastPrinted: printedRecord[sku] ?? null,
        };
      });
  }, [selectedSkus, variantes, printedRecord]);

  // ── Agregar / quitar copias ───────────────────────────────────────────────────
  function addCopy(sku: string) {
    setSelectedSkus((prev) => [...prev, sku]);
  }

  function removeCopy(sku: string) {
    // Guarda scroll antes de que React actualice el DOM
    const scrollTop = listRef.current?.scrollTop ?? 0;
    setSelectedSkus((prev) => {
      const idx = prev.lastIndexOf(sku);
      if (idx === -1) return prev;
      return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
    });
    // Restaura scroll después del repaint
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = scrollTop;
    });
  }

  // ── Generar / imprimir ────────────────────────────────────────────────────────
  async function handleDownload() {
    if (labels.length === 0 || generating) return;
    setGenerating(true);
    try {
      await generateLabelsPdf(labels, sheet, startAt);
      const printed = labels.map((l) => l.sku);
      markPrinted(printed);
      setPrintedRecord(getPrintedRecord());
    } finally {
      setGenerating(false);
    }
  }

  async function handlePrint() {
    if (labels.length === 0 || printing) return;
    setPrinting(true);
    try {
      await printLabelsPdf(labels, sheet, startAt);
      const printed = labels.map((l) => l.sku);
      markPrinted(printed);
      setPrintedRecord(getPrintedRecord());
    } finally {
      setPrinting(false);
    }
  }

  // ── Abrir buscador ────────────────────────────────────────────────────────────
  function openSearch() {
    setShowSearch(true);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }

  // ── Preview (sólo hoja 1) ────────────────────────────────────────────────────
  const totalCells = Math.max(labelsPerPage, startAt - 1 + labels.length);
  const pages = Math.ceil(totalCells / labelsPerPage);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6 transition-colors"
      >
        <ArrowLeft size={15} />
        Volver
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Imprimir etiquetas</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
          {labels.length} etiqueta{labels.length !== 1 ? "s" : ""} ·{" "}
          {pages} hoja{pages !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="flex gap-6 items-start">
        {/* ─── Panel izquierdo: preview ────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4">
            <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3">
              Vista previa · Hoja 1
            </p>

            <div
              className="grid gap-1 w-full"
              style={{ gridTemplateColumns: `repeat(${sheet.cols}, 1fr)` }}
            >
              {Array.from({ length: labelsPerPage }).map((_, pos) => {
                const labelIndex = pos - (startAt - 1);
                const isFilled = labelIndex >= 0 && labelIndex < labels.length;
                const label = isFilled ? labels[labelIndex] : null;
                const isStart = pos === startAt - 1;

                return (
                  <div
                    key={pos}
                    onClick={() => setStartAt(pos + 1)}
                    title={isFilled ? undefined : `Iniciar en posición ${pos + 1}`}
                    className={`
                      relative rounded border text-[10px] cursor-pointer transition-all select-none h-14
                      ${isFilled
                        ? "border-[var(--primary)] bg-[var(--primary)]/5"
                        : isStart
                          ? "border-dashed border-[var(--primary)] bg-[var(--primary)]/10"
                          : "border-dashed border-[var(--border)] hover:border-[var(--primary)]/50 hover:bg-[var(--muted)]"
                      }
                    `}
                  >
                    {isFilled && label ? (
                      <div className="p-1 h-full flex flex-col justify-between overflow-hidden">
                        <span className="font-mono font-bold text-[9px] text-[var(--foreground)] leading-tight truncate">
                          {label.sku}
                        </span>
                        <span className="text-[8px] text-[var(--muted-foreground)] truncate leading-tight">
                          {label.name}
                        </span>
                        <span className="text-[9px] font-semibold text-[var(--foreground)]">
                          {formatCurrency(label.price)}
                        </span>
                      </div>
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] text-[var(--border)] font-mono">
                        {pos + 1}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {pages > 1 && (
              <p className="text-xs text-[var(--muted-foreground)] mt-3 text-center">
                + {pages - 1} hoja{pages - 1 > 1 ? "s" : ""} adicional{pages - 1 > 1 ? "es" : ""}
              </p>
            )}
          </div>

          <p className="text-xs text-[var(--muted-foreground)] mt-2 text-center">
            Haz clic en una celda vacía para mover el inicio ahí
          </p>
        </div>

        {/* ─── Panel derecho: controles ─────────────────────────────────── */}
        <div className="w-72 flex flex-col gap-4">

          {/* Posición de inicio */}
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4">
            <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3">
              Empezar en posición
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStartAt((n) => Math.max(1, n - 1))}
                className="w-8 h-8 rounded-lg border border-[var(--border)] flex items-center justify-center text-lg font-bold text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors disabled:opacity-40"
                disabled={startAt <= 1}
              >
                −
              </button>
              <span className="flex-1 text-center text-2xl font-bold font-mono text-[var(--foreground)]">
                {startAt}
              </span>
              <button
                onClick={() => setStartAt((n) => Math.min(labelsPerPage, n + 1))}
                className="w-8 h-8 rounded-lg border border-[var(--border)] flex items-center justify-center text-lg font-bold text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors disabled:opacity-40"
                disabled={startAt >= labelsPerPage}
              >
                +
              </button>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mt-2 text-center">
              de {labelsPerPage} por hoja
            </p>
          </div>

          {/* Lista de etiquetas */}
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
                Etiquetas ({labels.length})
              </p>
              <button
                onClick={openSearch}
                className="flex items-center gap-1 text-xs text-[var(--primary)] hover:underline"
              >
                <Plus size={12} />
                Agregar
              </button>
            </div>

            {/* Buscador inline */}
            {showSearch && (
              <div className="relative">
                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] focus-within:ring-2 focus-within:ring-[var(--primary)]">
                  <Search size={12} className="text-[var(--muted-foreground)] shrink-0" />
                  <input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="SKU o nombre..."
                    className="flex-1 text-xs bg-transparent outline-none text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                  />
                  {searching && <Loader2 size={11} className="animate-spin text-[var(--muted-foreground)] shrink-0" />}
                  <button
                    onClick={() => { setShowSearch(false); setSearchQuery(""); }}
                    className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  >
                    <X size={11} />
                  </button>
                </div>

                {searchResults.length > 0 && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                    {searchResults.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          addCopy(r.sku);
                          setSearchQuery("");
                          searchInputRef.current?.focus();
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-[var(--muted)] transition-colors border-b border-[var(--border)] last:border-0"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-mono font-bold text-[var(--foreground)] truncate">{r.sku}</p>
                            <p className="text-[10px] text-[var(--muted-foreground)] truncate">{r.productName}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-semibold text-[var(--foreground)]">
                              {formatCurrency(r.price ?? r.basePrice)}
                            </p>
                            <p className="text-[10px] text-[var(--muted-foreground)]">stock {r.stock}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {debouncedSearch.length > 0 && !searching && searchResults.length === 0 && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-sm px-3 py-2">
                    <p className="text-xs text-[var(--muted-foreground)]">Sin resultados</p>
                  </div>
                )}
              </div>
            )}

            {/* Lista de grupos */}
            {skuGroups.length === 0 ? (
              <div className="py-4 text-xs text-[var(--muted-foreground)] text-center">
                <Tag size={20} className="mx-auto mb-1 opacity-30" />
                Sin etiquetas seleccionadas
              </div>
            ) : (
              <ul
                ref={listRef}
                className="flex flex-col gap-0.5 max-h-64 overflow-y-auto -mx-1 px-1"
              >
                {skuGroups.map((g) => (
                  <li
                    key={g.sku}
                    className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg hover:bg-[var(--muted)] group"
                  >
                    {/* Indicador de impresión */}
                    {g.lastPrinted ? (
                      <CheckCircle2
                        size={12}
                        className="text-green-500 shrink-0 cursor-help"
                        aria-label={`Última impresión: ${new Date(g.lastPrinted).toLocaleDateString("es-MX", { dateStyle: "short" })}`}
                      />
                    ) : (
                      <Clock
                        size={12}
                        className="text-[var(--muted-foreground)] opacity-0 group-hover:opacity-50 shrink-0 transition-opacity"
                      />
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-mono font-bold text-[var(--foreground)] truncate">{g.sku}</div>
                      <div className="text-[var(--muted-foreground)] truncate">{g.name}</div>
                    </div>

                    {/* Controles de cantidad */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => removeCopy(g.sku)}
                        className="w-5 h-5 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--destructive)] hover:bg-[var(--destructive)]/10 transition-colors"
                        title="Quitar una copia"
                      >
                        <Minus size={10} />
                      </button>
                      <span className="w-5 text-center font-bold text-[var(--foreground)]">{g.qty}</span>
                      <button
                        onClick={() => addCopy(g.sku)}
                        className="w-5 h-5 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
                        title="Agregar una copia más"
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Leyenda de íconos */}
            {skuGroups.some((g) => g.lastPrinted) && (
              <p className="text-[10px] text-[var(--muted-foreground)] flex items-center gap-1 pt-1 border-t border-[var(--border)]">
                <CheckCircle2 size={10} className="text-green-500" />
                = ya impresa anteriormente
              </p>
            )}
          </div>

          {/* Botones de acción */}
          <Button
            onClick={handlePrint}
            disabled={labels.length === 0 || printing || generating}
            size="lg"
            className="w-full"
          >
            {printing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Preparando...
              </>
            ) : (
              <>
                <Printer size={16} />
                Imprimir
              </>
            )}
          </Button>

          <Button
            onClick={handleDownload}
            disabled={labels.length === 0 || generating || printing}
            size="lg"
            variant="secondary"
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generando PDF...
              </>
            ) : (
              <>
                <Download size={16} />
                Descargar PDF
              </>
            )}
          </Button>

          {/* Formato de hoja */}
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-3">
            <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-1">
              Formato de hoja
            </p>
            <p className="text-sm text-[var(--foreground)]">{sheet.name}</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              {sheet.cols} × {sheet.rows} = {labelsPerPage} etiquetas por hoja
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
