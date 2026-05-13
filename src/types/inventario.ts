export type ProductKind = "consignment" | "own" | "ticket" | "service";

export interface Producto {
  id: string;
  sku_prefix: string;
  name: string;
  description: string | null;
  brand_id: string | null;
  kind: ProductKind;
  category: string;
  base_price: number;
  production_cost: number | null;
  production_paid_by_employee_id: string | null;
  production_paid_by_store: boolean;
  production_notes: string | null;
  photo_url: string | null;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  // joins opcionales
  brand?: { name: string } | null;
  product_variants?: Variante[];
}

export interface Variante {
  id: string;
  product_id: string;
  sku: string;
  size: string | null;
  color: string | null;
  price: number | null;
  discount_pct: number;   // 0–0.9999, e.g. 0.20 = 20% off
  stock: number;
  low_stock_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type StockStatus = "ok" | "low" | "out";

export function getStockStatus(variante: Variante): StockStatus {
  if (variante.stock === 0) return "out";
  if (variante.stock <= variante.low_stock_threshold) return "low";
  return "ok";
}

export function getProductStockStatus(variantes: Variante[]): StockStatus {
  if (variantes.length === 0) return "out";
  if (variantes.every((v) => v.stock === 0)) return "out";
  if (variantes.some((v) => v.stock > 0 && v.stock <= v.low_stock_threshold)) return "low";
  return "ok";
}
