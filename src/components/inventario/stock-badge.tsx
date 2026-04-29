import { cn } from "@/lib/utils";
import type { StockStatus } from "@/types/inventario";

interface StockBadgeProps {
  status: StockStatus;
  stock?: number;
  className?: string;
}

const config: Record<StockStatus, { label: string; className: string }> = {
  ok: { label: "En stock", className: "bg-green-100 text-green-800" },
  low: { label: "Stock bajo", className: "bg-yellow-100 text-yellow-800" },
  out: { label: "Agotado", className: "bg-red-100 text-red-800" },
};

export function StockBadge({ status, stock, className }: StockBadgeProps) {
  const { label, className: baseClass } = config[status];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        baseClass,
        className
      )}
    >
      {stock !== undefined ? `${stock} — ` : ""}
      {label}
    </span>
  );
}
