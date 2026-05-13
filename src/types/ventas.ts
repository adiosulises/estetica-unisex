export interface CartItem {
  variantId: string;
  sku: string;
  productName: string;
  brandName: string | null;
  photoUrl: string | null;
  size: string | null;
  color: string | null;
  unitPrice: number;
  discountPct: number;  // porcentaje de descuento de la variante (0–1)
  stock: number;        // stock actual (para validar max qty)
  quantity: number;
  discount: number;     // descuento total de la línea = unitPrice * qty * discountPct
}

export interface VarianteSearchResult {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  price: number | null;
  stock: number;
  discountPct: number;
  productId: string;
  productName: string;
  basePrice: number;
  photoUrl: string | null;
  brandName: string | null;
}

export interface SaleResult {
  sale_id: string;
  folio: string;
  total: number;
}

export type PaymentMethod = "cash" | "card" | "transfer" | "mixed";
