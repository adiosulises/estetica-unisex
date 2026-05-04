"use client";

import { useState, useEffect } from "react";
import { Settings, Loader2, Check } from "lucide-react";
import { useConfig, useUpdateConfig } from "@/hooks/use-configuracion";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

export default function ConfiguracionPage() {
  const { data: config, isLoading } = useConfig();
  const update = useUpdateConfig();

  const [rent, setRent] = useState("");
  const [goal, setGoal] = useState("");
  const [salary, setSalary] = useState("");
  const [maintenance, setMaintenance] = useState("");
  const [savings, setSavings] = useState("");
  const [ads, setAds] = useState("");
  const [construction, setConstruction] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!config) return;
    setRent(String(config.rent_amount));
    setGoal(String(config.monthly_goal));
    setSalary(String(Math.round(config.salary_pool_pct * 100)));
    setMaintenance(String(Math.round(config.maintenance_pct * 100)));
    setSavings(String(Math.round(config.savings_pct * 100)));
    setAds(String(Math.round(config.ads_pct * 100)));
    setConstruction(String(Math.round(config.construction_pct * 100)));
  }, [config]);

  const totalPct = [salary, maintenance, savings, ads, construction]
    .reduce((s, v) => s + (parseFloat(v) || 0), 0);

  async function handleSave() {
    setError(null);
    if (totalPct > 100) { setError("Los porcentajes suman más de 100%"); return; }
    try {
      await update.mutateAsync({
        rent_amount:       parseFloat(rent) || 0,
        monthly_goal:      parseFloat(goal) || 0,
        salary_pool_pct:   (parseFloat(salary) || 0) / 100,
        maintenance_pct:   (parseFloat(maintenance) || 0) / 100,
        savings_pct:       (parseFloat(savings) || 0) / 100,
        ads_pct:           (parseFloat(ads) || 0) / 100,
        construction_pct:  (parseFloat(construction) || 0) / 100,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  }

  // Simulation: how $100 of store revenue gets distributed after rent
  const rentMonthly = parseFloat(rent) || 0;
  const goalMonthly = parseFloat(goal) || 0;
  const dailyTarget = goalMonthly > 0
    ? (goalMonthly / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate())
    : 0;

  return (
    <div className="max-w-xl mx-auto px-4 py-6 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
          <Settings size={20} className="text-[var(--primary)]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">Configuración</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Variables que rigen el sistema</p>
        </div>
      </div>

      {/* Fixed expenses */}
      <Section title="Gastos fijos">
        <Field
          label="Renta mensual del local"
          value={rent}
          onChange={setRent}
          prefix="$"
          hint="Se usa como meta mínima en el dashboard"
        />
        <Field
          label="Meta mensual de ventas"
          value={goal}
          onChange={setGoal}
          prefix="$"
          hint={`Equivale a ${formatCurrency(dailyTarget)} por día`}
        />
      </Section>

      {/* Distribution percentages */}
      <Section title="Distribución de ganancias (después de renta)">
        <p className="text-xs text-[var(--muted-foreground)] -mt-1 mb-2">
          Porcentaje de cada peso que entra a la tienda (neto de marcas)
        </p>
        <PctField label="Pool de sueldos"    value={salary}       onChange={setSalary} />
        <PctField label="Mantenimiento"      value={maintenance}  onChange={setMaintenance} />
        <PctField label="Ahorros"            value={savings}      onChange={setSavings} />
        <PctField label="Publicidad / ads"   value={ads}          onChange={setAds} />
        <PctField label="Construcción / obra" value={construction} onChange={setConstruction} />

        {/* Sum indicator */}
        <div className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm mt-1 ${
          totalPct > 100 ? "bg-red-50 text-red-600" :
          totalPct === 100 ? "bg-green-50 text-green-700" :
          "bg-[var(--muted)] text-[var(--muted-foreground)]"
        }`}>
          <span>Total asignado</span>
          <span className="font-bold">{totalPct}%</span>
        </div>

        {/* Simulation */}
        {totalPct <= 100 && totalPct > 0 && (
          <div className="mt-2 bg-[var(--muted)] rounded-xl p-4">
            <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-2">
              Por cada $100 de ganancia de tienda
            </p>
            {[
              { label: "Pool de sueldos",    pct: parseFloat(salary) || 0 },
              { label: "Mantenimiento",      pct: parseFloat(maintenance) || 0 },
              { label: "Ahorros",            pct: parseFloat(savings) || 0 },
              { label: "Publicidad",         pct: parseFloat(ads) || 0 },
              { label: "Construcción",       pct: parseFloat(construction) || 0 },
            ].filter(r => r.pct > 0).map(r => (
              <div key={r.label} className="flex justify-between text-xs text-[var(--foreground)] mb-1">
                <span className="text-[var(--muted-foreground)]">{r.label}</span>
                <span className="font-mono font-medium">${r.pct.toFixed(2)}</span>
              </div>
            ))}
            {totalPct < 100 && (
              <div className="flex justify-between text-xs text-[var(--muted-foreground)] mt-1 pt-1 border-t border-[var(--border)]">
                <span>Sin asignar</span>
                <span className="font-mono">${(100 - totalPct).toFixed(2)}</span>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* Monthly goal info */}
      {goalMonthly > 0 && (
        <Section title="Vista previa de metas">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-[var(--muted)] rounded-xl px-4 py-3">
              <p className="text-xs text-[var(--muted-foreground)]">Meta mensual</p>
              <p className="font-bold font-mono text-[var(--foreground)]">{formatCurrency(goalMonthly)}</p>
            </div>
            <div className="bg-[var(--muted)] rounded-xl px-4 py-3">
              <p className="text-xs text-[var(--muted-foreground)]">Meta diaria</p>
              <p className="font-bold font-mono text-[var(--foreground)]">{formatCurrency(dailyTarget)}</p>
            </div>
            <div className="bg-[var(--muted)] rounded-xl px-4 py-3">
              <p className="text-xs text-[var(--muted-foreground)]">Renta mínima</p>
              <p className="font-bold font-mono text-[var(--foreground)]">{formatCurrency(rentMonthly)}</p>
            </div>
            <div className="bg-[var(--muted)] rounded-xl px-4 py-3">
              <p className="text-xs text-[var(--muted-foreground)]">Renta/día mín.</p>
              <p className="font-bold font-mono text-[var(--foreground)]">
                {formatCurrency(rentMonthly / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate())}
              </p>
            </div>
          </div>
        </Section>
      )}

      {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}

      <Button onClick={handleSave} disabled={update.isPending} size="lg" className="w-full">
        {update.isPending ? (
          <><Loader2 size={14} className="animate-spin" /> Guardando...</>
        ) : saved ? (
          <><Check size={14} /> Guardado</>
        ) : "Guardar cambios"}
      </Button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-5 flex flex-col gap-3">
      <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, prefix, hint }: {
  label: string; value: string; onChange: (v: string) => void;
  prefix?: string; hint?: string;
}) {
  return (
    <div>
      <label className="text-xs text-[var(--muted-foreground)] mb-1 block">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--muted-foreground)]">{prefix}</span>
        )}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full ${prefix ? "pl-7" : "pl-3"} pr-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]`}
        />
      </div>
      {hint && <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{hint}</p>}
    </div>
  );
}

function PctField({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex-1 text-sm text-[var(--foreground)]">{label}</span>
      <div className="relative w-24">
        <input
          type="number"
          min="0"
          max="100"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-3 pr-7 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm text-right focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted-foreground)]">%</span>
      </div>
    </div>
  );
}
