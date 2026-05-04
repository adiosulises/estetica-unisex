"use client";

import { useState } from "react";
import {
  Wallet, TrendingUp, Banknote, CreditCard, ArrowLeftRight,
  Plus, Minus, CheckCircle2, Lock, ChevronDown, ChevronUp,
  Loader2, Unlock, AlertTriangle,
} from "lucide-react";
import {
  useTodayRegister, useTodaySales, useTodayMovements,
  useOpenRegister, useCloseRegister, useReopenRegister, useAddMovement,
} from "@/hooks/use-caja";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

const CARD_RATE = 0.954;

const MOVEMENT_LABELS: Record<string, string> = {
  sale: "Venta", brand_payment: "Pago a marca", floor_income: "Renta de piso",
  salary: "Sueldo", rent: "Renta local", maintenance: "Mantenimiento",
  savings: "Ahorro", debt_payment: "Pago deuda", construction: "Construcción",
  production_reimbursement: "Reembolso producción", event_income: "Evento",
  deposit: "Depósito", withdrawal: "Retiro", adjustment: "Ajuste",
};

const MANUAL_TYPES = [
  { value: "deposit",     label: "Depósito / ingreso extra" },
  { value: "withdrawal",  label: "Retiro de efectivo" },
  { value: "rent",        label: "Pago de renta" },
  { value: "maintenance", label: "Mantenimiento" },
  { value: "savings",     label: "Ahorro" },
  { value: "adjustment",  label: "Ajuste manual" },
];

const TODAY_LABEL = new Date().toLocaleDateString("es-MX", {
  weekday: "long", year: "numeric", month: "long", day: "numeric",
  timeZone: "America/Hermosillo",
});

export default function CajaPage() {
  const { data: register, isLoading } = useTodayRegister();
  const { data: sales } = useTodaySales();
  const { data: movements = [] } = useTodayMovements();

  const isClosed = register && register.closing_cash !== null;
  const isOpen   = register && register.closing_cash === null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={28} className="animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">Caja</h1>
        <p className="text-sm text-[var(--muted-foreground)] capitalize">{TODAY_LABEL}</p>
      </div>

      {!register && <OpenCajaCard />}
      {isOpen    && <OpenSummaryCard register={register} sales={sales} />}
      {isClosed  && <ClosedSummaryCard register={register} sales={sales} />}

      {register && sales && <SalesBreakdown sales={sales} />}

      {/* Show movements only when open; when closed show read-only version */}
      {register && (
        <MovimientosCard movements={movements} canAdd={!!isOpen} />
      )}
    </div>
  );
}

// ── Abrir caja ────────────────────────────────────────────────────────────────
function OpenCajaCard() {
  const [cash, setCash]   = useState("");
  const [card, setCard]   = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const open = useOpenRegister();

  async function handleOpen() {
    const cashVal = parseFloat(cash);
    if (isNaN(cashVal) || cashVal < 0) { setError("Ingresa el efectivo inicial"); return; }
    setError(null);
    try {
      await open.mutateAsync({
        opening_cash: cashVal,
        opening_card: parseFloat(card) || 0,
        notes: notes || undefined,
      });
    } catch (e) { setError((e as Error).message); }
  }

  return (
    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
          <Wallet size={20} className="text-[var(--primary)]" />
        </div>
        <div>
          <p className="font-semibold text-[var(--foreground)]">Abrir caja</p>
          <p className="text-xs text-[var(--muted-foreground)]">Cuenta el dinero inicial de cada medio</p>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <AmountField label="Efectivo en caja" icon={<Banknote size={14} />} value={cash} onChange={setCash} autoFocus />
        <AmountField label="Saldo terminal (tarjeta)" icon={<CreditCard size={14} />} value={card} onChange={setCard} />
        <textarea
          placeholder="Notas (opcional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
        />
        {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
        <Button onClick={handleOpen} disabled={open.isPending} className="w-full">
          {open.isPending ? <><Loader2 size={14} className="animate-spin" /> Abriendo...</> : "Abrir caja"}
        </Button>
      </div>
    </div>
  );
}

// ── Caja abierta ──────────────────────────────────────────────────────────────
function OpenSummaryCard({
  register, sales,
}: {
  register: NonNullable<ReturnType<typeof useTodayRegister>["data"]>;
  sales: ReturnType<typeof useTodaySales>["data"];
}) {
  const [showClose, setShowClose] = useState(false);
  const [closingCash, setClosingCash] = useState("");
  const [closingCard, setClosingCard] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const close = useCloseRegister();

  const cashSales    = sales?.cash_sales ?? 0;
  const cardSalesNet = (sales?.card_sales ?? 0) * CARD_RATE;
  const expectedCash = register.opening_cash + cashSales;
  const expectedCard = (register.opening_card ?? 0) + cardSalesNet;

  const cashDiff = parseFloat(closingCash) - expectedCash;
  const cardDiff = parseFloat(closingCard) - expectedCard;
  const hasCash  = closingCash !== "" && !isNaN(parseFloat(closingCash));
  const hasCard  = closingCard !== "" && !isNaN(parseFloat(closingCard));

  async function handleClose() {
    if (!hasCash) { setError("Ingresa el efectivo contado"); return; }
    setError(null);
    try {
      await close.mutateAsync({
        id: register.id,
        closing_cash: parseFloat(closingCash),
        closing_card: parseFloat(closingCard) || 0,
        expected_cash: expectedCash,
        expected_card: expectedCard,
        total_sales: sales?.total_sales ?? 0,
        total_cash_sales: sales?.cash_sales ?? 0,
        total_card_sales: sales?.card_sales ?? 0,
        total_transfer_sales: sales?.transfer_sales ?? 0,
        notes: notes || undefined,
      });
    } catch (e) { setError((e as Error).message); }
  }

  return (
    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 bg-green-50 border-b border-green-100">
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle2 size={16} />
          <span className="text-sm font-medium">Caja abierta</span>
        </div>
      </div>

      <div className="p-5 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <MiniStat label="Efectivo inicial"    value={formatCurrency(register.opening_cash)} />
          <MiniStat label="Efectivo esperado"   value={formatCurrency(expectedCash)} highlight />
          <MiniStat label="Terminal inicial"    value={formatCurrency(register.opening_card ?? 0)} />
          <MiniStat label="Terminal esperada"   value={formatCurrency(expectedCard)} highlight />
        </div>

        <button
          onClick={() => setShowClose(!showClose)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
        >
          <Lock size={14} />
          Hacer corte
          {showClose ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showClose && (
          <div className="flex flex-col gap-3 pt-3 border-t border-[var(--border)]">
            <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
              Cuenta el dinero real
            </p>
            <AmountField label="Efectivo contado" icon={<Banknote size={14} />} value={closingCash} onChange={setClosingCash} />
            {hasCash && (
              <DiffRow label="Diferencia efectivo" diff={cashDiff} />
            )}
            <AmountField label="Saldo terminal" icon={<CreditCard size={14} />} value={closingCard} onChange={setClosingCard} />
            {hasCard && (
              <DiffRow label="Diferencia terminal" diff={cardDiff} />
            )}
            <textarea
              placeholder="Notas del corte (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
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

// ── Caja cerrada ──────────────────────────────────────────────────────────────
function ClosedSummaryCard({
  register, sales,
}: {
  register: NonNullable<ReturnType<typeof useTodayRegister>["data"]>;
  sales: ReturnType<typeof useTodaySales>["data"];
}) {
  const reopen = useReopenRegister();
  const diff = register.difference ?? 0;

  // Detect post-close sales
  const liveTotal = sales?.total_sales ?? 0;
  const recordedTotal = register.total_sales;
  const hasPostCloseSales = liveTotal > recordedTotal + 0.01;

  return (
    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 bg-[var(--muted)] border-b border-[var(--border)]">
        <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
          <Lock size={15} />
          <span className="text-sm font-medium">Caja cerrada</span>
        </div>
        <button
          onClick={() => reopen.mutate(register.id)}
          disabled={reopen.isPending}
          className="flex items-center gap-1 text-xs text-[var(--primary)] hover:opacity-80 transition-opacity"
        >
          {reopen.isPending ? <Loader2 size={12} className="animate-spin" /> : <Unlock size={12} />}
          Reabrir
        </button>
      </div>

      {hasPostCloseSales && (
        <div className="flex items-center gap-2 px-5 py-3 bg-amber-50 border-b border-amber-100 text-amber-700">
          <AlertTriangle size={14} />
          <p className="text-xs font-medium">
            Hay ventas de {formatCurrency(liveTotal - recordedTotal)} registradas después del corte
          </p>
        </div>
      )}

      <div className="p-5 grid grid-cols-2 gap-3 text-sm">
        <MiniStat label="Efectivo inicial"  value={formatCurrency(register.opening_cash)} />
        <MiniStat label="Efectivo contado"  value={formatCurrency(register.closing_cash!)} />
        <MiniStat label="Terminal inicial"  value={formatCurrency(register.opening_card ?? 0)} />
        <MiniStat label="Terminal contada"  value={formatCurrency(register.closing_card ?? 0)} />
        <div className="col-span-2">
          <MiniStat
            label={Math.abs(diff) < 0.01 ? "✓ Cuadra exacto" : diff > 0 ? "Sobrante total" : "Faltante total"}
            value={Math.abs(diff) < 0.01 ? "—" : formatCurrency(Math.abs(diff))}
            highlight={Math.abs(diff) < 0.01}
            color={Math.abs(diff) < 0.01 ? "green" : diff > 0 ? "blue" : "red"}
          />
        </div>
      </div>
      {register.notes && (
        <p className="px-5 pb-4 text-xs text-[var(--muted-foreground)] italic">"{register.notes}"</p>
      )}
    </div>
  );
}

// ── Desglose ventas ───────────────────────────────────────────────────────────
function SalesBreakdown({ sales }: { sales: NonNullable<ReturnType<typeof useTodaySales>["data"]> }) {
  const commission = sales.card_sales * (1 - CARD_RATE);
  return (
    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={16} className="text-[var(--primary)]" />
        <span className="text-sm font-semibold text-[var(--foreground)]">
          Ventas del día · {sales.sale_count} {sales.sale_count === 1 ? "venta" : "ventas"}
        </span>
      </div>
      <div className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between font-bold text-[var(--foreground)] pb-2 border-b border-[var(--border)]">
          <span>Total</span>
          <span className="font-mono">{formatCurrency(sales.total_sales)}</span>
        </div>
        <MethodRow icon={<Banknote size={14} />}       label="Efectivo"      amount={sales.cash_sales} />
        <MethodRow icon={<CreditCard size={14} />}     label="Tarjeta (bruto)" amount={sales.card_sales} />
        {commission > 0 && (
          <MethodRow icon={<CreditCard size={14} />}   label="  Comisión Mercado Pago (4.6%)" amount={-commission} muted />
        )}
        {commission > 0 && (
          <MethodRow icon={<CreditCard size={14} />}   label="  Neto tarjeta"  amount={sales.card_sales * CARD_RATE} sub />
        )}
        <MethodRow icon={<ArrowLeftRight size={14} />} label="Transferencia"  amount={sales.transfer_sales} />
      </div>
    </div>
  );
}

function MethodRow({ icon, label, amount, muted, sub }: {
  icon: React.ReactNode; label: string; amount: number; muted?: boolean; sub?: boolean;
}) {
  return (
    <div className={`flex justify-between items-center text-sm ${muted ? "text-red-500" : sub ? "text-green-600" : "text-[var(--muted-foreground)]"}`}>
      <span className="flex items-center gap-2">{icon}{label}</span>
      <span className="font-mono">{muted && amount < 0 ? "-" : ""}{formatCurrency(Math.abs(amount))}</span>
    </div>
  );
}

// ── Movimientos ───────────────────────────────────────────────────────────────
function MovimientosCard({
  movements, canAdd,
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
        type, amount: isOut ? -val : val,
        description: description.trim(), payment_method: "cash",
      });
      setAmount(""); setDescription(""); setShowForm(false);
    } catch (e) { setError((e as Error).message); }
  }

  const extraMovements = movements.filter((m) => m.type !== "sale");

  return (
    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
        <span className="text-sm font-semibold text-[var(--foreground)]">Movimientos extra</span>
        {canAdd && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1 text-xs text-[var(--primary)] font-medium hover:opacity-80"
          >
            <Plus size={13} /> Agregar
          </button>
        )}
        {!canAdd && (
          <span className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">
            <Lock size={11} /> Solo lectura
          </span>
        )}
      </div>

      {showForm && canAdd && (
        <div className="p-4 border-b border-[var(--border)] flex flex-col gap-3 bg-[var(--muted)]/40">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          >
            {MANUAL_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <div className="flex rounded-xl overflow-hidden border border-[var(--border)] text-sm">
            <button
              onClick={() => setIsOut(false)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors ${!isOut ? "bg-green-600 text-white" : "bg-[var(--background)] text-[var(--muted-foreground)]"}`}
            >
              <Plus size={13} /> Entrada
            </button>
            <button
              onClick={() => setIsOut(true)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors ${isOut ? "bg-red-500 text-white" : "bg-[var(--background)] text-[var(--muted-foreground)]"}`}
            >
              <Minus size={13} /> Salida
            </button>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] text-sm">$</span>
            <input type="number" inputMode="decimal" placeholder="0.00" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>
          <input type="text" placeholder="Descripción" value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
          {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-xl border border-[var(--border)] text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors">Cancelar</button>
            <Button onClick={handleAdd} disabled={add.isPending} className="flex-1">
              {add.isPending ? <Loader2 size={13} className="animate-spin" /> : "Guardar"}
            </Button>
          </div>
        </div>
      )}

      {extraMovements.length === 0 ? (
        <p className="text-center text-sm text-[var(--muted-foreground)] py-6">Sin movimientos extra hoy</p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {extraMovements.map((m) => (
            <li key={m.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">{MOVEMENT_LABELS[m.type] ?? m.type}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{m.description}</p>
              </div>
              <span className={`text-sm font-bold font-mono ${m.amount >= 0 ? "text-green-600" : "text-red-500"}`}>
                {m.amount >= 0 ? "+" : ""}{formatCurrency(m.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function AmountField({ label, icon, value, onChange, autoFocus }: {
  label: string; icon: React.ReactNode; value: string;
  onChange: (v: string) => void; autoFocus?: boolean;
}) {
  return (
    <div>
      <label className="text-xs text-[var(--muted-foreground)] mb-1 flex items-center gap-1.5">
        {icon}{label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] text-sm">$</span>
        <input type="number" inputMode="decimal" placeholder="0.00" value={value}
          onChange={(e) => onChange(e.target.value)} autoFocus={autoFocus}
          className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />
      </div>
    </div>
  );
}

function DiffRow({ label, diff }: { label: string; diff: number }) {
  const abs = Math.abs(diff);
  const color = abs < 0.01 ? "bg-green-50 text-green-700" : diff > 0 ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-600";
  return (
    <div className={`flex items-center justify-between rounded-xl px-4 py-2 text-sm ${color}`}>
      <span className="font-medium">
        {abs < 0.01 ? "✓ Cuadra" : diff > 0 ? `${label}: sobrante` : `${label}: faltante`}
      </span>
      <span className="font-bold font-mono">{abs < 0.01 ? "—" : formatCurrency(abs)}</span>
    </div>
  );
}

function MiniStat({ label, value, highlight, color }: {
  label: string; value: string; highlight?: boolean;
  color?: "green" | "blue" | "red";
}) {
  const text = color === "green" ? "text-green-600" : color === "blue" ? "text-blue-600" : color === "red" ? "text-red-500" : highlight ? "text-[var(--primary)]" : "text-[var(--foreground)]";
  return (
    <div className="bg-[var(--muted)] rounded-xl px-4 py-3">
      <p className="text-xs text-[var(--muted-foreground)] mb-0.5">{label}</p>
      <p className={`text-base font-bold font-mono ${text}`}>{value}</p>
    </div>
  );
}
