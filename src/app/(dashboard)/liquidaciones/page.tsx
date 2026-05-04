"use client";

import { useState } from "react";
import {
  Banknote, CreditCard, ArrowLeftRight, ChevronDown, ChevronUp,
  CheckCircle2, Clock, Loader2, History,
} from "lucide-react";
import {
  usePendingByBrand, usePendingItems, useBrandPayouts, useCreatePayout,
  type BrandPending, type PendingItem,
} from "@/hooks/use-liquidaciones";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

export default function LiquidacionesPage() {
  const { data: brands = [], isLoading } = usePendingByBrand();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState<string | null>(null);

  const totalPending = brands.reduce((s, b) => s + b.pending_amount, 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">Liquidaciones</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {brands.length} {brands.length === 1 ? "marca" : "marcas"} con saldo pendiente
          </p>
        </div>
        {totalPending > 0 && (
          <div className="text-right">
            <p className="text-xs text-[var(--muted-foreground)]">Total pendiente</p>
            <p className="text-lg font-bold font-mono text-[var(--foreground)]">
              {formatCurrency(totalPending)}
            </p>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-[var(--muted-foreground)]" />
        </div>
      ) : brands.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-[var(--muted-foreground)]">
          <CheckCircle2 size={44} className="mb-3 text-green-500 opacity-60" />
          <p className="text-sm">Todo al corriente — sin liquidaciones pendientes</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {brands.map((brand) => (
            <BrandCard
              key={brand.brand_id}
              brand={brand}
              isExpanded={expanded === brand.brand_id}
              showingHistory={showHistory === brand.brand_id}
              onToggle={() => setExpanded(expanded === brand.brand_id ? null : brand.brand_id)}
              onToggleHistory={() => setShowHistory(showHistory === brand.brand_id ? null : brand.brand_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Brand card ───────────────────────────────────────────────────────────────
function BrandCard({
  brand, isExpanded, showingHistory, onToggle, onToggleHistory,
}: {
  brand: BrandPending;
  isExpanded: boolean;
  showingHistory: boolean;
  onToggle: () => void;
  onToggleHistory: () => void;
}) {
  const { data: items = [], isLoading } = usePendingItems(isExpanded ? brand.brand_id : null);
  const { data: history = [] } = useBrandPayouts(showingHistory ? brand.brand_id : null);
  const [showPay, setShowPay] = useState(false);

  return (
    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
      {/* Header row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--muted)]/30 transition-colors text-left"
      >
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">{brand.brand_name}</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
            {brand.item_count} {brand.item_count === 1 ? "artículo vendido" : "artículos vendidos"} ·{" "}
            {brand.contract_type === "pct"
              ? `consigna ${(brand.contract_value * 100).toFixed(0)}%`
              : `renta fija ${formatCurrency(brand.contract_value)}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-bold font-mono text-amber-600">{formatCurrency(brand.pending_amount)}</p>
            <p className="text-xs text-[var(--muted-foreground)]">pendiente</p>
          </div>
          {isExpanded ? <ChevronUp size={16} className="text-[var(--muted-foreground)]" /> : <ChevronDown size={16} className="text-[var(--muted-foreground)]" />}
        </div>
      </button>

      {/* Expanded: pending items */}
      {isExpanded && (
        <div className="border-t border-[var(--border)]">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 size={18} className="animate-spin text-[var(--muted-foreground)]" />
            </div>
          ) : (
            <>
              {/* Items table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[var(--muted)] text-[var(--muted-foreground)]">
                      <th className="text-left px-5 py-2 font-medium">Folio</th>
                      <th className="text-left px-3 py-2 font-medium">Producto</th>
                      <th className="text-right px-3 py-2 font-medium">Cant.</th>
                      <th className="text-right px-5 py-2 font-medium">Monto marca</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {items.map((item) => (
                      <ItemRow key={item.sale_item_id} item={item} />
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[var(--border)]">
                      <td colSpan={3} className="px-5 py-3 text-sm font-semibold text-[var(--foreground)]">Total</td>
                      <td className="px-5 py-3 text-right text-sm font-bold font-mono text-amber-600">
                        {formatCurrency(brand.pending_amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Actions */}
              <div className="px-5 py-3 flex gap-2 border-t border-[var(--border)]">
                <button
                  onClick={onToggleHistory}
                  className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                >
                  <History size={13} />
                  {showingHistory ? "Ocultar historial" : "Ver historial"}
                </button>
                <div className="flex-1" />
                <Button size="sm" onClick={() => setShowPay(true)}>
                  Registrar pago
                </Button>
              </div>

              {/* History */}
              {showingHistory && history.length > 0 && (
                <div className="border-t border-[var(--border)] px-5 py-3 flex flex-col gap-2">
                  <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
                    Pagos anteriores
                  </p>
                  {history.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="text-[var(--foreground)] font-medium">
                          {p.period_start} → {p.period_end}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">
                          {p.payment_method === "cash"     ? <Banknote size={11} />       : null}
                          {p.payment_method === "card"     ? <CreditCard size={11} />     : null}
                          {p.payment_method === "transfer" ? <ArrowLeftRight size={11} /> : null}
                          {p.payment_method === "cash" ? "Efectivo" : p.payment_method === "card" ? "Tarjeta" : "Transferencia"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold font-mono text-[var(--foreground)]">{formatCurrency(p.brand_amount)}</p>
                        <p className="text-xs text-green-600 flex items-center justify-end gap-1">
                          <CheckCircle2 size={10} /> Pagado
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pay modal */}
              {showPay && (
                <PayModal
                  brand={brand}
                  items={items}
                  onClose={() => setShowPay(false)}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ItemRow({ item }: { item: PendingItem }) {
  const date = item.sale_date
    ? new Date(item.sale_date).toLocaleDateString("es-MX", { dateStyle: "short", timeZone: "America/Hermosillo" })
    : "—";
  return (
    <tr className="hover:bg-[var(--muted)]/20">
      <td className="px-5 py-2 font-mono text-[var(--muted-foreground)]">{item.sale_folio}</td>
      <td className="px-3 py-2">
        <p className="text-[var(--foreground)]">{item.product_name}</p>
        <p className="text-[var(--muted-foreground)]">{item.variant_sku} · {date}</p>
      </td>
      <td className="px-3 py-2 text-right text-[var(--foreground)]">{item.quantity}</td>
      <td className="px-5 py-2 text-right font-mono font-medium text-[var(--foreground)]">
        {formatCurrency(item.brand_amount)}
      </td>
    </tr>
  );
}

// ─── Pay modal ────────────────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  { value: "cash",     label: "Efectivo",       icon: Banknote },
  { value: "transfer", label: "Transferencia",  icon: ArrowLeftRight },
  { value: "card",     label: "Tarjeta",        icon: CreditCard },
];

function PayModal({
  brand, items, onClose,
}: {
  brand: BrandPending;
  items: PendingItem[];
  onClose: () => void;
}) {
  const [method, setMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createPayout = useCreatePayout();

  const total = items.reduce((s, i) => s + i.brand_amount, 0);

  async function handlePay() {
    setError(null);
    try {
      await createPayout.mutateAsync({
        brand_id: brand.brand_id,
        items,
        payment_method: method,
        notes: notes || undefined,
      });
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-2xl w-full max-w-sm mx-4 p-6 flex flex-col gap-4">
        <div>
          <h2 className="text-base font-bold text-[var(--foreground)]">Registrar pago</h2>
          <p className="text-sm text-[var(--muted-foreground)]">{brand.brand_name}</p>
        </div>

        {/* Summary */}
        <div className="bg-[var(--muted)] rounded-xl px-4 py-3 flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between text-[var(--muted-foreground)]">
            <span>{items.length} {items.length === 1 ? "artículo" : "artículos"}</span>
          </div>
          <div className="flex justify-between font-bold text-[var(--foreground)] pt-1 border-t border-[var(--border)]">
            <span>Total a pagar</span>
            <span className="font-mono">{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Method */}
        <div>
          <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-2">
            Método de pago
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setMethod(value)}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                  method === value
                    ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                    : "bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-[var(--primary)]"
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <textarea
          placeholder="Notas (opcional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
        />

        {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
          >
            Cancelar
          </button>
          <Button onClick={handlePay} disabled={createPayout.isPending} className="flex-1">
            {createPayout.isPending
              ? <><Loader2 size={14} className="animate-spin" /> Guardando...</>
              : `Pagar ${formatCurrency(total)}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
