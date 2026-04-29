"use client";

import { useState } from "react";
import { Plus, KeyRound, UserX, UserCheck, Pencil, Users } from "lucide-react";
import {
  useEmpleados,
  useCreateEmpleado,
  useUpdateEmpleado,
  useToggleEmpleadoActivo,
  useResetPassword,
} from "@/hooks/use-empleados";
import { Modal } from "@/components/ui/modal";
import { CrearEmpleadoForm } from "@/components/empleados/crear-empleado-form";
import { EditarEmpleadoForm } from "@/components/empleados/editar-empleado-form";
import { CambiarPasswordForm } from "@/components/empleados/cambiar-password-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Empleado } from "@/types/empleados";
import type { CrearEmpleadoValues, EditarEmpleadoValues, CambiarPasswordValues } from "@/lib/validations/empleados";

type Modal = "crear" | "editar" | "password" | null;

export default function EmpleadosPage() {
  const [modal, setModal] = useState<Modal>(null);
  const [selected, setSelected] = useState<Empleado | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const { data: empleados = [], isLoading } = useEmpleados();
  const createEmpleado = useCreateEmpleado();
  const updateEmpleado = useUpdateEmpleado(selected?.id ?? "");
  const toggleActivo = useToggleEmpleadoActivo();
  const resetPassword = useResetPassword();

  const filtered = showInactive
    ? empleados
    : empleados.filter((e) => e.is_active);

  function openEditar(emp: Empleado) {
    setSelected(emp);
    setModal("editar");
  }

  function openPassword(emp: Empleado) {
    setSelected(emp);
    setModal("password");
  }

  function closeModal() {
    setModal(null);
    setSelected(null);
  }

  async function handleCrear(values: CrearEmpleadoValues) {
    await createEmpleado.mutateAsync(values);
    closeModal();
  }

  async function handleEditar(values: EditarEmpleadoValues) {
    await updateEmpleado.mutateAsync(values);
    closeModal();
  }

  async function handlePassword(values: CambiarPasswordValues) {
    if (!selected) return;
    await resetPassword.mutateAsync({ id: selected.id, password: values.password });
    closeModal();
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Empleados</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            {filtered.length} empleado{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setModal("crear")}>
          <Plus size={16} />
          Nuevo empleado
        </Button>
      </div>

      <div className="mb-4">
        <label className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] cursor-pointer select-none w-fit">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded"
          />
          Mostrar inactivos
        </label>
      </div>

      {isLoading ? (
        <div className="text-sm text-[var(--muted-foreground)] py-12 text-center">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users size={40} className="text-[var(--muted-foreground)] mb-3 opacity-40" />
          <p className="text-sm text-[var(--muted-foreground)]">No hay empleados registrados</p>
          <Button onClick={() => setModal("crear")} variant="secondary" size="sm" className="mt-3">
            Crear primer empleado
          </Button>
        </div>
      ) : (
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)]">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)]">Rol</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)]">% Sueldo</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)]">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp, i) => (
                <tr
                  key={emp.id}
                  className={i < filtered.length - 1 ? "border-b border-[var(--border)]" : ""}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--foreground)]">{emp.full_name}</div>
                    {emp.phone && (
                      <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{emp.phone}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={emp.role === "admin" ? "default" : "outline"}>
                      {emp.role === "admin" ? "Admin" : "Empleado"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">
                    {emp.salary_pct > 0
                      ? `${Math.round(emp.salary_pct * 100)}%`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={emp.is_active ? "success" : "outline"}>
                      {emp.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEditar(emp)}>
                        <Pencil size={14} />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openPassword(emp)}>
                        <KeyRound size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleActivo.mutate({ id: emp.id, is_active: !emp.is_active })}
                      >
                        {emp.is_active
                          ? <UserX size={14} className="text-[var(--destructive)]" />
                          : <UserCheck size={14} className="text-green-600" />
                        }
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal === "crear"} onClose={closeModal} title="Nuevo empleado" size="md">
        <CrearEmpleadoForm onSubmit={handleCrear} onCancel={closeModal} />
      </Modal>

      <Modal
        open={modal === "editar" && !!selected}
        onClose={closeModal}
        title={`Editar — ${selected?.full_name}`}
        size="md"
      >
        {selected && (
          <EditarEmpleadoForm
            empleado={selected}
            onSubmit={handleEditar}
            onCancel={closeModal}
          />
        )}
      </Modal>

      <Modal
        open={modal === "password" && !!selected}
        onClose={closeModal}
        title={`Cambiar contraseña — ${selected?.full_name}`}
        size="sm"
      >
        <CambiarPasswordForm onSubmit={handlePassword} onCancel={closeModal} />
      </Modal>
    </div>
  );
}
