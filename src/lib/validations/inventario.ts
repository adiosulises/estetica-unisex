import { z } from "zod";

export const varianteSchema = z.object({
  size: z.string().max(20).optional().or(z.literal("")),
  color: z.string().max(50).optional().or(z.literal("")),
  price: z.number().positive("Precio inválido").optional(),
  stock: z.number().int().min(0, "Stock no puede ser negativo"),
  low_stock_threshold: z.number().int().min(0),
});

export const productoSchema = z.object({
  brand_id: z.string().uuid("Selecciona una marca").optional().or(z.literal("")),
  name: z.string().min(1, "El nombre es requerido").max(150),
  sku_prefix: z
    .string()
    .min(1, "El prefijo es requerido")
    .max(6, "Máximo 6 caracteres")
    .regex(/^[a-zA-Z0-9]+$/),
  category: z.string().min(1, "La categoría es requerida").max(80),
  base_price: z.number({ error: "Precio inválido" }).positive("El precio debe ser mayor a 0"),
  description: z.string().max(500).optional().or(z.literal("")),
  production_cost: z.number().min(0).catch(0),
  production_paid_by: z.enum(["none", "store", "employee"]),
  production_paid_by_employee_id: z.string().uuid().optional().or(z.literal("")),
  production_notes: z.string().max(300).optional().or(z.literal("")),
  variants: z.array(varianteSchema).min(1, "Agrega al menos una variante"),
});

export const batchSchema = z.object({
  products: z.array(productoSchema).min(1),
});

export type VarianteFormValues = z.infer<typeof varianteSchema>;
export type ProductoFormValues = z.infer<typeof productoSchema>;
export type BatchFormValues = z.infer<typeof batchSchema>;
