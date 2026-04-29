"use client";

import { useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, Loader2, Tag, X } from "lucide-react";
import { useVariantesBySku } from "@/hooks/use-productos";
import { Button } from "@/components/ui/button";
import { DEFAULT_SHEET, SHEET_CONFIGS, type SheetConfig } from "@/lib/etiquetas/sheet-configs";
import { generateLabelsPdf, type LabelData } from "@/lib/etiquetas/generate-pdf";
import { formatCurrency } from "@/lib/utils";

export default function EtiquetasPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [generating, setGenerating] = useState(false);

  // SKUs recibidos por URL (?skus=A,B,C)
  const initialSkus = useMemo(() => {
    const raw = searchParams.get("skus") ?? "";
    return raw ? raw.split(",").filter(Boolean) : [];
  }, [searchParams]);

  const [selectedSkus, setSelectedSkus] = useState<string[]>(initialSkus);
  const [startAt, setStartAt] = useState(1);
  const [sheet] = useState<SheetConfig>(DEFAULT_SHEET);

  const { data: variantes = [], isLoading } = useVariantesBySku(selectedSkus);

  const labelsPerPage = sheet.cols * sheet.rows;

  // Mapa sku → datos de etiqueta (preserva el orden de selectedSkus)
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

  function removeLabel(sku: string) {
    setSelectedSkus((prev) => prev.filter((s) => s !== sku));
  }

  async function handleGenerate() {
    if (labels.length === 0 || generating) return;
    setGenerating(true);
    try {
      await generateLabelsPdf(labels, sheet, startAt);
    } finally {
      setGenerating(false);
    }
  }

  // Posiciones en la hoja para el preview visual
  // startAt-1 primeras celdas = vacías, luego labels.length celdas llenas
  const totalCells = Math.max(
    labelsPerPage,
    startAt - 1 + labels.length
  );
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
        {/* ─── Panel izquierdo: preview de hoja ───────────────────────── */}
        <div className="flex-1 min-w-0">
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4">
            <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3">
              Vista previa · Hoja 1
            </p>

            {/* Grid de etiquetas (solo muestra página 1) */}
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
                      relative rounded border text-[10px] cursor-pointer transition-all select-none
                      ${labelHeightClass(sheet)}
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

        {/* ─── Panel derecho: controles ───────────────────────────────── */}
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

          {/* Formato de hoja */}
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4">
            <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-2">
              Formato de hoja
            </p>
            <p className="text-sm text-[var(--foreground)]">{sheet.name}</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              {sheet.cols} × {sheet.rows} = {labelsPerPage} etiquetas
            </p>
          </div>

          {/* Lista de etiquetas seleccionadas */}
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 flex flex-col gap-2">
            <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
              Etiquetas ({labels.length})
            </p>

            {isLoading ? (
              <div className="flex items-center gap-2 py-3 text-sm text-[var(--muted-foreground)]">
                <Loader2 size={14} className="animate-spin" />
                Cargando...
              </div>
            ) : labels.length === 0 ? (
              <div className="py-3 text-xs text-[var(--muted-foreground)] text-center">
                <Tag size={20} className="mx-auto mb-1 opacity-30" />
                Sin etiquetas seleccionadas
              </div>
            ) : (
              <ul className="flex flex-col gap-1 max-h-72 overflow-y-auto">
                {labels.map((l) => (
                  <li
                    key={l.sku}
                    className="flex items-center justify-between gap-2 text-xs py-1 px-2 rounded hover:bg-[var(--muted)] group"
                  >
                    <div className="min-w-0">
                      <div className="font-mono font-bold text-[var(--foreground)] truncate">{l.sku}</div>
                      <div className="text-[var(--muted-foreground)] truncate">{l.name}</div>
                    </div>
                    <button
                      onClick={() => removeLabel(l.sku)}
                      className="text-[var(--muted-foreground)] hover:text-[var(--destructive)] opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                    >
                      <X size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Botón generar */}
          <Button
            onClick={handleGenerate}
            disabled={labels.length === 0 || generating}
            size="lg"
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
        </div>
      </div>
    </div>
  );
}

/** Devuelve la clase de altura proporcional al aspecto de la etiqueta para el preview */
function labelHeightClass(sheet: SheetConfig): string {
  // Ratio ≈ 0.38 para Avery 5160 (25.4/66.675)
  // Usamos un padding-top % trick vía clase fija
  return "h-14";
}
