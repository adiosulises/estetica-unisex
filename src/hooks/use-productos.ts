"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Producto, Variante } from "@/types/inventario";
import type { ProductoFormValues } from "@/lib/validations/inventario";

const QK = "productos";

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useProductos(filters?: { brandId?: string; search?: string }) {
  return useQuery({
    queryKey: [QK, filters],
    queryFn: async (): Promise<Producto[]> => {
      const supabase = createClient();
      let q = supabase
        .from("products")
        .select("*, brand:brands(name), product_variants(*)")
        .is("deleted_at", null)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (filters?.brandId) q = q.eq("brand_id", filters.brandId);

      const { data, error } = await q;
      if (error) throw error;
      return data as Producto[];
    },
  });
}

export function useProducto(id: string) {
  return useQuery({
    queryKey: [QK, id],
    queryFn: async (): Promise<Producto> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("products")
        .select("*, brand:brands(name), product_variants(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Producto;
    },
    enabled: !!id,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

interface CreateProductoPayload {
  values: ProductoFormValues;
  photoFile?: File;
}

export function useCreateBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      items: CreateProductoPayload[]
    ): Promise<{ product: Producto; variantSkus: string[] }[]> => {
      const supabase = createClient();
      const results: { product: Producto; variantSkus: string[] }[] = [];

      for (const { values, photoFile } of items) {
        // 1. Upload foto si hay
        let photo_url: string | null = null;
        if (photoFile) {
          const ext = photoFile.name.split(".").pop();
          const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("product-photos")
            .upload(path, photoFile, { upsert: false });
          if (upErr) throw upErr;
          const { data: urlData } = supabase.storage
            .from("product-photos")
            .getPublicUrl(path);
          photo_url = urlData.publicUrl;
        }

        // 2. Insertar producto
        const { data: product, error: prodErr } = await supabase
          .from("products")
          .insert({
            name: values.name,
            sku_prefix: values.sku_prefix.toUpperCase(),
            brand_id: values.brand_id || null,
            category: values.category,
            base_price: values.base_price,
            description: values.description || null,
            production_cost: values.production_cost ?? null,
            production_paid_by_store: values.production_paid_by === "store",
            production_paid_by_employee_id:
              values.production_paid_by === "employee"
                ? values.production_paid_by_employee_id || null
                : null,
            production_notes: values.production_notes || null,
            photo_url,
          })
          .select()
          .single();
        if (prodErr) throw prodErr;

        // 3. Insertar variantes (el SKU lo genera el trigger)
        const variantInserts = values.variants.map((v) => ({
          product_id: product.id,
          size: v.size || null,
          color: v.color || null,
          price: v.price ?? null,
          stock: v.stock,
          low_stock_threshold: v.low_stock_threshold,
        }));

        const { data: variants, error: varErr } = await supabase
          .from("product_variants")
          .insert(variantInserts)
          .select("sku");
        if (varErr) throw varErr;

        results.push({
          product: product as Producto,
          variantSkus: (variants ?? []).map((v) => v.sku),
        });
      }

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QK] });
    },
  });
}

export function useUpdateVariante() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Pick<Variante, "price" | "stock" | "low_stock_threshold" | "size" | "color" | "is_active">>;
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("product_variants")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QK] });
    },
  });
}

export function useUpdateProducto(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      data,
      photoFile,
    }: {
      data: Partial<Pick<Producto, "name" | "description" | "category" | "base_price" | "brand_id" | "is_active" | "photo_url">>;
      photoFile?: File | null;
    }) => {
      const supabase = createClient();
      let photo_url = data.photo_url;

      if (photoFile) {
        const ext = photoFile.name.split(".").pop();
        const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("product-photos")
          .upload(path, photoFile, { upsert: false });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage
          .from("product-photos")
          .getPublicUrl(path);
        photo_url = urlData.publicUrl;
      }

      const { error } = await supabase
        .from("products")
        .update({ ...data, ...(photo_url !== undefined ? { photo_url } : {}) })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QK] });
    },
  });
}

export function useDeleteProducto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("products")
        .update({ deleted_at: new Date().toISOString(), is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QK] });
    },
  });
}

export function useDeleteVariante() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("product_variants")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QK] });
    },
  });
}

// ─── Etiquetas ────────────────────────────────────────────────────────────────

export interface VarianteLabel {
  sku: string;
  size: string | null;
  color: string | null;
  price: number | null;
  productName: string;
  brandName: string | null;
  basePrice: number;
}

export function useVariantesBySku(skus: string[]) {
  return useQuery({
    queryKey: ["variantes-label", skus.slice().sort()],
    queryFn: async (): Promise<VarianteLabel[]> => {
      if (skus.length === 0) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from("product_variants")
        .select("sku, size, color, price, product:products(name, base_price, brand:brands(name))")
        .in("sku", skus);
      if (error) throw error;
      type ProductRow = { name: string; base_price: number; brand: { name: string } | null };
      return (data ?? []).map((v) => {
        const p = v.product as ProductRow | null;
        return {
          sku: v.sku,
          size: v.size,
          color: v.color,
          price: v.price,
          productName: p?.name ?? "",
          brandName: p?.brand?.name ?? null,
          basePrice: p?.base_price ?? 0,
        };
      });
    },
    enabled: skus.length > 0,
  });
}

export function useAddVariante(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (v: { size?: string; color?: string; price?: number; stock: number; low_stock_threshold: number }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("product_variants")
        .insert({
          product_id: productId,
          size: v.size || null,
          color: v.color || null,
          price: v.price ?? null,
          stock: v.stock,
          low_stock_threshold: v.low_stock_threshold,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Variante;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QK] });
    },
  });
}
