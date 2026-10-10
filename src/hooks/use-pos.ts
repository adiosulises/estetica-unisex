"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { VarianteSearchResult, SaleResult } from "@/types/ventas";

// ─── Debounce util ────────────────────────────────────────────────────────────
export function useDebounce<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

// ─── Búsqueda de variantes (por SKU o nombre de producto) ────────────────────
export function useSearchVariantes(query: string) {
  const debouncedQuery = useDebounce(query, 250);

  return useQuery({
    queryKey: ["pos-search", debouncedQuery],
    queryFn: async (): Promise<VarianteSearchResult[]> => {
      if (!debouncedQuery || debouncedQuery.trim().length < 1) return [];

      const supabase = createClient();
      const q = debouncedQuery.trim();

      type RawVariant = {
        id: string; sku: string; size: string | null; color: string | null;
        price: number | null; stock: number;
        product: { id: string; name: string; base_price: number; photo_url: string | null; brand: { name: string } | null } | null;
      };

      const normalize = (v: RawVariant): VarianteSearchResult => ({
        id: v.id, sku: v.sku, size: v.size, color: v.color, price: v.price, stock: v.stock,
        productId: v.product?.id ?? "", productName: v.product?.name ?? "",
        basePrice: v.product?.base_price ?? 0, photoUrl: v.product?.photo_url ?? null,
        brandName: v.product?.brand?.name ?? null,
      });

      const variantSelect = "id, sku, size, color, price, stock, product:products(id, name, base_price, photo_url, brand:brands(name))";

      // Search by SKU — include out-of-stock
      const skuPromise = supabase
        .from("product_variants")
        .select(variantSelect)
        .ilike("sku", `%${q}%`)
        .eq("is_active", true)
        .limit(15);

      // Search products by name — split words for broader matching
      const words = q.split(/\s+/).filter(Boolean);
      const namePromise = supabase
        .from("products")
        .select("id")
        .eq("is_active", true)
        .is("deleted_at", null)
        .or(words.map((w) => `name.ilike.%${w}%`).join(","))
        .limit(8);

      const [skuRes, nameRes] = await Promise.all([skuPromise, namePromise]);
      if (skuRes.error) throw skuRes.error;

      const bySkuResults = (skuRes.data ?? []).map((v) => normalize(v as RawVariant));

      const productIds = (nameRes.data ?? []).map((p) => p.id);
      let byNameResults: VarianteSearchResult[] = [];

      if (productIds.length > 0) {
        const { data: byNameData, error: nameVarErr } = await supabase
          .from("product_variants")
          .select(variantSelect)
          .in("product_id", productIds)
          .eq("is_active", true)
          .limit(15);
        if (nameVarErr) throw nameVarErr;
        byNameResults = (byNameData ?? []).map((v) => normalize(v as RawVariant));
      }

      // Deduplicate, in-stock first then out-of-stock
      const seen = new Set<string>();
      const all: VarianteSearchResult[] = [];
      for (const v of [...bySkuResults, ...byNameResults]) {
        if (!seen.has(v.id)) { seen.add(v.id); all.push(v); }
      }

      const inStock  = all.filter((v) => v.stock > 0);
      const outStock = all.filter((v) => v.stock <= 0);
      return [...inStock, ...outStock].slice(0, 24);
    },
    enabled: debouncedQuery.trim().length > 0,
    staleTime: 10_000,
  });
}

// ─── Crear venta (llama a la función SQL atómica) ─────────────────────────────
interface CreateSalePayload {
  items: {
    variant_id: string;
    quantity: number;
    unit_price: number;
    discount: number;
  }[];
  paid_cash: number;
  paid_card: number;
  paid_transfer: number;
  notes?: string;
}

export function useCreateSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateSalePayload): Promise<SaleResult> => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("create_sale", {
        p_items: payload.items,
        p_paid_cash: payload.paid_cash,
        p_paid_card: payload.paid_card,
        p_paid_transfer: payload.paid_transfer,
        p_notes: payload.notes ?? undefined,
      });
      if (error) throw error;

      const result = data as unknown as SaleResult;

      // Tag the sale with the employee who made it.
      // employees.id === auth.uid() by design in this system.
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id && result.sale_id) {
        await supabase
          .from("sales")
          .update({ employee_id: user.id })
          .eq("id", result.sale_id);
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
      queryClient.invalidateQueries({ queryKey: ["pos-search"] });

      const formatted = new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
        minimumFractionDigits: 0,
      }).format(result.total);

      fetch("/api/push/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Nueva venta",
          body: `${result.folio} · ${formatted}`,
        }),
      }).catch(console.error);
    },
  });
}
