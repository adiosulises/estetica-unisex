import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  // Verificar que quien llama es admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: caller } = await supabase
    .from("employees")
    .select("role")
    .eq("id", user.id)
    .single();

  if (caller?.role !== "admin") {
    return NextResponse.json({ error: "Solo admins pueden crear empleados" }, { status: 403 });
  }

  const body = await request.json();
  const { email, password, full_name, phone, role, salary_pct } = body;

  if (!email || !password || !full_name) {
    return NextResponse.json({ error: "Email, contraseña y nombre son requeridos" }, { status: 400 });
  }

  const admin = createAdminClient();

  // 1. Crear usuario en Supabase Auth
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    if (authError.message.includes("already registered")) {
      return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });
    }
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  // 2. Insertar en public.employees con el mismo UUID
  const { data: employee, error: empError } = await admin
    .from("employees")
    .insert({
      id: authData.user.id,
      full_name,
      phone: phone || null,
      role: role ?? "employee",
      salary_pct: salary_pct ?? 0,
    })
    .select()
    .single();

  if (empError) {
    // Revertir: eliminar el usuario de Auth si falla el insert
    await admin.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: empError.message }, { status: 500 });
  }

  return NextResponse.json({ employee }, { status: 201 });
}
