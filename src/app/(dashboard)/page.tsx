"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  TrendingUp, ShoppingCart, Banknote,
  AlertTriangle, ArrowRight, Package, Target,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { useConfig } from "@/hooks/use-configuracion";

const TZ = "America/Hermosillo";

function todayLocal() {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}
function monthStart() {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function daysRemainingInMonth(): number {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return last - now.getDate() + 1; // includes today
}
function daysInCurrentMonth(): number {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats", todayLocal()],
    queryFn: async () => {
      const supabase = createClient();
      const today = todayLocal();
      const month = monthStart();

      const [todayRes, monthRes, pendingRes, paidRes] = await Promise.all([
        supabase
          .from("sales")
          .select("total, paid_cash, paid_card, paid_transfer")
          .eq("status", "completed")
          .gte("created_at", `${today}T00:00:00-07:00`)
          .lt("created_at", `${today}T23:59:59-07:00`),
        supabase
          .from("sales")
          .select("total, sale_items(store_amount)")
          .eq("status", "completed")
          .gte("created_at", `${month}T00:00:00-07:00`),
        supabase
          .from("sale_items")
          .select("id, brand_amount")
          .not("brand_id", "is", null)
          .gt("brand_amount", 0),
        supabase
          .from("brand_payout_items")
          .select("sale_item_id"),
      ]);

      const paidSet   = new Set((paidRes.data ?? []).map((p: any) => p.sale_item_id));
      const todaySales = todayRes.data ?? [];
      const monthSales = monthRes.data ?? [];
      const unpaid     = (pendingRes.data ?? []).filter((i: any) => !paidSet.has(i.id));

      return {
        today_total:    todaySales.reduce((s, r) => s + Number(r.total), 0),
        today_count:    todaySales.length,
        today_cash:     todaySales.reduce((s, r) => s + Number(r.paid_cash), 0),
        today_card:     todaySales.reduce((s, r) => s + Number(r.paid_card), 0),
        today_transfer: todaySales.reduce((s, r) => s + Number(r.paid_transfer), 0),
        month_total:    monthSales.reduce((s, r) => s + Number(r.total), 0),
        month_store_net: monthSales.reduce((s, r) => s + (r.sale_items ?? []).reduce((si: number, item: any) => si + Number(item.store_amount ?? 0), 0), 0),
        month_count:    monthSales.length,
        pending_brands: unpaid.reduce((s: number, r: any) => s + Number(r.brand_amount), 0),
      };
    },
    staleTime: 60_000,
  });
}

function useLastMonthStats() {
  return useQuery({
    queryKey: ["dashboard-last-month"],
    queryFn: async () => {
      const supabase = createClient();
      const now = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
      const year  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const month = now.getMonth() === 0 ? 12 : now.getMonth(); // 1-based
      const from  = `${year}-${String(month).padStart(2, "0")}-01`;
      const days  = new Date(year, month, 0).getDate();
      const to    = `${year}-${String(month).padStart(2, "0")}-${days}`;

      const { data, error } = await supabase
        .from("sales")
        .select("total")
        .eq("status", "completed")
        .gte("created_at", `${from}T00:00:00-07:00`)
        .lte("created_at", `${to}T23:59:59-07:00`);
      if (error) throw error;
      return (data ?? []).reduce((s, r) => s + Number(r.total), 0);
    },
    staleTime: 5 * 60_000,
  });
}

function useDayOfWeekStats() {
  return useQuery({
    queryKey: ["dashboard-dow"],
    queryFn: async () => {
      const supabase = createClient();
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);
      const fromDate = cutoff.toLocaleDateString("en-CA", { timeZone: TZ });

      const { data, error } = await supabase
        .from("sales")
        .select("total, created_at")
        .eq("status", "completed")
        .gte("created_at", `${fromDate}T00:00:00-07:00`);
      if (error) throw error;

      // Group by local day of week
      const totals: Record<number, number> = { 0:0,1:0,2:0,3:0,4:0,5:0,6:0 };
      const uniqueDays: Record<number, Set<string>> = { 0:new Set(),1:new Set(),2:new Set(),3:new Set(),4:new Set(),5:new Set(),6:new Set() };

      for (const sale of data ?? []) {
        const localDate = new Date(sale.created_at).toLocaleDateString("en-CA", { timeZone: TZ });
        // day of week from the local date string
        const dow = new Date(localDate + "T12:00:00").getDay();
        totals[dow] += Number(sale.total);
        uniqueDays[dow].add(localDate);
      }

      const labels = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
      return labels.map((label, dow) => ({
        label,
        avg: uniqueDays[dow].size > 0 ? totals[dow] / uniqueDays[dow].size : 0,
      }));
    },
    staleTime: 5 * 60_000,
  });
}

function useLowStock() {
  return useQuery({
    queryKey: ["dashboard-low-stock"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("product_variants")
        .select("sku, stock, low_stock_threshold, product:products(name)")
        .eq("is_active", true)
        .order("stock", { ascending: true })
        .limit(20);
      if (error) throw error;
      return (data ?? []).filter((v: any) => v.stock <= v.low_stock_threshold);
    },
    staleTime: 60_000,
  });
}

function useRecentSales() {
  return useQuery({
    queryKey: ["dashboard-recent-sales"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("sales")
        .select("id, folio, total, payment_method, created_at")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

function useDashboardRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sales" }, () => {
        qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
        qc.invalidateQueries({ queryKey: ["dashboard-recent-sales"] });
        qc.invalidateQueries({ queryKey: ["dashboard-dow"] });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "product_variants" }, () => {
        qc.invalidateQueries({ queryKey: ["dashboard-low-stock"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  useDashboardRealtime();
  const { data: stats }           = useDashboardStats();
  const { data: lastMonth = 0 }   = useLastMonthStats();
  const { data: dow = [] }        = useDayOfWeekStats();
  const { data: lowStock = [] }   = useLowStock();
  const { data: recentSales = [] } = useRecentSales();
  const { data: config }          = useConfig();

  const monthlyGoal    = config?.monthly_goal ?? 0;
  const monthTotal     = stats?.month_total ?? 0;
  const monthStoreNet  = stats?.month_store_net ?? 0;
  const goalPct        = monthlyGoal > 0 ? Math.min(100, (monthStoreNet / monthlyGoal) * 100) : 0;
  const remaining      = Math.max(0, monthlyGoal - monthStoreNet);
  const daysLeft       = daysRemainingInMonth();
  const dailyTarget    = daysLeft > 0 ? remaining / daysLeft : 0;

  const monthChange   = lastMonth > 0
    ? ((monthTotal - lastMonth) / lastMonth) * 100
    : null;

  const maxDow = Math.max(...dow.map((d) => d.avg), 1);

  const dateLabel = new Date().toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long", timeZone: TZ,
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">Dashboard</h1>
        <p className="text-sm text-[var(--muted-foreground)] capitalize">{dateLabel}</p>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Ventas hoy"
          value={formatCurrency(stats?.today_total ?? 0)}
          sub={`${stats?.today_count ?? 0} ${stats?.today_count === 1 ? "venta" : "ventas"}`}
          icon={<ShoppingCart size={18} />}
          color="primary"
        />
        <StatCard
          label="Ventas del mes"
          value={formatCurrency(monthTotal)}
          sub={`${stats?.month_count ?? 0} ventas`}
          icon={<TrendingUp size={18} />}
          color="green"
          badge={monthChange !== null
            ? { label: `${monthChange >= 0 ? "+" : ""}${monthChange.toFixed(0)}% vs mes ant.`, positive: monthChange >= 0 }
            : undefined}
        />
        <StatCard
          label="Pendiente marcas"
          value={formatCurrency(stats?.pending_brands ?? 0)}
          sub="por liquidar"
          icon={<Banknote size={18} />}
          color={stats?.pending_brands ? "amber" : "muted"}
          href="/liquidaciones"
        />
        <StatCard
          label="Stock bajo"
          value={String(lowStock.length)}
          sub={lowStock.length === 0 ? "sin alertas" : lowStock.length === 1 ? "variante" : "variantes"}
          icon={<AlertTriangle size={18} />}
          color={lowStock.length > 0 ? "red" : "muted"}
          href="/inventario"
        />
      </div>

      {/* ── Goal progress ──────────────────────────────────────────────────── */}
      {monthlyGoal > 0 && (
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target size={15} className="text-[var(--primary)]" />
              <p className="text-sm font-semibold text-[var(--foreground)]">Meta mensual</p>
            </div>
            <span className="text-sm font-bold font-mono text-[var(--primary)]">{goalPct.toFixed(1)}%</span>
          </div>

          {/* Progress bar */}
          <div className="h-2.5 bg-[var(--muted)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--primary)] rounded-full transition-all duration-500"
              style={{ width: `${goalPct}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-[var(--muted-foreground)]">Neto tienda</p>
              <p className="font-bold font-mono text-[var(--foreground)]">{formatCurrency(monthStoreNet)}</p>
            </div>
            <div>
              <p className="text-[var(--muted-foreground)]">Meta</p>
              <p className="font-bold font-mono text-[var(--foreground)]">{formatCurrency(monthlyGoal)}</p>
            </div>
            <div>
              <p className="text-[var(--muted-foreground)]">Meta/día restante</p>
              <p className={`font-bold font-mono ${dailyTarget > 0 ? "text-amber-600" : "text-green-600"}`}>
                {formatCurrency(dailyTarget)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Today breakdown ────────────────────────────────────────────────── */}
      {(stats?.today_total ?? 0) > 0 && (
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-5">
          <p className="text-sm font-semibold text-[var(--foreground)] mb-3">Desglose de hoy</p>
          <div className="flex flex-col gap-2">
            {stats!.today_cash > 0 && (
              <MethodBar label="Efectivo" amount={stats!.today_cash} total={stats!.today_total} color="green" />
            )}
            {stats!.today_card > 0 && (
              <MethodBar label="Tarjeta" amount={stats!.today_card} total={stats!.today_total} color="blue" />
            )}
            {stats!.today_transfer > 0 && (
              <MethodBar label="Transferencia" amount={stats!.today_transfer} total={stats!.today_total} color="purple" />
            )}
          </div>
        </div>
      )}

      {/* ── Day of week pattern ────────────────────────────────────────────── */}
      {dow.some((d) => d.avg > 0) && (
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-5">
          <p className="text-sm font-semibold text-[var(--foreground)] mb-4">Ventas promedio por día (90 días)</p>
          <div className="flex items-end gap-2 h-24">
            {dow.map((d) => {
              const height = maxDow > 0 ? (d.avg / maxDow) * 100 : 0;
              const isToday = new Date().toLocaleDateString("en-CA", { timeZone: TZ }) &&
                d.label === ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"][new Date().getDay()];
              return (
                <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end justify-center" style={{ height: "80px" }}>
                    <div
                      className={`w-full rounded-t-md transition-all ${isToday ? "bg-[var(--primary)]" : "bg-[var(--primary)]/30"}`}
                      style={{ height: `${Math.max(height, d.avg > 0 ? 4 : 0)}%` }}
                      title={formatCurrency(d.avg)}
                    />
                  </div>
                  <span className={`text-[10px] font-medium ${isToday ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"}`}>
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-[var(--muted-foreground)]">
            <span>$0</span>
            <span>{formatCurrency(maxDow)} máx.</span>
          </div>
        </div>
      )}

      {/* ── Low stock ──────────────────────────────────────────────────────── */}
      {lowStock.length > 0 && (
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle size={15} />
              <span className="text-sm font-semibold">Stock bajo</span>
            </div>
            <Link href="/inventario" className="text-xs text-[var(--primary)] flex items-center gap-1 hover:opacity-80">
              Ver inventario <ArrowRight size={12} />
            </Link>
          </div>
          <ul className="divide-y divide-[var(--border)]">
            {(lowStock as any[]).slice(0, 6).map((v) => (
              <li key={v.sku} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm text-[var(--foreground)]">{v.product?.name ?? "—"}</p>
                  <p className="text-xs text-[var(--muted-foreground)] font-mono">{v.sku}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${v.stock === 0 ? "text-red-500" : "text-amber-600"}`}>
                    {v.stock} {v.stock === 1 ? "pieza" : "piezas"}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">mín. {v.low_stock_threshold}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Recent sales ───────────────────────────────────────────────────── */}
      {recentSales.length > 0 ? (
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
            <span className="text-sm font-semibold text-[var(--foreground)]">Ventas recientes</span>
            <Link href="/historial" className="text-xs text-[var(--primary)] flex items-center gap-1 hover:opacity-80">
              Ver todo <ArrowRight size={12} />
            </Link>
          </div>
          <ul className="divide-y divide-[var(--border)]">
            {(recentSales as any[]).map((sale) => {
              const time = new Date(sale.created_at).toLocaleTimeString("es-MX", {
                hour: "2-digit", minute: "2-digit", timeZone: TZ,
              });
              return (
                <li key={sale.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-mono font-medium text-[var(--foreground)]">{sale.folio}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{time}</p>
                  </div>
                  <p className="text-sm font-bold font-mono text-[var(--foreground)]">
                    {formatCurrency(sale.total)}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-[var(--muted-foreground)]">
          <Package size={44} className="mb-3 opacity-20" />
          <p className="text-sm">Sin ventas hoy — ve al POS para comenzar</p>
          <Link href="/pos" className="mt-3 text-sm text-[var(--primary)] underline">
            Abrir POS →
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── UI helpers ───────────────────────────────────────────────────────────────
const colorMap = {
  primary: { bg: "bg-[var(--primary)]/10", text: "text-[var(--primary)]" },
  green:   { bg: "bg-green-50",            text: "text-green-600" },
  amber:   { bg: "bg-amber-50",            text: "text-amber-600" },
  red:     { bg: "bg-red-50",              text: "text-red-500" },
  muted:   { bg: "bg-[var(--muted)]",      text: "text-[var(--muted-foreground)]" },
};

function StatCard({
  label, value, sub, icon, color, href, badge,
}: {
  label: string; value: string; sub: string;
  icon: React.ReactNode; color: keyof typeof colorMap; href?: string;
  badge?: { label: string; positive: boolean };
}) {
  const { bg, text } = colorMap[color];
  const inner = (
    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-4 flex flex-col gap-3 hover:shadow-sm transition-shadow h-full">
      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center ${text}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
        <p className="text-xl font-bold font-mono text-[var(--foreground)] leading-tight">{value}</p>
        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{sub}</p>
        {badge && (
          <span className={`inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${badge.positive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
            {badge.label}
          </span>
        )}
      </div>
    </div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : <div>{inner}</div>;
}

function MethodBar({ label, amount, total, color }: {
  label: string; amount: number; total: number; color: "green" | "blue" | "purple";
}) {
  const pct  = total > 0 ? (amount / total) * 100 : 0;
  const bar  = color === "green" ? "bg-green-500" : color === "blue" ? "bg-blue-500" : "bg-[var(--primary)]";
  const text = color === "green" ? "text-green-600" : color === "blue" ? "text-blue-600" : "text-[var(--primary)]";
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-sm">
        <span className="text-[var(--muted-foreground)]">{label}</span>
        <span className={`font-bold font-mono ${text}`}>{formatCurrency(amount)}</span>
      </div>
      <div className="h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
        <div className={`h-full ${bar} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
