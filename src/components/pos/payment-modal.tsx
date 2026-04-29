"use client";

import { useState } from "react";
import { X, Loader2, Banknote, CreditCard, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { PaymentMethod } from "@/types/ventas";

// Tasa neta de terminal (mismo valor que en la función SQL)
const CARD_RATE = 0.954;
const CARD_FEE_PCT = ((1 - CARD_RATE) * 100).toFixed(1); // "4.6"

interface PaymentModalProps {
  total: number;
  onConfirm: (payment: {
    paidCash: number;
    paidCard: number;
    paidTransfer: number;
  }) => Promise<void>;
  onClose: () => void;
}

const METHODS: { id: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { id: "cash",     label: "Efectivo",      icon: <Banknote size={16} /> },
  { id: "card",     label: "Tarjeta",       icon: <CreditCard size={16} /> },
  { id: "transfer", label: "Transferencia", icon: <ArrowLeftRight size={16} /> },
  { id: "mixed",    label: "Mixto",         icon: <span className="text-xs font-bold">MIX</span> },
];

export function PaymentModal({ total, onConfirm, onClose }: PaymentModalProps) {
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [cashInput, setCashInput] = useState("");
  const [cardInput, setCardInput] = useState("");
  const [transferInput, setTransferInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cashAmt     = parseFloat(cashInput)     || 0;
  const cardAmt     = parseFloat(cardInput)     || 0;
  const transferAmt = parseFloat(transferInput) || 0;

  // Monto recibido según método
  const received =
    method === "cash"     ? cashAmt :
    method === "card"     ? total   :
    method === "transfer" ? total   :
    cashAmt + cardAmt + transferAmt;

  const change = method === "cash" ? Math.max(0, cashAmt - total) : 0;
  const covered = method === "mixed" ? cashAmt + cardAmt + transferAmt : received;
  const remaining = Math.max(0, total - covered);
  const isReady =
    method === "cash"     ? cashAmt >= total :
    method === "card"     ? true :
    method === "transfer" ? true :
    covered >= total;

  async function handleConfirm() {
    if (!isReady || loading) return;
    setError(null);
    setLoading(true);
    try {
      await onConfirm({
        paidCash:     method === "cash" ? total : method === "mixed" ? cashAmt : 0,
        paidCard:     method === "card" ? total : method === "mixed" ? cardAmt : 0,
        paidTransfer: method === "transfer" ? total : method === "mixed" ? transferAmt : 0,
      });
    } catch (e) {
      setError((e as Error).message ?? "Error al procesar la venta");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div>
            <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide font-semibold">Total a cobrar</p>
            <p className="text-3xl font-bold text-[var(--foreground)] font-mono">
              {formatCurrency(total)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          {/* Método de pago */}
          <div>
            <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-2">
              Método de pago
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {METHODS.map(({ id, label, icon }) => (
                <button
                  key={id}
                  onClick={() => setMethod(id)}
                  className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-xs font-medium border transition-all ${
                    method === id
                      ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                      : "bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-[var(--primary)]"
                  }`}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Inputs según método */}
          {method === "cash" && (
            <div className="flex flex-col gap-3">
              <AmountInput
                label="Efectivo recibido"
                value={cashInput}
                onChange={setCashInput}
                autoFocus
              />
              {cashAmt > 0 && (
                <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                  cashAmt >= total ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                }`}>
                  <span className="text-sm font-medium">
                    {cashAmt >= total ? "Cambio" : "Falta"}
                  </span>
                  <span className="text-xl font-bold font-mono">
                    {formatCurrency(cashAmt >= total ? change : total - cashAmt)}
                  </span>
                </div>
              )}
            </div>
          )}

          {method === "card" && (
            <div className="rounded-xl bg-[var(--muted)] px-4 py-3 flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between text-[var(--muted-foreground)]">
                <span>Cliente paga</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between text-amber-600">
                <span>Comisión terminal ({CARD_FEE_PCT}%)</span>
                <span>−{formatCurrency(total * (1 - CARD_RATE))}</span>
              </div>
              <div className="flex justify-between font-bold text-[var(--foreground)] pt-1 border-t border-[var(--border)]">
                <span>Recibes</span>
                <span className="text-green-600">{formatCurrency(total * CARD_RATE)}</span>
              </div>
            </div>
          )}

          {method === "transfer" && (
            <div className="rounded-xl bg-[var(--muted)] px-4 py-3 text-sm text-[var(--muted-foreground)] text-center">
              Se registrará <strong className="text-[var(--foreground)]">{formatCurrency(total)}</strong> por transferencia
            </div>
          )}

          {method === "mixed" && (
            <div className="flex flex-col gap-2">
              <AmountInput label="Efectivo" value={cashInput}     onChange={setCashInput}     autoFocus />
              <AmountInput label="Tarjeta"  value={cardInput}     onChange={setCardInput}     />
              <AmountInput label="Transfer" value={transferInput} onChange={setTransferInput} />
              <div className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm ${
                remaining === 0 ? "bg-green-50 text-green-700" : "bg-[var(--muted)] text-[var(--muted-foreground)]"
              }`}>
                <span className="font-medium">{remaining === 0 ? "✓ Cubierto" : "Falta"}</span>
                <span className="font-bold font-mono">
                  {remaining === 0 ? formatCurrency(covered) : formatCurrency(remaining)}
                </span>
              </div>
              {cardAmt > 0 && (
                <div className="flex justify-between text-xs text-amber-600 px-1">
                  <span>Comisión terminal ({CARD_FEE_PCT}%)</span>
                  <span>−{formatCurrency(cardAmt * (1 - CARD_RATE))}</span>
                </div>
              )}
              {(cashAmt + cardAmt * CARD_RATE + transferAmt) > 0 && (
                <div className="flex justify-between text-xs font-semibold text-green-600 px-1">
                  <span>Neto a caja</span>
                  <span>{formatCurrency(cashAmt + cardAmt * CARD_RATE + transferAmt)}</span>
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="text-sm text-[var(--destructive)] bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button
            onClick={handleConfirm}
            disabled={!isReady || loading}
            size="lg"
            className="w-full"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Procesando...</>
            ) : (
              `Confirmar venta · ${formatCurrency(total)}`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AmountInput({
  label,
  value,
  onChange,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--muted-foreground)]">
        $
      </span>
      <input
        type="number"
        inputMode="decimal"
        placeholder="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted-foreground)]">
        {label}
      </span>
    </div>
  );
}
