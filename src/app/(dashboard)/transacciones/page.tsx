"use client";

import { useState } from "react";
import {
  ArrowDownCircle,
  Plus,
  Shield,
  History,
  ChevronDown,
  ChevronUp,
  Pencil,
  X,
  Loader2,
} from "lucide-react";
import {
  useCategoryBalances,
  useCategoryBalanceLogs,
  useCombinedTransactions,
  useSetCategoryBalance,
  useCreateSpendingTransaction,
  CATEGORIES,
  getCategoryLabel,
  getCategoryColor,
  type CategoryKey,
  type CombinedTransaction,
} from "@/hooks/use-transacciones";
import { useMonthIvaCollected } from "@/hooks/use-store-liquidacion";
import { useMyRole } from "@/hooks/use-my-role";
import { useEmpleados } from "@/hooks/use-empleados";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(ym: string) {
  const [y, m] = ym.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TransaccionesPage() {
  const [month, setMonth] = useState(currentMonth());
  const [filterCat, setFilterCat] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [setBalanceCategory, setSetBalanceCategory] = useState<CategoryKey | null>(null);

  const { data: role } = useMyRole();
  const isGod = role === "god";

  const { data: balances = [] } = useCategoryBalances();
  const { data: transactions, isLoading } = useCombinedTransactions({
    month,
    category: filterCat === "all" ? undefined : filterCat,
  });
  const { data: ivaCollected = 0 } = useMonthIvaCollected(month);

  const balanceMap = Object.fromEntries(balances.map((b) => [b.category, b.balance]));

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto flex flex-col gap-6">
      {/* ── Header ────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">Transacciones</h1>
          <p className="text-sm text-[var(--muted-foreground)] capitalize">{formatMonth(month)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonth(prevMonth(month))}
            className="px-2 py-1.5 text-xs rounded-lg border border-[var(--border)] hover:bg-[var(--muted)] transition-colors"
          >
            ‹
          </button>
          <button
            onClick={() => setMonth(nextMonth(month))}
            disabled={month >= currentMonth()}
            className="px-2 py-1.5 text-xs rounded-lg border border-[var(--border)] hover:bg-[var(--muted)] transition-colors disabled:opacity-40"
          >
            ›
          </button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={14} />
            Nueva
          </Button>
        </div>
      </div>

      {/* ── Category balance cards ─────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {CATEGORIES.map((cat) => {
          const bal = balanceMap[cat.key] ?? 0;
          return (
            <div
              key={cat.key}
              className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 flex flex-col gap-1.5 relative group"
            >
              <div className="flex items-center justify-between">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                {isGod && (
                  <button
                    onClick={() => setSetBalanceCategory(cat.key)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-[var(--muted)]"
                    title="Establecer saldo inicial"
                  >
                    <Pencil size={11} className="text-[var(--muted-foreground)]" />
                  </button>
                )}
              </div>
              <p className="text-xs text-[var(--muted-foreground)] leading-tight">{cat.label}</p>
              <p
                className={`text-sm font-bold font-mono tabular-nums ${
                  bal < 0 ? "text-[var(--destructive)]" : "text-[var(--foreground)]"
                }`}
              >
                {formatCurrency(bal)}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── IVA acumulado del mes ──────────────────────── */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#ef444420" }}>
            <span className="text-xs font-bold" style={{ color: "#ef4444" }}>IVA</span>
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">IVA recaudado este mes</p>
            <p className="text-xs text-[var(--muted-foreground)]">Acumulado de ventas con tarjeta (y/o transferencia si aplica)</p>
          </div>
        </div>
        <p className="text-lg font-bold font-mono tabular-nums" style={{ color: "#ef4444" }}>
          {formatCurrency(ivaCollected)}
        </p>
      </div>

      {/* ── Filter tabs ───────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <FilterChip label="Todo" value="all" current={filterCat} onSelect={setFilterCat} />
        {CATEGORIES.map((c) => (
          <FilterChip key={c.key} label={c.label} value={c.key} current={filterCat} onSelect={setFilterCat} color={c.color} />
        ))}
        <FilterChip label="Marcas" value="brand_payout" current={filterCat} onSelect={setFilterCat} color="#8b5cf6" />
      </div>

      {/* ── Transaction list ──────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-[var(--muted-foreground)]">
          <Loader2 size={20} className="animate-spin mr-2" />
          Cargando...
        </div>
      ) : (transactions ?? []).length === 0 ? (
        <div className="text-center py-12 text-[var(--muted-foreground)]">
          <ArrowDownCircle size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Sin transacciones este mes</p>
        </div>
      ) : (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--muted-foreground)]">Fecha</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--muted-foreground)]">Categoría</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--muted-foreground)]">Concepto</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--muted-foreground)] hidden md:table-cell">Por</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-[var(--muted-foreground)]">Monto</th>
              </tr>
            </thead>
            <tbody>
              {(transactions ?? []).map((t, i) => (
                <TransactionRow key={t.id} tx={t} last={i === (transactions ?? []).length - 1} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── God: set balance modal ────────────────────── */}
      {isGod && (
        <Modal
          open={!!setBalanceCategory}
          onClose={() => setSetBalanceCategory(null)}
          title={`Establecer saldo — ${setBalanceCategory ? getCategoryLabel(setBalanceCategory) : ""}`}
          size="sm"
        >
          {setBalanceCategory && (
            <SetBalanceForm
              category={setBalanceCategory}
              currentBalance={balanceMap[setBalanceCategory] ?? 0}
              onClose={() => setSetBalanceCategory(null)}
            />
          )}
        </Modal>
      )}

      {/* ── Add transaction modal ─────────────────────── */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Nueva transacción"
        size="sm"
      >
        <AddTransactionForm onClose={() => setAddOpen(false)} />
      </Modal>
    </div>
  );
}

// ─── Transaction Row ──────────────────────────────────────────────────────────

function TransactionRow({ tx, last }: { tx: CombinedTransaction; last: boolean }) {
  const isBrand = tx.type === "brand_payout";
  const color = isBrand ? "#8b5cf6" : getCategoryColor(tx.category);
  const label = isBrand ? "Marca" : getCategoryLabel(tx.category);

  const date = new Date(tx.transaction_date + "T12:00:00");
  const dateStr = date.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });

  return (
    <tr className={!last ? "border-b border-[var(--border)]" : ""}>
      <td className="px-4 py-3 text-xs text-[var(--muted-foreground)] whitespace-nowrap">{dateStr}</td>
      <td className="px-4 py-3">
        <span
          className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: color + "20", color }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
          {isBrand ? (tx.brand_name ?? label) : label}
        </span>
      </td>
      <td className="px-4 py-3 text-[var(--foreground)] max-w-[200px] truncate">{tx.concept}</td>
      <td className="px-4 py-3 text-[var(--muted-foreground)] hidden md:table-cell text-xs">{tx.performed_by}</td>
      <td className="px-4 py-3 text-right font-mono font-medium text-[var(--destructive)] tabular-nums">
        -{formatCurrency(tx.amount)}
      </td>
    </tr>
  );
}

// ─── Filter Chip ──────────────────────────────────────────────────────────────

function FilterChip({
  label, value, current, onSelect, color,
}: {
  label: string; value: string; current: string; onSelect: (v: string) => void; color?: string;
}) {
  const active = current === value;
  return (
    <button
      onClick={() => onSelect(value)}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        active
          ? "bg-[var(--primary)] text-white"
          : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)]"
      }`}
    >
      {color && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: active ? "white" : color }} />}
      {label}
    </button>
  );
}

// ─── Set Balance Form (god only) ─────────────────────────────────────────────

function SetBalanceForm({
  category,
  currentBalance,
  onClose,
}: {
  category: CategoryKey;
  currentBalance: number;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState(String(currentBalance));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const { data: myRole } = useMyRole();
  const { data: empleados = [] } = useEmpleados();
  const { data: logs = [] } = useCategoryBalanceLogs(category);
  const setBalance = useSetCategoryBalance();

  // Find god user's name (current session)
  const godName = myRole === "god" ? (empleados.find((e) => e.role === "god")?.full_name ?? "god") : "—";

  async function handleSave() {
    const val = parseFloat(amount);
    if (isNaN(val)) return;
    setSaving(true);
    try {
      await setBalance.mutateAsync({
        category,
        new_balance: val,
        set_by_name: godName,
        notes: notes.trim() || undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
        <Shield size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">
          Esta acción se registra en el log de auditoría. Solo accesible para usuarios <strong>god</strong>.
        </p>
      </div>

      <Input
        label={`Nuevo saldo — ${getCategoryLabel(category)}`}
        type="number"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.00"
      />

      <div>
        <label className="text-xs text-[var(--muted-foreground)] mb-1 block">Notas (opcional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
          placeholder="Motivo del ajuste..."
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving || isNaN(parseFloat(amount))}>
          {saving ? <><Loader2 size={13} className="animate-spin" /> Guardando...</> : "Establecer saldo"}
        </Button>
      </div>

      {/* Audit log toggle */}
      {logs.length > 0 && (
        <div>
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            <History size={13} />
            Historial de ajustes ({logs.length})
            {showLogs ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {showLogs && (
            <div className="mt-2 rounded-xl border border-[var(--border)] overflow-hidden">
              {logs.map((log, i) => (
                <div
                  key={log.id}
                  className={`px-3 py-2 text-xs ${i < logs.length - 1 ? "border-b border-[var(--border)]" : ""}`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[var(--muted-foreground)]">
                      {new Date(log.created_at).toLocaleDateString("es-MX", {
                        day: "2-digit", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                    <span className="font-mono font-medium text-[var(--foreground)]">
                      {formatCurrency(log.old_balance)} → {formatCurrency(log.new_balance)}
                    </span>
                  </div>
                  <p className="text-[var(--muted-foreground)] mt-0.5">
                    Por <strong>{log.set_by_name}</strong>
                    {log.notes && ` · ${log.notes}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Add Transaction Form ─────────────────────────────────────────────────────

function AddTransactionForm({ onClose }: { onClose: () => void }) {
  const today = new Date().toISOString().slice(0, 10);

  const [category, setCategory] = useState<CategoryKey>("salary");
  const [amount, setAmount] = useState("");
  const [concept, setConcept] = useState("");
  const [performedBy, setPerformedBy] = useState("");
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { data: empleados = [] } = useEmpleados();
  const create = useCreateSpendingTransaction();
  const { data: balances = [] } = useCategoryBalances();

  const catBalance = balances.find((b) => b.category === category)?.balance ?? 0;
  const amountNum = parseFloat(amount);

  async function handleSave() {
    setErr(null);
    if (!concept.trim()) { setErr("El concepto es requerido"); return; }
    if (!performedBy.trim()) { setErr("Indica quién realiza la transacción"); return; }
    if (isNaN(amountNum) || amountNum <= 0) { setErr("El monto debe ser mayor a 0"); return; }

    setSaving(true);
    try {
      await create.mutateAsync({
        category,
        amount: amountNum,
        concept: concept.trim(),
        performed_by: performedBy.trim(),
        transaction_date: date,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 flex flex-col gap-4">
      {/* Category */}
      <div>
        <label className="text-xs text-[var(--muted-foreground)] mb-1.5 block">Categoría</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${
                category === c.key
                  ? "border-transparent text-white"
                  : "border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)]"
              }`}
              style={category === c.key ? { backgroundColor: c.color } : {}}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: category === c.key ? "rgba(255,255,255,0.8)" : c.color }}
              />
              {c.label}
            </button>
          ))}
        </div>
        {catBalance >= 0 && (
          <p className="text-xs text-[var(--muted-foreground)] mt-1.5">
            Saldo disponible en <strong>{getCategoryLabel(category)}</strong>: {formatCurrency(catBalance)}
          </p>
        )}
      </div>

      <Input
        label="Monto ($)"
        type="number"
        step="0.01"
        min="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.00"
        hint={!isNaN(amountNum) && amountNum > catBalance ? "⚠ Excede el saldo disponible" : undefined}
      />

      <Input
        label="Concepto"
        value={concept}
        onChange={(e) => setConcept(e.target.value)}
        placeholder="Pago de nómina / compra de herramienta..."
      />

      <div>
        <label className="text-xs text-[var(--muted-foreground)] mb-1 block">Realizado por</label>
        <select
          value={performedBy}
          onChange={(e) => setPerformedBy(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        >
          <option value="">Seleccionar persona...</option>
          {empleados.filter((e) => e.is_active).map((e) => (
            <option key={e.id} value={e.full_name}>{e.full_name}</option>
          ))}
        </select>
      </div>

      <Input
        label="Fecha"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      <div>
        <label className="text-xs text-[var(--muted-foreground)] mb-1 block">Notas (opcional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
          placeholder="Detalles adicionales..."
        />
      </div>

      {err && <p className="text-xs text-[var(--destructive)]">{err}</p>}

      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 size={13} className="animate-spin" /> Guardando...</> : "Registrar transacción"}
        </Button>
      </div>
    </div>
  );
}
