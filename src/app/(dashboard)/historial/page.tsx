"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search, Receipt, Banknote, CreditCard, ArrowLeftRight,
  ChevronDown, ChevronUp, User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";

const CARD_COMMISSION = 0.046; // MercadoPago 4.6%
const IVA_FACTOR = 16 / 116;  // IVA incluido en precio

// ─── Types ────────────────────────────────────────────────────────────────────
interface SaleRow {
  id: string;
  folio: string;
  total: number;
  paid_cash: number;
  paid_card: number;
  paid_transfer: number;
  payment_method: string;
  status: string;
  notes: string | null;
  created_at: string;
  item_count: number;
  employee_name: string | null;
}

interface SaleDetail {
  id: string;
  quantity: number;
  unit_price: number;
  discount: number;
  subtotal: number;
  brand_amount: number;
  store_amount: number;
  variant: { sku: string; size: string | null; color: string | null };
  product: { name: string };
}

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useSales(search: string, dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ["historial-sales", search, dateFrom, dateTo],
    queryFn: async (): Promise<SaleRow[]> => {
      const supabase = createClient();
      let q = supabase
        .from("sales")
        .select(
          "id, folio, total, paid_cash, paid_card, paid_transfer, payment_method, status, notes, created_at, sale_items(count), employee:employees(full_name)"
        )
        .order("created_at", { ascending: false })
        .limit(100);

      if (dateFrom) q = q.gte("created_at", `${dateFrom}T00:00:00-07:00`);
      if (dateTo)   q = q.lte("created_at", `${dateTo}T23:59:59-07:00`);
      if (search)   q = q.ilike("folio", `%${search}%`);

      const { data, error } = await q;
      if (error) throw error;

      return (data ?? []).map((s: any) => ({
        ...s,
        item_count: s.sale_items?.[0]?.count ?? 0,
        employee_name: s.employee?.full_name ?? null,
      }));
    },
    staleTime: 30_000,
  });
}

function useSaleItems(saleId: string | null) {
  return useQuery({
    queryKey: ["sale-items", saleId],
    queryFn: async (): Promise<SaleDetail[]> => {
      if (!saleId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from("sale_items")
        .select(
          "id, quantity, unit_price, discount, subtotal, brand_amount, store_amount, variant:product_variants(sku, size, color), product:product_variants(product:products(name))"
        )
        .eq("sale_id", saleId);
      if (error) throw error;
      return (data ?? []).map((item: any) => ({
        id: item.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount,
        subtotal: item.subtotal,
        brand_amount: Number(item.brand_amount ?? 0),
        store_amount: Number(item.store_amount ?? 0),
        variant: item.variant,
        product: { name: item.product?.product?.name ?? "—" },
      }));
    },
    enabled: !!saleId,
    staleTime: 60_000,
  });
}

// ─── Realtime ─────────────────────────────────────────────────────────────────
function useSalesRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("sales-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sales" },
        () => {
          qc.invalidateQueries({ queryKey: ["historial-sales"] });
          qc.invalidateQueries({ queryKey: ["caja-sales-today"] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HistorialPage() {
  const [search, setSearch]     = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useSalesRealtime();
  const { data: sales = [], isLoading } = useSales(search, dateFrom, dateTo);

  const totalShown = sales.reduce((s, sale) => s + sale.total, 0);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">Historial de ventas</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {sales.length} {sales.length === 1 ? "venta" : "ventas"} · {formatCurrency(totalShown)}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            placeholder="Buscar por folio…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center text-sm text-[var(--muted-foreground)] py-10">Cargando…</div>
      ) : sales.length === 0 ? (
        <div className="text-center text-sm text-[var(--muted-foreground)] py-10">Sin resultados</div>
      ) : (
        <div className="flex flex-col gap-2">
          {sales.map((sale) => (
            <SaleCard
              key={sale.id}
              sale={sale}
              isExpanded={expanded === sale.id}
              onToggle={() => setExpanded(expanded === sale.id ? null : sale.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sale card ────────────────────────────────────────────────────────────────
function SaleCard({
  sale,
  isExpanded,
  onToggle,
}: {
  sale: SaleRow;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { data: items = [] } = useSaleItems(isExpanded ? sale.id : null);

  const date = new Date(sale.created_at).toLocaleString("es-MX", {
    dateStyle: "medium", timeStyle: "short", timeZone: "America/Hermosillo",
  });

  const methodIcon =
    sale.payment_method === "card"     ? <CreditCard size={13} />     :
    sale.payment_method === "transfer" ? <ArrowLeftRight size={13} /> :
    <Banknote size={13} />;

  // Financial calculations (sale-level)
  const iva        = sale.total * IVA_FACTOR;
  const commission = sale.paid_card * CARD_COMMISSION;

  // Items aggregations (available when expanded)
  const brandTotal = items.reduce((s, i) => s + i.brand_amount, 0);
  const storeTotal = items.reduce((s, i) => s + i.store_amount, 0);
  const storeNet   = storeTotal - commission;

  return (
    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
      {/* Header row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--muted)]/30 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
            <Receipt size={16} className="text-[var(--primary)]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)] font-mono">{sale.folio}</p>
            <p className="text-xs text-[var(--muted-foreground)]">{date}</p>
            {sale.employee_name && (
              <p className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] mt-0.5">
                <User size={11} /> {sale.employee_name}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-bold text-[var(--foreground)] font-mono">{formatCurrency(sale.total)}</p>
            <p className="flex items-center justify-end gap-1 text-xs text-[var(--muted-foreground)]">
              {methodIcon}
              {sale.payment_method === "cash"     ? "Efectivo"      :
               sale.payment_method === "card"     ? "Tarjeta"       :
               sale.payment_method === "transfer" ? "Transferencia" : "Mixto"}
            </p>
          </div>
          {isExpanded
            ? <ChevronUp size={16} className="text-[var(--muted-foreground)]" />
            : <ChevronDown size={16} className="text-[var(--muted-foreground)]" />}
        </div>
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="border-t border-[var(--border)] px-5 py-4 flex flex-col gap-4">

          {/* Payment breakdown */}
          {(sale.paid_cash > 0 || sale.paid_card > 0 || sale.paid_transfer > 0) && (
            <div className="grid grid-cols-3 gap-2 text-xs">
              {sale.paid_cash > 0 && (
                <div className="bg-[var(--muted)] rounded-lg px-3 py-2">
                  <p className="text-[var(--muted-foreground)]">Efectivo</p>
                  <p className="font-bold font-mono text-[var(--foreground)]">{formatCurrency(sale.paid_cash)}</p>
                </div>
              )}
              {sale.paid_card > 0 && (
                <div className="bg-[var(--muted)] rounded-lg px-3 py-2">
                  <p className="text-[var(--muted-foreground)]">Tarjeta</p>
                  <p className="font-bold font-mono text-[var(--foreground)]">{formatCurrency(sale.paid_card)}</p>
                </div>
              )}
              {sale.paid_transfer > 0 && (
                <div className="bg-[var(--muted)] rounded-lg px-3 py-2">
                  <p className="text-[var(--muted-foreground)]">Transferencia</p>
                  <p className="font-bold font-mono text-[var(--foreground)]">{formatCurrency(sale.paid_transfer)}</p>
                </div>
              )}
            </div>
          )}

          {/* Financial breakdown */}
          <div className="bg-[var(--muted)] rounded-xl px-4 py-3 flex flex-col gap-1.5 text-xs">
            <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-1">Desglose financiero</p>
            <FinRow label="IVA incluido (16%)" value={iva} muted />
            {commission > 0 && (
              <FinRow label="Comisión MercadoPago (4.6%)" value={-commission} negative />
            )}
            {items.length > 0 && (
              <>
                <div className="border-t border-[var(--border)] my-1" />
                <FinRow label="Por pagar a marcas" value={brandTotal} />
                <FinRow label="Ingreso tienda (neto)" value={storeNet} highlight />
              </>
            )}
          </div>

          {/* Items */}
          {items.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-2">Artículos</p>
              <ul className="flex flex-col gap-1.5">
                {items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="text-[var(--foreground)]">{item.product.name}</span>
                      <span className="text-[var(--muted-foreground)] text-xs ml-2">
                        {item.variant.sku}
                        {[item.variant.size, item.variant.color].filter(Boolean).join(" · ") && (
                          <> · {[item.variant.size, item.variant.color].filter(Boolean).join(" · ")}</>
                        )}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[var(--muted-foreground)] font-mono text-xs">
                        {item.quantity} × {formatCurrency(item.unit_price)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-[var(--muted-foreground)]">Cargando artículos…</p>
          )}

          {sale.notes && (
            <p className="text-xs text-[var(--muted-foreground)] italic">"{sale.notes}"</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── UI helpers ───────────────────────────────────────────────────────────────
function FinRow({
  label, value, muted = false, negative = false, highlight = false,
}: {
  label: string; value: number; muted?: boolean; negative?: boolean; highlight?: boolean;
}) {
  const textClass = highlight
    ? "text-[var(--primary)] font-bold"
    : negative
    ? "text-red-500 font-medium"
    : muted
    ? "text-[var(--muted-foreground)]"
    : "text-[var(--foreground)]";

  return (
    <div className="flex justify-between items-center">
      <span className="text-[var(--muted-foreground)]">{label}</span>
      <span className={`font-mono text-xs ${textClass}`}>
        {negative ? "-" : ""}{formatCurrency(Math.abs(value))}
      </span>
    </div>
  );
}
