"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ChevronDown, ChevronUp, Lock, Unlock,
  Banknote, CreditCard, TrendingUp, Loader2, AlertTriangle,
} from "lucide-react";
import { useCajaHistory, useDayMovements, type CashRegisterHistoryRow } from "@/hooks/use-caja";
import { useMyRole } from "@/hooks/use-my-role";
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
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("es-MX", {
    month: "long", year: "numeric",
  });
}

const MOVEMENT_LABELS: Record<string, string> = {
  sale: "Venta", brand_payment: "Pago a marca", floor_income: "Renta de piso",
  salary: "Sueldo", rent: "Renta local", maintenance: "Mantenimiento",
  savings: "Ahorro", debt_payment: "Pago deuda", construction: "Construcción",
  production_reimbursement: "Reembolso producción", event_income: "Evento",
  deposit: "Depósito", withdrawal: "Retiro", adjustment: "Ajuste",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CajaHistorialPage() {
  const [month, setMonth]       = useState(currentMonth());
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: role, isLoading: roleLoading } = useMyRole();
  const { data: registers = [], isLoading } = useCajaHistory(month);

  const isAdmin = role === "admin" || role === "god";

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 flex flex-col items-center gap-4 text-center">
        <AlertTriangle size={40} className="text-[var(--destructive)] opacity-60" />
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Acceso restringido</h2>
        <p className="text-sm text-[var(--muted-foreground)]">Solo administradores pueden ver el historial de caja.</p>
        <Link href="/caja" className="text-sm text-[var(--primary)] hover:underline">← Volver a caja</Link>
      </div>
    );
  }

  const totalSales   = registers.reduce((s, r) => s + Number(r.total_sales), 0);
  const closedCount  = registers.filter((r) => r.closing_cash !== null).length;
  const openCount    = registers.filter((r) => r.closing_cash === null).length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/caja"
          className="p-1.5 rounded-lg hover:bg-[var(--muted)] transition-colors text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[var(--foreground)]">Historial de caja</h1>
          <p className="text-sm text-[var(--muted-foreground)] capitalize">{formatMonth(month)}</p>
        </div>
        {/* Month nav */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMonth(prevMonth(month))}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border)] hover:bg-[var(--muted)] transition-colors"
          >
            ‹
          </button>
          <button
            onClick={() => setMonth(nextMonth(month))}
            disabled={month >= currentMonth()}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border)] hover:bg-[var(--muted)] transition-colors disabled:opacity-40"
          >
            ›
          </button>
        </div>
      </div>

      {/* Month summary */}
      {registers.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <SummaryTile label="Días registrados" value={registers.length.toString()} />
          <SummaryTile label="Ventas del mes" value={formatCurrency(totalSales)} highlight />
          <SummaryTile
            label="Estado"
            value={`${closedCount} cerrado${closedCount !== 1 ? "s" : ""}, ${openCount} abierto${openCount !== 1 ? "s" : ""}`}
          />
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-[var(--muted-foreground)]">
          <Loader2 size={20} className="animate-spin mr-2" /> Cargando…
        </div>
      ) : registers.length === 0 ? (
        <div className="text-center py-12 text-[var(--muted-foreground)]">
          <Banknote size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Sin registros este mes</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {registers.map((reg) => (
            <RegisterCard
              key={reg.id}
              register={reg}
              isExpanded={expanded === reg.id}
              onToggle={() => setExpanded(expanded === reg.id ? null : reg.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Register card ────────────────────────────────────────────────────────────

function RegisterCard({
  register,
  isExpanded,
  onToggle,
}: {
  register: CashRegisterHistoryRow;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { data: movements = [] } = useDayMovements(isExpanded ? register.date : null);

  const isClosed = register.closing_cash !== null;
  const dateLabel = new Date(register.date + "T12:00:00").toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "short",
  });

  const diff = register.difference ?? 0;
  const diffColor = diff > 0.5 ? "text-[var(--primary)]" : diff < -0.5 ? "text-[var(--destructive)]" : "text-[var(--muted-foreground)]";

  return (
    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
      {/* Header row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--muted)]/30 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isClosed ? "bg-[var(--muted)]" : "bg-[var(--primary)]/10"
          }`}>
            {isClosed
              ? <Lock size={14} className="text-[var(--muted-foreground)]" />
              : <Unlock size={14} className="text-[var(--primary)]" />
            }
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)] capitalize">{dateLabel}</p>
            <p className="text-xs text-[var(--muted-foreground)]">
              {register.opened_by_name ?? "—"}
              {isClosed && register.closed_by_name && ` · cerró: ${register.closed_by_name}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-[var(--muted-foreground)]">Ventas</p>
            <p className="text-sm font-bold font-mono text-[var(--foreground)] tabular-nums">
              {formatCurrency(register.total_sales)}
            </p>
          </div>
          {isClosed && (
            <div className="text-right">
              <p className="text-xs text-[var(--muted-foreground)]">Diferencia</p>
              <p className={`text-sm font-bold font-mono tabular-nums ${diffColor}`}>
                {diff >= 0 ? "+" : ""}{formatCurrency(diff)}
              </p>
            </div>
          )}
          {!isClosed && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-medium">
              Abierta
            </span>
          )}
          {isExpanded
            ? <ChevronUp size={15} className="text-[var(--muted-foreground)]" />
            : <ChevronDown size={15} className="text-[var(--muted-foreground)]" />}
        </div>
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="border-t border-[var(--border)] px-5 py-4 flex flex-col gap-4">

          {/* Amounts grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Efectivo */}
            <div className="bg-[var(--muted)] rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted-foreground)]">
                <Banknote size={13} /> Efectivo
              </div>
              <AmountRow label="Apertura" value={register.opening_cash} />
              {isClosed && (
                <>
                  <AmountRow label="Esperado" value={register.expected_cash ?? 0} />
                  <AmountRow label="Contado" value={register.closing_cash ?? 0} />
                </>
              )}
            </div>
            {/* Terminal / Tarjeta */}
            <div className="bg-[var(--muted)] rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted-foreground)]">
                <CreditCard size={13} /> Terminal
              </div>
              <AmountRow label="Apertura" value={register.opening_card} />
              {isClosed && (
                <>
                  <AmountRow label="Esperado" value={register.expected_card ?? 0} />
                  <AmountRow label="Contado" value={register.closing_card ?? 0} />
                </>
              )}
            </div>
          </div>

          {/* Sales breakdown */}
          {isClosed && (
            <div className="bg-[var(--muted)] rounded-xl px-4 py-3 flex flex-col gap-1.5">
              <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-1 flex items-center gap-1.5">
                <TrendingUp size={12} /> Ventas del día
              </p>
              <AmountRow label="Efectivo" value={register.total_cash_sales} />
              <AmountRow label="Tarjeta" value={register.total_card_sales} />
              <AmountRow label="Transferencia" value={register.total_transfer_sales} />
              <div className="border-t border-[var(--border)] mt-1 pt-1.5">
                <AmountRow label="Total" value={register.total_sales} bold />
              </div>
            </div>
          )}

          {/* Movements */}
          <div>
            <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-2">
              Movimientos
            </p>
            {movements.length === 0 ? (
              <p className="text-xs text-[var(--muted-foreground)] italic">Sin movimientos registrados</p>
            ) : (
              <div className="flex flex-col gap-1">
                {movements.map((mov) => {
                  const isOut = mov.amount < 0;
                  const timeStr = new Date(mov.created_at).toLocaleTimeString("es-MX", {
                    hour: "2-digit", minute: "2-digit", timeZone: "America/Hermosillo",
                  });
                  return (
                    <div
                      key={mov.id}
                      className="flex items-center justify-between text-xs py-1.5 border-b border-[var(--border)] last:border-0"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[var(--muted-foreground)] tabular-nums flex-shrink-0">{timeStr}</span>
                        <div className="min-w-0">
                          <span className="text-[var(--foreground)] truncate block">
                            {MOVEMENT_LABELS[mov.type] ?? mov.type}
                          </span>
                          {mov.description && mov.type !== "sale" && (
                            <span className="text-[var(--muted-foreground)] truncate block">{mov.description}</span>
                          )}
                        </div>
                      </div>
                      <span className={`font-mono font-medium flex-shrink-0 ml-3 tabular-nums ${
                        isOut ? "text-[var(--destructive)]" : "text-[var(--primary)]"
                      }`}>
                        {isOut ? "" : "+"}{formatCurrency(mov.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {register.notes && (
            <p className="text-xs text-[var(--muted-foreground)] italic">"{register.notes}"</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function SummaryTile({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 flex flex-col gap-1">
      <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
      <p className={`text-sm font-bold font-mono tabular-nums ${
        highlight ? "text-[var(--primary)]" : "text-[var(--foreground)]"
      }`}>
        {value}
      </p>
    </div>
  );
}

function AmountRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-[var(--muted-foreground)]">{label}</span>
      <span className={`font-mono tabular-nums ${bold ? "font-bold text-[var(--foreground)]" : "text-[var(--foreground)]"}`}>
        {formatCurrency(value)}
      </span>
    </div>
  );
}
