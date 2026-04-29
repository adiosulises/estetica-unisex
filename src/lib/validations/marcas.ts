import { z } from "zod";

export const marcaSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(100),
  sku_prefix: z
    .string()
    .max(6, "Máximo 6 caracteres")
    .regex(/^[A-Za-z0-9]*$/, "Solo letras y números")
    .optional()
    .or(z.literal("")),
  contact_name: z.string().max(100).optional().or(z.literal("")),
  contact_email: z.string().email("Email inválido").optional().or(z.literal("")),
  contact_phone: z.string().max(20).optional().or(z.literal("")),
  contract_type: z.enum(["pct", "floor"]),
  contract_value: z.number().positive("Debe ser mayor a 0"),
  bank_account: z.string().max(200).optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export type MarcaFormValues = z.infer<typeof marcaSchema>;
