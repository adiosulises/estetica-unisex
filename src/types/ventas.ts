export interface CartItem {
  variantId: string;
  sku: string;
  productName: string;
  brandName: string | null;
  photoUrl: string | null;
  size: string | null;
  color: string | null;
  unitPrice: number;
  stock: number;       // stock actual (para validar max qty)
  quantity: number;
  discount: number;    // descuento total de la línea (no por unidad)
}

export interface VarianteSearchResult {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  price: number | null;
  stock: number;
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
