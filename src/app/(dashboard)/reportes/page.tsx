"use client";

import { useState } from "react";
import {
  ChevronLeft, ChevronRight, TrendingUp, ShoppingCart,
  Package, CreditCard, Banknote, ArrowLeftRight, BarChart2,
  Users, Star,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  useMonthSummary,
  useDailySales,
  useBrandBreakdown,
  useTopProducts,
  useEmployeeBreakdown,
} from "@/hooks/use-reportes";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function currentMonth(): string {
  // Hermosillo UTC-7
  const now = new Date(Date.now() - 7 * 3600 * 1000);
  return now.toISOString().slice(0, 7);
}

function prevMonth(m: string): string {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextMonth(m: string): string {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(m: string): string {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });
}

function pct(part: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent?: string;
}) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex items-start gap-3">
      <div
        className={`p-2 rounded-lg ${accent ?? "bg-blue-500/10"}`}
      >
        <Icon size={18} className={accent ? "text-white" : "text-blue-500"} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
        <p className="text-lg font-bold text-[var(--foreground)] leading-tight">{value}</p>
        {sub && <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Bar Chart (CSS) ─────────────────────────────────────────────────────────

function MiniBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pctVal = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-8 text-right text-[var(--muted-foreground)] shrink-0">{label}</span>
      <div className="flex-1 bg-[var(--muted)] rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${pctVal}%` }}
        />
      </div>
      <span className="w-20 text-right text-[var(--foreground)] font-medium shrink-0">
        {formatCurrency(value)}
      </span>
    </div>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} className="text-[var(--muted-foreground)]" />
        <h2 className="text-sm font-semibold text-[var(--foreground)]">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportesPage() {
  const [month, setMonth] = useState(currentMonth);
  const isCurrentMonth = month === currentMonth();

  const { data: summary, isLoading: sumLoading } = useMonthSummary(month);
  const { data: daily, isLoading: dailyLoading } = useDailySales(month);
  const { data: brands, isLoading: brandsLoading } = useBrandBreakdown(month);
  const { data: topProducts, isLoading: topLoading } = useTopProducts(month, 10);
  const { data: employees, isLoading: empLoading } = useEmployeeBreakdown(month);

  const maxDayRevenue = Math.max(...(daily ?? []).map((d) => d.revenue), 1);
  const maxBrandRevenue = Math.max(...(brands ?? []).map((b) => b.revenue), 1);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--card)] flex-shrink-0">
        <div>
          <h1 className="text-base font-bold text-[var(--foreground)]">Reportes de ventas</h1>
          <p className="text-xs text-[var(--muted-foreground)]">
            Análisis mensual · {monthLabel(month)}
          </p>
        </div>

        {/* Month navigator */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMonth(prevMonth)}
            className="p-1.5 rounded-lg hover:bg-[var(--muted)] transition-colors text-[var(--muted-foreground)]"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-[var(--foreground)] min-w-[130px] text-center capitalize">
            {monthLabel(month)}
          </span>
          <button
            onClick={() => !isCurrentMonth && setMonth(nextMonth)}
            disabled={isCurrentMonth}
            className="p-1.5 rounded-lg hover:bg-[var(--muted)] transition-colors text-[var(--muted-foreground)] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Summary Cards */}
        {sumLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-[var(--muted)] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : summary ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="Ventas totales"
                value={formatCurrency(summary.totalRevenue)}
                sub={`${summary.totalTransactions} transacciones`}
                icon={TrendingUp}
                accent="bg-green-500/10"
              />
              <StatCard
                label="Ticket promedio"
                value={formatCurrency(summary.avgTicket)}
                sub={`${summary.totalItems} artículos vendidos`}
                icon={ShoppingCart}
                accent="bg-blue-500/10"
              />
              <StatCard
                label="IVA acumulado"
                value={formatCurrency(summary.totalIva)}
                sub="16% incluido en tarjeta"
                icon={Package}
                accent="bg-amber-500/10"
              />
              <StatCard
                label="Pago en efectivo"
                value={formatCurrency(summary.byPayment.cash)}
                sub={pct(summary.byPayment.cash, summary.totalRevenue) + " del total"}
                icon={Banknote}
                accent="bg-emerald-500/10"
              />
            </div>

            {/* Payment method breakdown */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard size={16} className="text-[var(--muted-foreground)]" />
                <h2 className="text-sm font-semibold text-[var(--foreground)]">Métodos de pago</h2>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { label: "Efectivo", value: summary.byPayment.cash, icon: Banknote, color: "text-green-500" },
                  { label: "Tarjeta", value: summary.byPayment.card, icon: CreditCard, color: "text-blue-500" },
                  { label: "Transferencia", value: summary.byPayment.transfer, icon: ArrowLeftRight, color: "text-purple-500" },
                ].map(({ label, value, icon: Ico, color }) => (
                  <div key={label} className="flex flex-col items-center gap-1">
                    <Ico size={20} className={color} />
                    <p className="text-sm font-bold text-[var(--foreground)]">{formatCurrency(value)}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {label} · {pct(value, summary.totalRevenue)}
                    </p>
                    {/* Mini bar */}
                    <div className="w-full bg-[var(--muted)] rounded-full h-1.5 mt-1">
                      <div
                        className={`h-full rounded-full ${color.replace("text-", "bg-")}`}
                        style={{ width: pct(value, summary.totalRevenue) }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}

        {/* Daily Chart */}
        <Section title="Ventas por día" icon={BarChart2}>
          {dailyLoading ? (
            <div className="h-40 flex items-center justify-center">
              <span className="text-sm text-[var(--muted-foreground)]">Cargando…</span>
            </div>
          ) : (daily ?? []).length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-6">
              Sin ventas este mes
            </p>
          ) : (
            <div className="space-y-2">
              {(daily ?? []).map((d) => {
                const dayNum = d.date.slice(8); // DD
                return (
                  <MiniBar key={d.date} label={dayNum} value={d.revenue} max={maxDayRevenue} />
                );
              })}
            </div>
          )}
        </Section>

        {/* Brand Breakdown */}
        <Section title="Desempeño por marca" icon={Users}>
          {brandsLoading ? (
            <div className="h-24 flex items-center justify-center">
              <span className="text-sm text-[var(--muted-foreground)]">Cargando…</span>
            </div>
          ) : (brands ?? []).length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-6">Sin datos</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[var(--muted-foreground)] text-xs border-b border-[var(--border)]">
                    <th className="text-left pb-2 font-medium">Marca</th>
                    <th className="text-right pb-2 font-medium">Ingresos</th>
                    <th className="text-right pb-2 font-medium">Artículos</th>
                    <th className="text-right pb-2 font-medium hidden md:table-cell">Comisión tienda</th>
                    <th className="text-right pb-2 font-medium hidden md:table-cell">Monto marca</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {(brands ?? []).map((b) => (
                    <tr key={b.brandId ?? "none"} className="hover:bg-[var(--muted)]/50">
                      <td className="py-2 font-medium text-[var(--foreground)]">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                          {b.brandName}
                        </div>
                      </td>
                      <td className="py-2 text-right text-[var(--foreground)]">
                        <div>{formatCurrency(b.revenue)}</div>
                        <div className="text-xs text-[var(--muted-foreground)]">
                          {pct(b.revenue, maxBrandRevenue)}
                        </div>
                      </td>
                      <td className="py-2 text-right text-[var(--muted-foreground)]">{b.items}</td>
                      <td className="py-2 text-right text-green-600 hidden md:table-cell">
                        {formatCurrency(b.storeAmount)}
                      </td>
                      <td className="py-2 text-right text-blue-600 hidden md:table-cell">
                        {formatCurrency(b.brandAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* Top Products */}
        <Section title="Productos más vendidos" icon={Star}>
          {topLoading ? (
            <div className="h-24 flex items-center justify-center">
              <span className="text-sm text-[var(--muted-foreground)]">Cargando…</span>
            </div>
          ) : (topProducts ?? []).length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-6">Sin datos</p>
          ) : (
            <div className="space-y-2">
              {(topProducts ?? []).map((p, i) => (
                <div
                  key={p.productId}
                  className="flex items-center gap-3 py-1.5 border-b border-[var(--border)] last:border-0"
                >
                  <span className="w-5 h-5 rounded-full bg-[var(--muted)] flex items-center justify-center text-xs font-bold text-[var(--muted-foreground)] shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--foreground)] truncate">{p.productName}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {p.brandName ?? "Sin marca"} · SKU: {p.sku}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-[var(--foreground)]">{p.totalQty} uds.</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{formatCurrency(p.totalRevenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Employee Breakdown */}
        <Section title="Ventas por empleado" icon={Users}>
          {empLoading ? (
            <div className="h-24 flex items-center justify-center">
              <span className="text-sm text-[var(--muted-foreground)]">Cargando…</span>
            </div>
          ) : (employees ?? []).length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-6">Sin datos</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[var(--muted-foreground)] text-xs border-b border-[var(--border)]">
                    <th className="text-left pb-2 font-medium">Empleado</th>
                    <th className="text-right pb-2 font-medium">Transacciones</th>
                    <th className="text-right pb-2 font-medium">Total vendido</th>
                    <th className="text-right pb-2 font-medium hidden md:table-cell">Ticket prom.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {(employees ?? []).map((e) => (
                    <tr key={e.employeeId} className="hover:bg-[var(--muted)]/50">
                      <td className="py-2 font-medium text-[var(--foreground)]">{e.employeeName}</td>
                      <td className="py-2 text-right text-[var(--muted-foreground)]">{e.transactions}</td>
                      <td className="py-2 text-right text-[var(--foreground)] font-medium">
                        {formatCurrency(e.revenue)}
                      </td>
                      <td className="py-2 text-right text-[var(--muted-foreground)] hidden md:table-cell">
                        {formatCurrency(e.transactions > 0 ? e.revenue / e.transactions : 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

      </div>
    </div>
  );
}
