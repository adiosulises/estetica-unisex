"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Package, Trash2, Plus, Minus, CheckCircle, ShoppingCart, Camera } from "lucide-react";
import { useSearchVariantes, useCreateSale } from "@/hooks/use-pos";
import { PaymentModal } from "@/components/pos/payment-modal";
import { QrScanner } from "@/components/pos/qr-scanner";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { CartItem, VarianteSearchResult } from "@/types/ventas";

type MobileTab = "search" | "cart";

export default function PosPage() {
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("search");
  const [saleResult, setSaleResult] = useState<{ folio: string; total: number; change: number } | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const createSale = useCreateSale();

  const { data: results = [], isFetching } = useSearchVariantes(query);

  // Auto-focus search on load (desktop only)
  useEffect(() => {
    if (window.innerWidth >= 1024) searchRef.current?.focus();
  }, []);

  // ── Carrito ──────────────────────────────────────────────────────────────
  function addToCart(v: VarianteSearchResult) {
    setCart((prev) => {
      const existing = prev.find((c) => c.variantId === v.id);
      if (existing) {
        if (existing.quantity >= existing.stock) return prev;
        return prev.map((c) =>
          c.variantId === v.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prev,
        {
          variantId:   v.id,
          sku:         v.sku,
          productName: v.productName,
          brandName:   v.brandName,
          photoUrl:    v.photoUrl,
          size:        v.size,
          color:       v.color,
          unitPrice:   v.price ?? v.basePrice,
          stock:       v.stock,
          quantity:    1,
          discount:    0,
        },
      ];
    });
    setQuery("");
    if (window.innerWidth >= 1024) searchRef.current?.focus();
  }

  function updateQty(variantId: string, delta: number) {
    setCart((prev) =>
      prev.map((c) =>
        c.variantId === variantId
          ? { ...c, quantity: Math.min(c.stock, Math.max(1, c.quantity + delta)) }
          : c
      )
    );
  }

  function removeItem(variantId: string) {
    setCart((prev) => prev.filter((c) => c.variantId !== variantId));
  }

  function clearCart() {
    setCart([]);
    setQuery("");
    setSaleResult(null);
    setMobileTab("search");
    setTimeout(() => searchRef.current?.focus(), 50);
  }

  // ── QR scan ──────────────────────────────────────────────────────────────
  async function handleQrScan(raw: string) {
    setShowScanner(false);
    const sku = raw.trim();
    if (!sku) return;

    const supabase = createClient();
    type RawVariant = {
      id: string; sku: string; size: string | null; color: string | null;
      price: number | null; stock: number;
      product: { id: string; name: string; base_price: number; photo_url: string | null; brand: { name: string } | null } | null;
    };
    const { data, error } = await supabase
      .from("product_variants")
      .select("id, sku, size, color, price, stock, product:products(id, name, base_price, photo_url, brand:brands(name))")
      .eq("sku", sku)
      .eq("is_active", true)
      .gt("stock", 0)
      .maybeSingle();

    if (error || !data) return;

    const v = data as RawVariant;
    addToCart({
      id: v.id, sku: v.sku, size: v.size, color: v.color, price: v.price, stock: v.stock,
      productId: v.product?.id ?? "", productName: v.product?.name ?? "",
      basePrice: v.product?.base_price ?? 0, photoUrl: v.product?.photo_url ?? null,
      brandName: v.product?.brand?.name ?? null,
    });
  }

  // ── Totales ──────────────────────────────────────────────────────────────
  const subtotal = cart.reduce((s, c) => s + c.unitPrice * c.quantity, 0);
  const totalDiscount = cart.reduce((s, c) => s + c.discount, 0);
  const total = subtotal - totalDiscount;

  // ── Cobro ────────────────────────────────────────────────────────────────
  async function handleConfirmPayment(payment: {
    paidCash: number;
    paidCard: number;
    paidTransfer: number;
  }) {
    const result = await createSale.mutateAsync({
      items: cart.map((c) => ({
        variant_id: c.variantId,
        quantity:   c.quantity,
        unit_price: c.unitPrice,
        discount:   c.discount,
      })),
      paid_cash:     payment.paidCash,
      paid_card:     payment.paidCard,
      paid_transfer: payment.paidTransfer,
    });
    const change = Math.max(0, payment.paidCash - total);
    setSaleResult({ folio: result.folio, total: result.total, change });
    setShowPayment(false);
    setCart([]);
  }

  // ── Venta completada ─────────────────────────────────────────────────────
  if (saleResult) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-10 text-center max-w-sm w-full shadow-lg">
          <CheckCircle size={52} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[var(--foreground)] mb-1">¡Venta completada!</h2>
          <p className="text-sm text-[var(--muted-foreground)] mb-6">
            Folio <span className="font-mono font-bold text-[var(--foreground)]">{saleResult.folio}</span>
          </p>
          <div className="bg-[var(--muted)] rounded-xl p-4 mb-6 text-left flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--muted-foreground)]">Total cobrado</span>
              <span className="font-bold text-[var(--foreground)]">{formatCurrency(saleResult.total)}</span>
            </div>
            {saleResult.change > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">Cambio</span>
                <span className="font-bold text-green-600">{formatCurrency(saleResult.change)}</span>
              </div>
            )}
          </div>
          <Button onClick={clearCart} size="lg" className="w-full">
            Nueva venta
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Mobile tab bar ────────────────────────────────────────────────── */}
      <div className="lg:hidden flex border-b border-[var(--border)] bg-[var(--card)] flex-shrink-0">
        <button
          onClick={() => setMobileTab("search")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 ${
            mobileTab === "search"
              ? "border-[var(--primary)] text-[var(--primary)]"
              : "border-transparent text-[var(--muted-foreground)]"
          }`}
        >
          <Search size={15} />
          Productos
        </button>
        <button
          onClick={() => setMobileTab("cart")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 relative ${
            mobileTab === "cart"
              ? "border-[var(--primary)] text-[var(--primary)]"
              : "border-transparent text-[var(--muted-foreground)]"
          }`}
        >
          <ShoppingCart size={15} />
          Carrito
          {cart.length > 0 && (
            <span className="absolute top-2 right-[calc(50%-22px)] min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--primary)] text-white text-[10px] font-bold flex items-center justify-center">
              {cart.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Main panels ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Panel búsqueda ──────────────────────────────────────────────── */}
        <div className={`flex-1 flex flex-col min-w-0 border-r border-[var(--border)] overflow-hidden ${
          mobileTab === "cart" ? "hidden lg:flex" : "flex"
        }`}>
          {/* Barra de búsqueda */}
          <div className="p-3 border-b border-[var(--border)] bg-[var(--background)] flex-shrink-0">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                {isFetching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                )}
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="SKU o nombre de producto…"
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setShowScanner(true)}
                title="Escanear QR"
                className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors"
              >
                <Camera size={17} />
              </button>
            </div>
          </div>

          {/* Resultados */}
          <div className="flex-1 overflow-y-auto p-3">
            {!query ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-[var(--muted-foreground)]">
                <Search size={36} className="mb-3 opacity-20" />
                <p className="text-sm">Escribe un SKU o nombre para buscar</p>
              </div>
            ) : results.length === 0 && !isFetching ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-[var(--muted-foreground)]">
                <Package size={36} className="mb-3 opacity-20" />
                <p className="text-sm">Sin resultados para "{query}"</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-2.5">
                {results.map((v) => (
                  <VarianteCard
                    key={v.id}
                    variante={v}
                    inCart={cart.find((c) => c.variantId === v.id)?.quantity ?? 0}
                    onClick={() => addToCart(v)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Mobile: "Ver carrito" pill when cart has items */}
          {cart.length > 0 && mobileTab === "search" && (
            <div className="lg:hidden p-3 border-t border-[var(--border)] flex-shrink-0">
              <button
                onClick={() => setMobileTab("cart")}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--primary)] text-white text-sm font-medium"
              >
                <span className="flex items-center gap-2">
                  <ShoppingCart size={16} />
                  {cart.length} {cart.length === 1 ? "producto" : "productos"}
                </span>
                <span className="font-bold font-mono">{formatCurrency(total)} →</span>
              </button>
            </div>
          )}
        </div>

        {/* ── Panel carrito ────────────────────────────────────────────────── */}
        <div className={`w-full lg:w-80 flex-shrink-0 flex flex-col bg-[var(--card)] overflow-hidden ${
          mobileTab === "search" ? "hidden lg:flex" : "flex"
        }`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] flex-shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingCart size={15} className="text-[var(--muted-foreground)]" />
              <span className="text-sm font-semibold text-[var(--foreground)]">
                Carrito {cart.length > 0 && `(${cart.length})`}
              </span>
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-xs text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-[var(--muted-foreground)] p-6">
                <ShoppingCart size={32} className="mb-2 opacity-20" />
                <p className="text-sm">El carrito está vacío</p>
                <button
                  onClick={() => setMobileTab("search")}
                  className="lg:hidden mt-3 text-xs text-[var(--primary)] underline"
                >
                  Buscar productos
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {cart.map((item) => (
                  <CartItemRow
                    key={item.variantId}
                    item={item}
                    onQtyChange={(delta) => updateQty(item.variantId, delta)}
                    onRemove={() => removeItem(item.variantId)}
                  />
                ))}
              </ul>
            )}
          </div>

          {/* Totales + cobrar */}
          <div className="border-t border-[var(--border)] p-4 flex flex-col gap-3 flex-shrink-0">
            <div className="flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between text-[var(--muted-foreground)]">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Descuento</span>
                  <span>−{formatCurrency(totalDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-[var(--foreground)] text-base pt-1 border-t border-[var(--border)]">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
            <Button
              onClick={() => setShowPayment(true)}
              disabled={cart.length === 0}
              size="lg"
              className="w-full"
            >
              Cobrar {cart.length > 0 && formatCurrency(total)}
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de cobro */}
      {showPayment && (
        <PaymentModal
          total={total}
          onConfirm={handleConfirmPayment}
          onClose={() => setShowPayment(false)}
        />
      )}

      {/* QR Scanner */}
      {showScanner && (
        <QrScanner
          onScan={handleQrScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}

// ── Tarjeta de resultado ──────────────────────────────────────────────────────
function VarianteCard({
  variante,
  inCart,
  onClick,
}: {
  variante: VarianteSearchResult;
  inCart: number;
  onClick: () => void;
}) {
  const price = variante.price ?? variante.basePrice;
  const attrs = [variante.size, variante.color].filter(Boolean).join(" · ");

  return (
    <button
      onClick={onClick}
      className={`text-left rounded-xl border p-3 flex gap-2.5 transition-all hover:shadow-md active:scale-[0.98] ${
        inCart > 0
          ? "border-[var(--primary)] bg-[var(--primary)]/5"
          : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--primary)]/50"
      }`}
    >
      <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-[var(--muted)] border border-[var(--border)] flex items-center justify-center">
        {variante.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={variante.photoUrl} alt={variante.productName} className="w-full h-full object-cover" />
        ) : (
          <Package size={16} className="text-[var(--muted-foreground)]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--foreground)] truncate leading-tight">
          {variante.productName}
        </p>
        {variante.brandName && (
          <p className="text-xs text-[var(--muted-foreground)] truncate">{variante.brandName}</p>
        )}
        {attrs && (
          <p className="text-xs text-[var(--muted-foreground)] truncate">{attrs}</p>
        )}
        <div className="flex items-center justify-between mt-1">
          <span className="text-sm font-bold text-[var(--foreground)]">{formatCurrency(price)}</span>
          <span className="text-xs text-[var(--muted-foreground)]">
            stock: {variante.stock}
            {inCart > 0 && <span className="ml-1 text-[var(--primary)] font-semibold">+{inCart}</span>}
          </span>
        </div>
      </div>
    </button>
  );
}

// ── Fila de carrito ───────────────────────────────────────────────────────────
function CartItemRow({
  item,
  onQtyChange,
  onRemove,
}: {
  item: CartItem;
  onQtyChange: (delta: number) => void;
  onRemove: () => void;
}) {
  const lineTotal = item.unitPrice * item.quantity - item.discount;

  return (
    <li className="px-4 py-3 flex gap-3 items-start">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--foreground)] truncate leading-tight">
          {item.productName}
        </p>
        <p className="text-xs text-[var(--muted-foreground)] font-mono">{item.sku}</p>
        {(item.size || item.color) && (
          <p className="text-xs text-[var(--muted-foreground)]">
            {[item.size, item.color].filter(Boolean).join(" · ")}
          </p>
        )}
        <p className="text-sm font-bold text-[var(--foreground)] mt-0.5">
          {formatCurrency(lineTotal)}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <button
          onClick={onRemove}
          className="text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors"
        >
          <Trash2 size={13} />
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onQtyChange(-1)}
            className="w-6 h-6 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
          >
            <Minus size={11} />
          </button>
          <span className="w-6 text-center text-sm font-mono font-bold text-[var(--foreground)]">
            {item.quantity}
          </span>
          <button
            onClick={() => onQtyChange(+1)}
            disabled={item.quantity >= item.stock}
            className="w-6 h-6 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors disabled:opacity-30"
          >
            <Plus size={11} />
          </button>
        </div>
        <span className="text-xs text-[var(--muted-foreground)]">
          {formatCurrency(item.unitPrice)} c/u
        </span>
      </div>
    </li>
  );
}
