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

      // Buscar por SKU
      const skuPromise = supabase
        .from("product_variants")
        .select(
          "id, sku, size, color, price, stock, product:products(id, name, base_price, photo_url, brand:brands(name))"
        )
        .ilike("sku", `%${q}%`)
        .eq("is_active", true)
        .gt("stock", 0)
        .limit(12);

      // Buscar productos por nombre → traer sus variantes
      const namePromise = supabase
        .from("products")
        .select("id")
        .ilike("name", `%${q}%`)
        .eq("is_active", true)
        .is("deleted_at", null)
        .limit(6);

      const [skuRes, nameRes] = await Promise.all([skuPromise, namePromise]);

      if (skuRes.error) throw skuRes.error;

      type RawVariant = {
        id: string;
        sku: string;
        size: string | null;
        color: string | null;
        price: number | null;
        stock: number;
        product: {
          id: string;
          name: string;
          base_price: number;
          photo_url: string | null;
          brand: { name: string } | null;
        } | null;
      };

      const normalize = (v: RawVariant): VarianteSearchResult => ({
        id: v.id,
        sku: v.sku,
        size: v.size,
        color: v.color,
        price: v.price,
        stock: v.stock,
        productId: v.product?.id ?? "",
        productName: v.product?.name ?? "",
        basePrice: v.product?.base_price ?? 0,
        photoUrl: v.product?.photo_url ?? null,
        brandName: v.product?.brand?.name ?? null,
      });

      const bySkuResults = (skuRes.data ?? []).map((v) =>
        normalize(v as RawVariant)
      );

      // Si hay productos por nombre, buscar sus variantes
      const productIds = (nameRes.data ?? []).map((p) => p.id);
      if (productIds.length === 0) return bySkuResults;

      const { data: byNameData, error: nameVarErr } = await supabase
        .from("product_variants")
        .select(
          "id, sku, size, color, price, stock, product:products(id, name, base_price, photo_url, brand:brands(name))"
        )
        .in("product_id", productIds)
        .eq("is_active", true)
        .gt("stock", 0)
        .limit(12);

      if (nameVarErr) throw nameVarErr;

      // Merge deduplicado (SKU primero)
      const seen = new Set(bySkuResults.map((v) => v.id));
      const merged = [
        ...bySkuResults,
        ...(byNameData ?? [])
          .map((v) => normalize(v as RawVariant))
          .filter((v) => !seen.has(v.id)),
      ];

      return merged.slice(0, 20);
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
    onSuccess: () => {
      // Invalidar inventario para reflejar el stock descontado
      queryClient.invalidateQueries({ queryKey: ["productos"] });
      queryClient.invalidateQueries({ queryKey: ["pos-search"] });
    },
  });
}
