"use client";

import { useState } from "react";
import {
  Banknote, CreditCard, ArrowLeftRight, ChevronDown, ChevronUp,
  CheckCircle2, Loader2, History, RefreshCw, Store,
  Users, Receipt, FileDown,
} from "lucide-react";
import jsPDF from "jspdf";
import {
  usePendingByBrand, usePendingItems, useBrandPayouts, useCreatePayout,
  type BrandPending, type PendingItem,
} from "@/hooks/use-liquidaciones";
import {
  useStoreLiquidacion, useMonthSalesSummary, useGenerateStoreLiquidacion,
  useMarkItemPaid, useFloorRentsForMonth, useUpsertFloorRent, useMarkFloorRentPaid,
  LIQ_CATEGORY_LABELS, LIQ_CATEGORY_COLORS,
  type StoreLiquidacionItem, type BrandFloorRent,
} from "@/hooks/use-store-liquidacion";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { formatCurrency } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function prevMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(ym: string) {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}

const PAYMENT_METHODS = [
  { value: "cash",     label: "Efectivo",      icon: Banknote },
  { value: "transfer", label: "Transferencia", icon: ArrowLeftRight },
  { value: "card",     label: "Tarjeta",       icon: CreditCard },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LiquidacionesPage() {
  const [tab, setTab] = useState<"marcas" | "tienda">("marcas");
  const [month, setMonth] = useState(currentMonth());

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">Liquidaciones</h1>
          <p className="text-sm text-[var(--muted-foreground)] capitalize">{formatMonth(month)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonth(prevMonth(month))}
            className="px-2 py-1.5 text-xs rounded-lg border border-[var(--border)] hover:bg-[var(--muted)] transition-colors"
          >‹</button>
          <button
            onClick={() => setMonth(nextMonth(month))}
            disabled={month >= currentMonth()}
            className="px-2 py-1.5 text-xs rounded-lg border border-[var(--border)] hover:bg-[var(--muted)] transition-colors disabled:opacity-40"
          >›</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl border border-[var(--border)] overflow-hidden text-sm">
        <button
          onClick={() => setTab("marcas")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 font-medium transition-colors ${
            tab === "marcas"
              ? "bg-[var(--primary)] text-white"
              : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)]"
          }`}
        >
          <Users size={15} /> Marcas
        </button>
        <button
          onClick={() => setTab("tienda")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 font-medium transition-colors ${
            tab === "tienda"
              ? "bg-[var(--primary)] text-white"
              : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)]"
          }`}
        >
          <Store size={15} /> Tienda
        </button>
      </div>

      {tab === "marcas" && <MarcasTab />}
      {tab === "tienda" && <TiendaTab month={month} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: MARCAS (existing logic, unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function MarcasTab() {
  const { data: brands = [], isLoading } = usePendingByBrand();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const totalPending = brands.reduce((s, b) => s + b.pending_amount, 0);

  return (
    <>
      {totalPending > 0 && (
        <div className="text-right -mt-2">
          <p className="text-xs text-[var(--muted-foreground)]">Total pendiente</p>
          <p className="text-lg font-bold font-mono text-[var(--foreground)]">
            {formatCurrency(totalPending)}
          </p>
        </div>
      )}

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
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: TIENDA — Monthly store settlement
// ─────────────────────────────────────────────────────────────────────────────

function TiendaTab({ month }: { month: string }) {
  const { data: liq, isLoading: liqLoading } = useStoreLiquidacion(month);
  const { data: summary, isLoading: sumLoading } = useMonthSalesSummary(month);
  const { data: floorRents = [], isLoading: floorLoading } = useFloorRentsForMonth(month);
  const generate = useGenerateStoreLiquidacion();
  const [payingItem, setPayingItem]   = useState<StoreLiquidacionItem | null>(null);
  const [payingRent, setPayingRent]   = useState<BrandFloorRent | null>(null);
  const [editingRent, setEditingRent] = useState<BrandFloorRent | null>(null);

  const isLoading = liqLoading || sumLoading || floorLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={24} className="animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  }

  // Summary bar
  const gross      = summary?.gross_sales ?? 0;
  const iva        = summary?.iva_collected ?? 0;
  const cc         = (summary?.paid_card ?? 0) * 0.046;
  const storeNet   = summary?.store_net ?? 0;
  const floorIncome = summary?.floor_income ?? 0;

  async function handleGenerate() {
    if (!summary) return;
    await generate.mutateAsync({ month, summary });
  }

  return (
    <>
      {/* Summary stats */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 flex flex-col gap-2 text-sm">
        <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-1">
          Resumen del mes
        </p>
        <StatRow label="Ventas brutas"       value={gross}     />
        <StatRow label="IVA a pagar (SAT)"   value={-iva}      color="red" />
        <StatRow label="Comisión tarjeta"     value={-cc}       color="red" muted />
        <StatRow label="Pago a marcas"        value={-(summary?.brand_total ?? 0)} color="red" muted />
        <div className="border-t border-[var(--border)] my-1" />
        <StatRow label="Ingreso neto tienda"  value={storeNet}  bold />
        {floorIncome > 0 && (
          <StatRow label="+ Renta de piso cobrada" value={floorIncome} color="green" />
        )}
        {liq && (
          <>
            <StatRow label="Renta local"      value={-liq.rent_deducted} color="red" muted />
            <StatRow label="Repartible"       value={liq.distributable}  bold color="green" />
          </>
        )}
      </div>

      {/* Floor rents section */}
      {floorRents.length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-[var(--muted)]/50 border-b border-[var(--border)]">
            <p className="text-sm font-semibold text-[var(--foreground)]">Rentas de piso</p>
            <p className="text-xs text-[var(--muted-foreground)]">
              {floorRents.filter((r) => r.status === "paid").length}/{floorRents.length} cobradas
            </p>
          </div>
          {floorRents.map((rent, i) => (
            <div
              key={rent.brand_id}
              className={`flex items-center justify-between px-4 py-3 ${
                i < floorRents.length - 1 ? "border-b border-[var(--border)]" : ""
              }`}
            >
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">{rent.brand_name}</p>
                {rent.paid_at ? (
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Cobrado {new Date(rent.paid_at).toLocaleDateString("es-MX", { dateStyle: "short" })}
                    {rent.payment_method ? ` · ${pmLabel(rent.payment_method)}` : ""}
                  </p>
                ) : (
                  <p className="text-xs text-amber-600">Pendiente de cobro</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold text-[var(--foreground)]">
                  {formatCurrency(rent.amount)}
                </span>
                {rent.status === "paid" ? (
                  <CheckCircle2 size={16} className="text-green-500" />
                ) : (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setEditingRent(rent)}
                      className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] px-2 py-1 rounded-lg border border-[var(--border)] hover:bg-[var(--muted)] transition-colors"
                    >
                      Editar
                    </button>
                    <Button size="sm" onClick={() => setPayingRent(rent)}>
                      Cobrar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate / refresh button */}
      {!liq ? (
        <div className="flex flex-col items-center gap-3 py-6">
          <Receipt size={36} className="text-[var(--muted-foreground)] opacity-30" />
          <p className="text-sm text-[var(--muted-foreground)] text-center">
            No hay liquidación generada para este mes.
          </p>
          <Button
            onClick={handleGenerate}
            disabled={generate.isPending || gross === 0}
          >
            {generate.isPending
              ? <><Loader2 size={14} className="animate-spin" /> Generando...</>
              : "Generar liquidación"}
          </Button>
          {gross === 0 && (
            <p className="text-xs text-[var(--muted-foreground)]">No hay ventas en este mes.</p>
          )}
        </div>
      ) : (
        <>
          {/* Refresh button */}
          <div className="flex justify-between items-center -mb-2">
            <p className="text-xs text-[var(--muted-foreground)]">
              {liq.items.filter((i) => i.status === "paid").length} de {liq.items.length} pagados
            </p>
            <button
              onClick={handleGenerate}
              disabled={generate.isPending}
              className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              <RefreshCw size={12} className={generate.isPending ? "animate-spin" : ""} />
              Recalcular
            </button>
          </div>

          {/* Items table */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
            {groupItems(liq.items).map((group, gi) => (
              <div key={group.category} className={gi > 0 ? "border-t border-[var(--border)]" : ""}>
                {/* Group header */}
                <div
                  className="flex items-center justify-between px-4 py-2.5 bg-[var(--muted)]/50"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: LIQ_CATEGORY_COLORS[group.category] ?? "#888" }}
                    />
                    <span className="text-sm font-semibold text-[var(--foreground)]">
                      {LIQ_CATEGORY_LABELS[group.category] ?? group.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-[var(--foreground)]">
                      {formatCurrency(group.total)}
                    </span>
                    {group.allPaid ? (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 size={13} /> Pagado
                      </span>
                    ) : (
                      <span className="text-xs text-amber-600">Pendiente</span>
                    )}
                  </div>
                </div>

                {/* Sub-items (salary per employee) */}
                {group.items.map((item, ii) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between px-4 py-3 ${
                      ii < group.items.length - 1 ? "border-b border-[var(--border)]" : ""
                    }`}
                  >
                    <div className="flex-1">
                      <p className="text-sm text-[var(--foreground)]">
                        {item.employee_name
                          ? item.employee_name
                          : LIQ_CATEGORY_LABELS[item.category] ?? item.category}
                      </p>
                      {item.paid_at && (
                        <p className="text-xs text-[var(--muted-foreground)]">
                          Pagado{" "}
                          {new Date(item.paid_at).toLocaleDateString("es-MX", {
                            dateStyle: "short",
                          })}
                          {item.payment_method ? ` · ${pmLabel(item.payment_method)}` : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-[var(--foreground)]">
                        {formatCurrency(item.allocated_amount)}
                      </span>
                      {item.status === "paid" ? (
                        <CheckCircle2 size={16} className="text-green-500" />
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setPayingItem(item)}
                        >
                          Pagar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pay liquidation item modal */}
      <Modal
        open={!!payingItem}
        onClose={() => setPayingItem(null)}
        title="Registrar pago"
        size="sm"
      >
        {payingItem && (
          <PayItemForm
            item={payingItem}
            onClose={() => setPayingItem(null)}
          />
        )}
      </Modal>

      {/* Cobrar renta de piso modal */}
      <Modal
        open={!!payingRent}
        onClose={() => setPayingRent(null)}
        title="Cobrar renta de piso"
        size="sm"
      >
        {payingRent && (
          <PayFloorRentForm
            rent={payingRent}
            onClose={() => setPayingRent(null)}
          />
        )}
      </Modal>

      {/* Editar monto de renta modal */}
      <Modal
        open={!!editingRent}
        onClose={() => setEditingRent(null)}
        title="Editar monto de renta"
        size="sm"
      >
        {editingRent && (
          <EditFloorRentForm
            rent={editingRent}
            onClose={() => setEditingRent(null)}
          />
        )}
      </Modal>
    </>
  );
}

// ─── Group items by category (keeping salary items together) ──────────────────

interface ItemGroup {
  category: string;
  total: number;
  allPaid: boolean;
  items: StoreLiquidacionItem[];
}

function groupItems(items: StoreLiquidacionItem[]): ItemGroup[] {
  const ORDER = ["iva", "rent", "salary", "maintenance", "savings", "ads", "construction"];
  const map = new Map<string, StoreLiquidacionItem[]>();

  for (const item of items) {
    const list = map.get(item.category) ?? [];
    list.push(item);
    map.set(item.category, list);
  }

  return ORDER.filter((cat) => map.has(cat)).map((cat) => {
    const catItems = map.get(cat)!;
    return {
      category: cat,
      total: catItems.reduce((s, i) => s + i.allocated_amount, 0),
      allPaid: catItems.every((i) => i.status === "paid"),
      items: catItems,
    };
  });
}

function pmLabel(pm: string) {
  return pm === "cash" ? "Efectivo" : pm === "transfer" ? "Transferencia" : "Tarjeta";
}

// ─── Pay item form ────────────────────────────────────────────────────────────

function PayItemForm({
  item,
  onClose,
}: {
  item: StoreLiquidacionItem;
  onClose: () => void;
}) {
  const [method, setMethod] = useState("transfer");
  const [notes, setNotes]   = useState("");
  const [err, setErr]       = useState<string | null>(null);
  const markPaid = useMarkItemPaid();

  const label = item.employee_name
    ? item.employee_name
    : LIQ_CATEGORY_LABELS[item.category] ?? item.category;

  async function handlePay() {
    setErr(null);
    try {
      await markPaid.mutateAsync({ itemId: item.id, paymentMethod: method, notes: notes || undefined });
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <div className="p-6 flex flex-col gap-4">
      {/* Summary */}
      <div className="bg-[var(--muted)] rounded-xl px-4 py-3 flex justify-between items-center">
        <div>
          <p className="text-xs text-[var(--muted-foreground)]">
            {LIQ_CATEGORY_LABELS[item.category] ?? item.category}
          </p>
          <p className="text-sm font-semibold text-[var(--foreground)]">{label}</p>
        </div>
        <p className="text-lg font-bold font-mono text-[var(--foreground)]">
          {formatCurrency(item.allocated_amount)}
        </p>
      </div>

      {/* Payment method */}
      <div>
        <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-2">
          Medio de pago
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {PAYMENT_METHODS.map(({ value, label: ml, icon: Icon }) => (
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
              {ml}
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

      {err && <p className="text-xs text-[var(--destructive)]">{err}</p>}

      <div className="flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
        >
          Cancelar
        </button>
        <Button onClick={handlePay} disabled={markPaid.isPending} className="flex-1">
          {markPaid.isPending
            ? <><Loader2 size={14} className="animate-spin" /> Pagando...</>
            : `Pagar ${formatCurrency(item.allocated_amount)}`}
        </Button>
      </div>
    </div>
  );
}

// ─── Pay floor rent form ──────────────────────────────────────────────────────

function PayFloorRentForm({ rent, onClose }: { rent: BrandFloorRent; onClose: () => void }) {
  const [method, setMethod] = useState("transfer");
  const [notes, setNotes]   = useState("");
  const [err, setErr]       = useState<string | null>(null);
  const markPaid = useMarkFloorRentPaid();

  async function handlePay() {
    if (!rent.id) { setErr("Primero guarda el registro de renta."); return; }
    setErr(null);
    try {
      await markPaid.mutateAsync({ rentId: rent.id, paymentMethod: method, notes: notes || undefined });
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="bg-[var(--muted)] rounded-xl px-4 py-3 flex justify-between items-center">
        <div>
          <p className="text-xs text-[var(--muted-foreground)]">Renta de piso</p>
          <p className="text-sm font-semibold text-[var(--foreground)]">{rent.brand_name}</p>
        </div>
        <p className="text-lg font-bold font-mono text-[var(--foreground)]">{formatCurrency(rent.amount)}</p>
      </div>
      <div>
        <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-2">Medio de pago</p>
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
      {err && <p className="text-xs text-[var(--destructive)]">{err}</p>}
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors">
          Cancelar
        </button>
        <Button onClick={handlePay} disabled={markPaid.isPending} className="flex-1">
          {markPaid.isPending
            ? <><Loader2 size={14} className="animate-spin" /> Registrando...</>
            : `Cobrar ${formatCurrency(rent.amount)}`}
        </Button>
      </div>
    </div>
  );
}

// ─── Edit floor rent amount form ──────────────────────────────────────────────

function EditFloorRentForm({ rent, onClose }: { rent: BrandFloorRent; onClose: () => void }) {
  const [amount, setAmount] = useState(rent.amount.toString());
  const [notes, setNotes]   = useState(rent.notes ?? "");
  const [err, setErr]       = useState<string | null>(null);
  const upsert = useUpsertFloorRent();

  async function handleSave() {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) { setErr("Monto inválido"); return; }
    setErr(null);
    try {
      await upsert.mutateAsync({
        brand_id: rent.brand_id,
        period_month: rent.period_month,
        amount: parsed,
        notes: notes || undefined,
      });
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="bg-[var(--muted)] rounded-xl px-4 py-3">
        <p className="text-xs text-[var(--muted-foreground)]">Marca</p>
        <p className="text-sm font-semibold text-[var(--foreground)]">{rent.brand_name}</p>
      </div>
      <div>
        <label className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide block mb-1.5">
          Monto a cobrar este mes
        </label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />
      </div>
      <textarea
        placeholder="Notas (opcional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
      />
      {err && <p className="text-xs text-[var(--destructive)]">{err}</p>}
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors">
          Cancelar
        </button>
        <Button onClick={handleSave} disabled={upsert.isPending} className="flex-1">
          {upsert.isPending ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : "Guardar"}
        </Button>
      </div>
    </div>
  );
}

// ─── Stat row helper ──────────────────────────────────────────────────────────

function StatRow({
  label, value, bold, color, muted,
}: {
  label: string;
  value: number;
  bold?: boolean;
  color?: "red" | "green";
  muted?: boolean;
}) {
  const textColor = color === "red"
    ? "text-red-500"
    : color === "green"
    ? "text-green-600"
    : muted
    ? "text-[var(--muted-foreground)]"
    : "text-[var(--foreground)]";

  return (
    <div className={`flex justify-between items-center text-sm ${textColor}`}>
      <span>{label}</span>
      <span className={`font-mono ${bold ? "font-bold" : ""}`}>
        {value < 0 ? `-${formatCurrency(Math.abs(value))}` : formatCurrency(value)}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BRAND CARD (unchanged from original)
// ─────────────────────────────────────────────────────────────────────────────

function BrandCard({
  brand, isExpanded, showingHistory, onToggle, onToggleHistory,
}: {
  brand: BrandPending;
  isExpanded: boolean;
  showingHistory: boolean;
  onToggle: () => void;
  onToggleHistory: () => void;
}) {
  const { data: items = [], isLoading } = usePendingItems(isExpanded ? brand.brand_id : null, brand.contract_type);
  const { data: history = [] } = useBrandPayouts(showingHistory ? brand.brand_id : null);
  const [showPay, setShowPay] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Sync selection when items load (select all by default)
  const prevItemIds = items.map((i) => i.sale_item_id).join(",");
  const [lastIds, setLastIds] = useState("");
  if (prevItemIds !== lastIds) {
    setLastIds(prevItemIds);
    setSelected(new Set(items.map((i) => i.sale_item_id)));
  }

  const allChecked = items.length > 0 && selected.size === items.length;
  const toggleAll = () =>
    setSelected(allChecked ? new Set() : new Set(items.map((i) => i.sale_item_id)));
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const selectedItems = items.filter((i) => selected.has(i.sale_item_id));
  const selectedTotal = selectedItems.reduce((s, i) => s + i.brand_amount, 0);

  return (
    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
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
              : `piso · ventas brutas menos IVA/tarjeta`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-bold font-mono text-amber-600">{formatCurrency(brand.pending_amount)}</p>
            <p className="text-xs text-[var(--muted-foreground)]">pendiente</p>
          </div>
          {isExpanded
            ? <ChevronUp size={16} className="text-[var(--muted-foreground)]" />
            : <ChevronDown size={16} className="text-[var(--muted-foreground)]" />}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-[var(--border)]">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 size={18} className="animate-spin text-[var(--muted-foreground)]" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[var(--muted)] text-[var(--muted-foreground)]">
                      <th className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={allChecked}
                          onChange={toggleAll}
                          className="rounded"
                        />
                      </th>
                      <th className="text-left px-2 py-2 font-medium">Folio</th>
                      <th className="text-left px-3 py-2 font-medium">Producto</th>
                      <th className="text-right px-3 py-2 font-medium">Cant.</th>
                      <th className="text-right px-4 py-2 font-medium">Monto marca</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {items.map((item) => (
                      <ItemRow
                        key={item.sale_item_id}
                        item={item}
                        checked={selected.has(item.sale_item_id)}
                        onToggle={() => toggleOne(item.sale_item_id)}
                      />
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[var(--border)]">
                      <td />
                      <td colSpan={3} className="px-2 py-3 text-sm font-semibold text-[var(--foreground)]">
                        {selected.size < items.length
                          ? `${selected.size} de ${items.length} seleccionados`
                          : "Total"}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold font-mono text-amber-600">
                        {formatCurrency(selectedTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="px-5 py-3 flex gap-2 border-t border-[var(--border)]">
                <button
                  onClick={onToggleHistory}
                  className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                >
                  <History size={13} />
                  {showingHistory ? "Ocultar historial" : "Ver historial"}
                </button>
                <div className="flex-1" />
                <Button size="sm" disabled={selected.size === 0} onClick={() => setShowPay(true)}>
                  {selected.size < items.length && selected.size > 0
                    ? `Pagar ${selected.size} artículo${selected.size > 1 ? "s" : ""}`
                    : "Registrar pago"}
                </Button>
              </div>
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
                          {p.payment_method === "cash"     && <Banknote size={11} />}
                          {p.payment_method === "card"     && <CreditCard size={11} />}
                          {p.payment_method === "transfer" && <ArrowLeftRight size={11} />}
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
              {showPay && (
                <BrandPayModal
                  brand={brand}
                  items={selectedItems}
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

function ItemRow({
  item,
  checked,
  onToggle,
}: {
  item: PendingItem;
  checked: boolean;
  onToggle: () => void;
}) {
  const date = item.sale_date
    ? new Date(item.sale_date).toLocaleDateString("es-MX", { dateStyle: "short", timeZone: "America/Hermosillo" })
    : "—";
  return (
    <tr
      className={`hover:bg-[var(--muted)]/20 cursor-pointer ${!checked ? "opacity-50" : ""}`}
      onClick={onToggle}
    >
      <td className="px-4 py-2 text-center" onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" checked={checked} onChange={onToggle} className="rounded" />
      </td>
      <td className="px-2 py-2 font-mono text-[var(--muted-foreground)]">{item.sale_folio}</td>
      <td className="px-3 py-2">
        <p className="text-[var(--foreground)]">{item.product_name}</p>
        <p className="text-[var(--muted-foreground)]">{item.variant_sku} · {date}</p>
      </td>
      <td className="px-3 py-2 text-right text-[var(--foreground)]">{item.quantity}</td>
      <td className="px-4 py-2 text-right font-mono font-medium text-[var(--foreground)]">
        {formatCurrency(item.brand_amount)}
      </td>
    </tr>
  );
}

// ─── PDF generator ────────────────────────────────────────────────────────────

function generatePayoutPDF({
  brand,
  items,
  method,
  notes,
  isFloor,
  gross,
  ivaTotal,
  cardTotal,
  total,
}: {
  brand: BrandPending;
  items: PendingItem[];
  method: string;
  notes: string;
  isFloor: boolean;
  gross: number;
  ivaTotal: number;
  cardTotal: number;
  total: number;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const ML = 18;           // left margin
  const MR = 18;           // right margin
  const RIGHT = W - MR;   // right edge
  const colW = W - ML - MR;
  let y = 22;

  const fmt = (n: number) =>
    n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yyyy = today.getFullYear();

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.setFont("courier", "bold");
  doc.setFontSize(14);
  doc.text(`REPORTE DE VENTAS ${brand.brand_name.toUpperCase()}`, ML, y);
  y += 9;

  doc.setFontSize(9.5);
  doc.setTextColor(80, 80, 80);
  doc.text(`${dd}/${mm}/${yyyy}`, ML, y);
  y += 5;
  doc.text(
    `Contrato: ${isFloor ? "Piso" : `${(brand.contract_value * 100).toFixed(0)}%`}`,
    ML, y
  );
  y += 5;
  doc.text(`Método de pago: ${pmLabel(method)}`, ML, y);
  if (notes) {
    y += 5;
    const noteLines = doc.splitTextToSize(`Notas: ${notes}`, colW);
    doc.text(noteLines, ML, y);
    y += noteLines.length * 4.5;
  }
  y += 4;
  doc.setTextColor(0, 0, 0);

  // thin separator
  doc.setDrawColor(160, 160, 160);
  doc.line(ML, y, RIGHT, y);
  y += 5;

  // ── Column definitions ───────────────────────────────────────────────────────
  // Columns differ by contract type to avoid overcrowding
  // All x values are absolute positions on the page

  // All brands show card commission. Floor brands also show IVA.
  // Columns: Producto/SKU | Cant | Fecha | P.Público | Método | Com.Tarjeta | [IVA] | Monto marca
  const COL = isFloor
    ? {
        prod:    { x: ML,       w: 42, align: "left"  as const },
        qty:     { x: ML + 44,  w: 10, align: "right" as const },
        date:    { x: ML + 56,  w: 18, align: "left"  as const },
        price:   { x: ML + 94,  w: 20, align: "right" as const },
        pmethod: { x: ML + 96,  w: 20, align: "left"  as const },
        cardcom: { x: ML + 138, w: 18, align: "right" as const },
        iva:     { x: ML + 158, w: 16, align: "right" as const },
        amount:  { x: RIGHT,    w: 0,  align: "right" as const },
      }
    : {
        prod:    { x: ML,       w: 48, align: "left"  as const },
        qty:     { x: ML + 50,  w: 10, align: "right" as const },
        date:    { x: ML + 62,  w: 18, align: "left"  as const },
        price:   { x: ML + 100, w: 22, align: "right" as const },
        pmethod: { x: ML + 103, w: 22, align: "left"  as const },
        cardcom: { x: ML + 152, w: 20, align: "right" as const },
        iva:     { x: 0,        w: 0,  align: "right" as const },
        amount:  { x: RIGHT,    w: 0,  align: "right" as const },
      };

  const cell = (text: string, col: { x: number; w: number; align: "left" | "right" }, cy: number) => {
    if (col.x === 0) return;
    doc.text(text, col.align === "right" ? col.x : col.x + 1, cy, { align: col.align });
  };

  // ── Table header ─────────────────────────────────────────────────────────────
  doc.setFontSize(7.5);
  doc.setFont("courier", "bold");
  doc.setFillColor(240, 240, 240);
  doc.rect(ML, y, colW, 6.5, "F");
  const hy = y + 4.5;
  cell("PRODUCTO / SKU",  COL.prod,    hy);
  cell("CANT",            COL.qty,     hy);
  cell("FECHA",           COL.date,    hy);
  cell("P. PUBLICO",      COL.price,   hy);
  cell("METODO PAGO",     COL.pmethod, hy);
  cell("COM. TARJETA",    COL.cardcom, hy);
  if (isFloor) cell("IVA", COL.iva,   hy);
  cell("MONTO MARCA",     COL.amount,  hy);
  y += 7.5;

  // ── Table rows ───────────────────────────────────────────────────────────────
  doc.setFont("courier", "normal");
  doc.setFontSize(7.5);

  for (const item of items) {
    const date = item.sale_date
      ? new Date(item.sale_date).toLocaleDateString("es-MX", {
          dateStyle: "short",
          timeZone: "America/Hermosillo",
        })
      : "—";

    // wrap product name to column width
    const nameLines: string[] = doc.splitTextToSize(item.product_name, COL.prod.w - 1);
    const rowH = Math.max(nameLines.length * 4.2 + 5, 9);

    if (y + rowH > 270) {
      doc.addPage();
      y = 22;
    }

    const baseY = y + 4;
    const saleMethod = item.sale_payment_method;
    const saleMethodLabel =
      saleMethod === "card"     ? "Tarjeta"       :
      saleMethod === "transfer" ? "Transferencia" :
      saleMethod === "mixed"    ? "Mixto"         : "Efectivo";

    // product name (multi-line) + SKU below
    doc.setTextColor(0, 0, 0);
    doc.text(nameLines, ML + 1, baseY);
    doc.setTextColor(120, 120, 120);
    doc.text(item.variant_sku, ML + 1, baseY + nameLines.length * 4.2);
    doc.setTextColor(0, 0, 0);

    cell(String(item.quantity),        COL.qty,     baseY);
    cell(date,                         COL.date,    baseY);
    cell(fmt(item.unit_price),         COL.price,   baseY);
    cell(saleMethodLabel,              COL.pmethod, baseY);
    cell(item.card_comm_portion > 0 ? fmt(item.card_comm_portion) : "—", COL.cardcom, baseY);
    if (isFloor) cell(item.iva_portion > 0 ? fmt(item.iva_portion) : "—", COL.iva, baseY);
    cell(fmt(item.brand_amount),       COL.amount,  baseY);

    y += rowH;

    doc.setDrawColor(220, 220, 220);
    doc.line(ML, y, RIGHT, y);
  }

  // ── Totals ───────────────────────────────────────────────────────────────────
  y += 5;

  const totalRow = (label: string, value: number, bold = false, red = false) => {
    doc.setFont("courier", bold ? "bold" : "normal");
    doc.setFontSize(9);
    doc.setTextColor(red ? 180 : 0, 0, 0);
    doc.text(label, ML + colW - 60, y);
    doc.text(fmt(value), RIGHT, y, { align: "right" });
    doc.setTextColor(0, 0, 0);
    y += 6;
  };

  if (isFloor) {
    totalRow("Ventas brutas", gross);
    if (cardTotal > 0) totalRow("- Comisión tarjeta (4.6%)", cardTotal, false, true);
    if (ivaTotal  > 0) totalRow("- IVA (16%)",               ivaTotal,  false, true);
    // separator THEN total
    doc.setDrawColor(100, 100, 100);
    doc.line(ML + colW - 60, y - 1, RIGHT, y - 1);
    y += 2;
  }

  totalRow("TOTAL PARA LA MARCA", total, true);

  // ── Footer ───────────────────────────────────────────────────────────────────
  doc.setFont("courier", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(140, 140, 140);
  const quote = '"Soy un monje solitario caminando el mundo con un paraguas que gotea" - Mao Ze Dong';
  const quoteLines: string[] = doc.splitTextToSize(quote, colW);
  // pin to bottom of page but never overlap content
  const footerY = Math.max(y + 10, 282 - quoteLines.length * 4);
  doc.text(quoteLines, W / 2, footerY, { align: "center" });

  doc.save(
    `reporte-ventas-${brand.brand_name.toLowerCase().replace(/\s+/g, "-")}-${yyyy}-${mm}-${dd}.pdf`
  );
}

// ─── Brand pay modal ──────────────────────────────────────────────────────────

function BrandPayModal({ brand, items, onClose }: { brand: BrandPending; items: PendingItem[]; onClose: () => void }) {
  const [method, setMethod] = useState("cash");
  const [notes, setNotes]   = useState("");
  const [error, setError]   = useState<string | null>(null);
  const createPayout = useCreatePayout();

  const isFloor   = brand.contract_type === "floor";
  const gross     = items.reduce((s, i) => s + i.brand_amount, 0);
  const ivaTotal  = items.reduce((s, i) => s + i.iva_portion, 0);
  const cardTotal = items.reduce((s, i) => s + i.card_comm_portion, 0);
  const netAmount = gross - ivaTotal - cardTotal;
  const total     = isFloor ? netAmount : gross;

  // For floor brands we pay net, so override brand_amount per item proportionally
  const adjustedItems = isFloor && gross > 0
    ? items.map((i) => ({ ...i, brand_amount: i.brand_amount - i.iva_portion - i.card_comm_portion }))
    : items;

  async function handlePay() {
    setError(null);
    try {
      await createPayout.mutateAsync({ brand_id: brand.brand_id, items: adjustedItems, payment_method: method, notes: notes || undefined });
      generatePayoutPDF({ brand, items, method, notes, isFloor, gross, ivaTotal, cardTotal, total });
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function handleDownloadOnly() {
    generatePayoutPDF({ brand, items, method, notes, isFloor, gross, ivaTotal, cardTotal, total });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-2xl w-full max-w-sm mx-4 p-6 flex flex-col gap-4">
        <div>
          <h2 className="text-base font-bold text-[var(--foreground)]">Registrar pago</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            {brand.brand_name}
            {items.length < brand.item_count && (
              <span className="ml-2 text-amber-600 text-xs">· liquidación parcial</span>
            )}
          </p>
        </div>
        <div className="bg-[var(--muted)] rounded-xl px-4 py-3 flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between text-[var(--muted-foreground)]">
            <span>{items.length} {items.length === 1 ? "artículo" : "artículos"}</span>
          </div>
          {isFloor ? (
            <>
              <div className="flex justify-between text-[var(--muted-foreground)]">
                <span>Ventas brutas</span>
                <span className="font-mono">{formatCurrency(gross)}</span>
              </div>
              {ivaTotal > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>IVA</span>
                  <span className="font-mono">−{formatCurrency(ivaTotal)}</span>
                </div>
              )}
              {cardTotal > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Comisión tarjeta (4.6%)</span>
                  <span className="font-mono">−{formatCurrency(cardTotal)}</span>
                </div>
              )}
            </>
          ) : null}
          <div className="flex justify-between font-bold text-[var(--foreground)] pt-1 border-t border-[var(--border)]">
            <span>Total a pagar</span>
            <span className="font-mono">{formatCurrency(total)}</span>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-2">Método de pago</p>
          <div className="grid grid-cols-3 gap-1.5">
            {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => (
              <button key={value} onClick={() => setMethod(value)}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                  method === value
                    ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                    : "bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-[var(--primary)]"
                }`}>
                <Icon size={15} />{label}
              </button>
            ))}
          </div>
        </div>
        <textarea placeholder="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
          className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none" />
        {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors">Cancelar</button>
          <button
            onClick={handleDownloadOnly}
            title="Descargar PDF sin registrar pago"
            className="px-3 py-2.5 rounded-xl border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
          >
            <FileDown size={15} />
          </button>
          <Button onClick={handlePay} disabled={createPayout.isPending} className="flex-1">
            {createPayout.isPending ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : `Pagar ${formatCurrency(total)}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
