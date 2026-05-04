"use client";

import { useState } from "react";
import {
  Wallet, TrendingUp, Banknote, CreditCard, ArrowLeftRight,
  Plus, Minus, CheckCircle2, Lock, ChevronDown, ChevronUp, Loader2,
} from "lucide-react";
import {
  useTodayRegister, useTodaySales, useTodayMovements,
  useOpenRegister, useCloseRegister, useAddMovement,
} from "@/hooks/use-caja";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

// ── Label helpers ─────────────────────────────────────────────────────────────
const MOVEMENT_LABELS: Record<string, string> = {
  sale: "Venta", brand_payment: "Pago a marca", floor_income: "Renta de piso",
  salary: "Sueldo", rent: "Renta local", maintenance: "Mantenimiento",
  savings: "Ahorro", debt_payment: "Pago deuda", construction: "Construcción",
  production_reimbursement: "Reembolso producción", event_income: "Evento",
  deposit: "Depósito", withdrawal: "Retiro", adjustment: "Ajuste",
};

const MANUAL_TYPES = [
  { value: "deposit",    label: "Depósito / ingreso extra" },
  { value: "withdrawal", label: "Retiro de efectivo" },
  { value: "rent",       label: "Pago de renta" },
  { value: "maintenance",label: "Mantenimiento" },
  { value: "savings",    label: "Ahorro" },
  { value: "adjustment", label: "Ajuste manual" },
];

// ── Shared date label ─────────────────────────────────────────────────────────
const TODAY_LABEL = new Date().toLocaleDateString("es-MX", {
  weekday: "long", year: "numeric", month: "long", day: "numeric",
  timeZone: "America/Hermosillo",
});

export default function CajaPage() {
  const { data: register, isLoading: loadingReg } = useTodayRegister();
  const { data: sales } = useTodaySales();
  const { data: movements = [] } = useTodayMovements();

  const isClosed = register && register.closing_cash !== null;
  const isOpen   = register && register.closing_cash === null;

  if (loadingReg) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={28} className="animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">Caja</h1>
        <p className="text-sm text-[var(--muted-foreground)] capitalize">{TODAY_LABEL}</p>
      </div>

      {/* ── Estado de caja ───────────────────────────────────────────────── */}
      {!register && <OpenCajaCard />}
      {isOpen  && <OpenSummaryCard register={register} sales={sales} />}
      {isClosed && <ClosedSummaryCard register={register} />}

      {/* ── Resumen de ventas ────────────────────────────────────────────── */}
      {register && sales && (
        <SalesBreakdown sales={sales} />
      )}

      {/* ── Movimientos del día ──────────────────────────────────────────── */}
      {register && (
        <MovimientosCard movements={movements} canAdd={!!isOpen} />
      )}
    </div>
  );
}

// ── Abrir caja ────────────────────────────────────────────────────────────────
function OpenCajaCard() {
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const open = useOpenRegister();

  async function handleOpen() {
    const val = parseFloat(amount);
    if (isNaN(val) || val < 0) { setError("Ingresa un monto válido"); return; }
    setError(null);
    try {
      await open.mutateAsync({ opening_cash: val, notes: notes || undefined });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
          <Wallet size={20} className="text-[var(--primary)]" />
        </div>
        <div>
          <p className="font-semibold text-[var(--foreground)]">Abrir caja</p>
          <p className="text-xs text-[var(--muted-foreground)]">Ingresa el efectivo inicial</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] text-sm">$</span>
          <input
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>
        <textarea
          placeholder="Notas (opcional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
        />
        {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
        <Button onClick={handleOpen} disabled={open.isPending} className="w-full">
          {open.isPending ? <><Loader2 size={14} className="animate-spin" /> Abriendo...</> : "Abrir caja"}
        </Button>
      </div>
    </div>
  );
}

// ── Resumen caja abierta ──────────────────────────────────────────────────────
function OpenSummaryCard({
  register,
  sales,
}: {
  register: NonNullable<ReturnType<typeof useTodayRegister>["data"]>;
  sales: ReturnType<typeof useTodaySales>["data"];
}) {
  const [showClose, setShowClose] = useState(false);
  const [closingCash, setClosingCash] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const close = useCloseRegister();

  const cashSales = sales?.cash_sales ?? 0;
  const expectedCash = register.opening_cash + cashSales;

  async function handleClose() {
    const val = parseFloat(closingCash);
    if (isNaN(val) || val < 0) { setError("Ingresa el efectivo contado"); return; }
    setError(null);
    try {
      await close.mutateAsync({
        id: register.id,
        closing_cash: val,
        expected_cash: expectedCash,
        total_sales: sales?.total_sales ?? 0,
        total_cash_sales: sales?.cash_sales ?? 0,
        total_card_sales: sales?.card_sales ?? 0,
        total_transfer_sales: sales?.transfer_sales ?? 0,
        notes: notes || undefined,
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const diff = parseFloat(closingCash) - expectedCash;
  const hasDiff = !isNaN(diff) && closingCash !== "";

  return (
    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
      {/* Status bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-green-50 border-b border-green-100">
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle2 size={16} />
          <span className="text-sm font-medium">Caja abierta</span>
        </div>
        <span className="text-sm font-mono font-bold text-green-700">
          Fondo: {formatCurrency(register.opening_cash)}
        </span>
      </div>

      <div className="p-5">
        {/* Expected cash */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-[var(--muted-foreground)]">Efectivo esperado en caja</span>
          <span className="text-lg font-bold font-mono text-[var(--foreground)]">
            {formatCurrency(expectedCash)}
          </span>
        </div>

        {/* Close toggle */}
        <button
          onClick={() => setShowClose(!showClose)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
        >
          <Lock size={14} />
          Hacer corte
          {showClose ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {/* Close form */}
        {showClose && (
          <div className="mt-4 flex flex-col gap-3 pt-4 border-t border-[var(--border)]">
            <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
              Cuenta el efectivo en caja
            </p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] text-sm">$</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={closingCash}
                onChange={(e) => setClosingCash(e.target.value)}
                className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>

            {/* Difference preview */}
            {hasDiff && (
              <div className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm ${
                Math.abs(diff) < 1
                  ? "bg-green-50 text-green-700"
                  : diff > 0
                  ? "bg-blue-50 text-blue-700"
                  : "bg-red-50 text-red-600"
              }`}>
                <span className="font-medium">
                  {Math.abs(diff) < 1 ? "✓ Cuadra exacto" : diff > 0 ? "Sobrante" : "Faltante"}
                </span>
                <span className="font-bold font-mono">
                  {Math.abs(diff) < 1 ? "—" : formatCurrency(Math.abs(diff))}
                </span>
              </div>
            )}

            <textarea
              placeholder="Notas del corte (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
            />
            {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
            <Button onClick={handleClose} disabled={close.isPending} className="w-full">
              {close.isPending ? <><Loader2 size={14} className="animate-spin" /> Cerrando...</> : "Confirmar corte"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Resumen caja cerrada ──────────────────────────────────────────────────────
function ClosedSummaryCard({
  register,
}: {
  register: NonNullable<ReturnType<typeof useTodayRegister>["data"]>;
}) {
  const diff = register.difference ?? 0;
  return (
    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 bg-[var(--muted)] border-b border-[var(--border)]">
        <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
          <Lock size={15} />
          <span className="text-sm font-medium">Caja cerrada</span>
        </div>
      </div>
      <div className="p-5 grid grid-cols-2 gap-3 text-sm">
        <Stat label="Fondo inicial"   value={formatCurrency(register.opening_cash)} />
        <Stat label="Efectivo contado" value={formatCurrency(register.closing_cash!)} />
        <Stat label="Esperado en caja" value={formatCurrency(register.expected_cash!)} />
        <Stat
          label={diff >= 0 ? "Sobrante" : "Faltante"}
          value={formatCurrency(Math.abs(diff))}
          highlight={Math.abs(diff) < 1 ? "ok" : diff > 0 ? "over" : "under"}
        />
      </div>
      {register.notes && (
        <p className="px-5 pb-4 text-xs text-[var(--muted-foreground)]">{register.notes}</p>
      )}
    </div>
  );
}

// ── Desglose ventas ───────────────────────────────────────────────────────────
function SalesBreakdown({ sales }: { sales: NonNullable<ReturnType<typeof useTodaySales>["data"]> }) {
  return (
    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={16} className="text-[var(--primary)]" />
        <span className="text-sm font-semibold text-[var(--foreground)]">
          Ventas del día · {sales.sale_count} {sales.sale_count === 1 ? "venta" : "ventas"}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center text-base font-bold text-[var(--foreground)] pb-2 border-b border-[var(--border)]">
          <span>Total</span>
          <span className="font-mono">{formatCurrency(sales.total_sales)}</span>
        </div>
        <MethodRow icon={<Banknote size={14} />}      label="Efectivo"      amount={sales.cash_sales} />
        <MethodRow icon={<CreditCard size={14} />}    label="Tarjeta"       amount={sales.card_sales} />
        <MethodRow icon={<ArrowLeftRight size={14} />} label="Transferencia" amount={sales.transfer_sales} />
      </div>
    </div>
  );
}

function MethodRow({ icon, label, amount }: { icon: React.ReactNode; label: string; amount: number }) {
  return (
    <div className="flex justify-between items-center text-sm text-[var(--muted-foreground)]">
      <span className="flex items-center gap-2">{icon}{label}</span>
      <span className="font-mono">{formatCurrency(amount)}</span>
    </div>
  );
}

// ── Movimientos ───────────────────────────────────────────────────────────────
function MovimientosCard({
  movements,
  canAdd,
}: {
  movements: ReturnType<typeof useTodayMovements>["data"] & object[];
  canAdd: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState("deposit");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isOut, setIsOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const add = useAddMovement();

  async function handleAdd() {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) { setError("Ingresa un monto válido"); return; }
    if (!description.trim()) { setError("Agrega una descripción"); return; }
    setError(null);
    try {
      await add.mutateAsync({
        type,
        amount: isOut ? -val : val,
        description: description.trim(),
        payment_method: "cash",
      });
      setAmount("");
      setDescription("");
      setShowForm(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  // Filter non-sale movements for display
  const extraMovements = movements.filter((m) => m.type !== "sale");

  return (
    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
        <span className="text-sm font-semibold text-[var(--foreground)]">Movimientos extra</span>
        {canAdd && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1 text-xs text-[var(--primary)] font-medium hover:opacity-80 transition-opacity"
          >
            <Plus size={13} />
            Agregar
          </button>
        )}
      </div>

      {/* Add movement form */}
      {showForm && (
        <div className="p-4 border-b border-[var(--border)] flex flex-col gap-3 bg-[var(--muted)]/40">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          >
            {MANUAL_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          {/* In / Out toggle */}
          <div className="flex rounded-xl overflow-hidden border border-[var(--border)] text-sm">
            <button
              onClick={() => setIsOut(false)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors ${
                !isOut ? "bg-green-600 text-white" : "bg-[var(--background)] text-[var(--muted-foreground)]"
              }`}
            >
              <Plus size={13} /> Entrada
            </button>
            <button
              onClick={() => setIsOut(true)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors ${
                isOut ? "bg-red-500 text-white" : "bg-[var(--background)] text-[var(--muted-foreground)]"
              }`}
            >
              <Minus size={13} /> Salida
            </button>
          </div>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] text-sm">$</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>
          <input
            type="text"
            placeholder="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
          {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 py-2 rounded-xl border border-[var(--border)] text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
            >
              Cancelar
            </button>
            <Button onClick={handleAdd} disabled={add.isPending} className="flex-1">
              {add.isPending ? <Loader2 size={13} className="animate-spin" /> : "Guardar"}
            </Button>
          </div>
        </div>
      )}

      {/* Movements list */}
      {extraMovements.length === 0 ? (
        <p className="text-center text-sm text-[var(--muted-foreground)] py-6">Sin movimientos extra hoy</p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {extraMovements.map((m) => (
            <li key={m.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {MOVEMENT_LABELS[m.type] ?? m.type}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">{m.description}</p>
              </div>
              <span className={`text-sm font-bold font-mono ${
                m.amount >= 0 ? "text-green-600" : "text-red-500"
              }`}>
                {m.amount >= 0 ? "+" : ""}{formatCurrency(m.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function Stat({
  label, value, highlight,
}: {
  label: string;
  value: string;
  highlight?: "ok" | "over" | "under";
}) {
  const color =
    highlight === "ok"    ? "text-green-600" :
    highlight === "over"  ? "text-blue-600"  :
    highlight === "under" ? "text-red-500"   :
    "text-[var(--foreground)]";
  return (
    <div className="bg-[var(--muted)] rounded-xl px-4 py-3">
      <p className="text-xs text-[var(--muted-foreground)] mb-0.5">{label}</p>
      <p className={`text-base font-bold font-mono ${color}`}>{value}</p>
    </div>
  );
}
