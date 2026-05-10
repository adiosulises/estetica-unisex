import { z } from "zod";

export const crearEmpleadoSchema = z.object({
  full_name: z.string().min(1, "El nombre es requerido").max(100),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  phone: z.string().max(20).optional().or(z.literal("")),
  role: z.enum(["god", "admin", "employee"]),
  salary_pct: z.number().min(0).max(1),
});

export const editarEmpleadoSchema = z.object({
  full_name: z.string().min(1, "El nombre es requerido").max(100),
  phone: z.string().max(20).optional().or(z.literal("")),
  role: z.enum(["god", "admin", "employee"]),
  salary_pct: z.number().min(0).max(1),
});

export const cambiarPasswordSchema = z.object({
  password: z.string().min(8, "Mínimo 8 caracteres"),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: "Las contraseñas no coinciden",
  path: ["confirm"],
});

export type CrearEmpleadoValues = z.infer<typeof crearEmpleadoSchema>;
export type EditarEmpleadoValues = z.infer<typeof editarEmpleadoSchema>;
export type CambiarPasswordValues = z.infer<typeof cambiarPasswordSchema>;
