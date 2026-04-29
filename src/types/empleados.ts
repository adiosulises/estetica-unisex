export type EmpleadoRol = "admin" | "employee";

export interface Empleado {
  id: string;
  full_name: string;
  phone: string | null;
  role: EmpleadoRol;
  salary_pct: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
