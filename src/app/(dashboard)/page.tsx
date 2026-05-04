"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  TrendingUp, ShoppingCart, Banknote,
  AlertTriangle, ArrowRight, Package,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";

const TZ = "America/Hermosillo";
function todayLocal() {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}
function monthStart() {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
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
          .select("total")
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

      const paidSet = new Set((paidRes.data ?? []).map((p: any) => p.sale_item_id));
      const todaySales = todayRes.data ?? [];
      const monthSales = monthRes.data ?? [];
      const unpaid = (pendingRes.data ?? []).filter((i: any) => !paidSet.has(i.id));

      return {
        today_total:    todaySales.reduce((s, r) => s + Number(r.total), 0),
        today_count:    todaySales.length,
        today_cash:     todaySales.reduce((s, r) => s + Number(r.paid_cash), 0),
        today_card:     todaySales.reduce((s, r) => s + Number(r.paid_card), 0),
        today_transfer: todaySales.reduce((s, r) => s + Number(r.paid_transfer), 0),
        month_total:    monthSales.reduce((s, r) => s + Number(r.total), 0),
        month_count:    monthSales.length,
        pending_brands: unpaid.reduce((s: number, r: any) => s + Number(r.brand_amount), 0),
      };
    },
    staleTime: 60_000,
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
  const { data: stats } = useDashboardStats();
  const { data: lowStock = [] } = useLowStock();
  const { data: recentSales = [] } = useRecentSales();

  const dateLabel = new Date().toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long", timeZone: TZ,
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-6">
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
          value={formatCurrency(stats?.month_total ?? 0)}
          sub={`${stats?.month_count ?? 0} ventas`}
          icon={<TrendingUp size={18} />}
          color="green"
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
  label, value, sub, icon, color, href,
}: {
  label: string; value: string; sub: string;
  icon: React.ReactNode; color: keyof typeof colorMap; href?: string;
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
      </div>
    </div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : <div>{inner}</div>;
}

function MethodBar({ label, amount, total, color }: {
  label: string; amount: number; total: number; color: "green" | "blue" | "purple";
}) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
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
