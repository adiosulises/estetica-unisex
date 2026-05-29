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
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">Empleados</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            {filtered.length} empleado{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setModal("crear")}>
          <Plus size={16} />
          Nuevo
        </Button>
      </div>

      <label className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] cursor-pointer select-none w-fit">
        <input
          type="checkbox"
          checked={showInactive}
          onChange={(e) => setShowInactive(e.target.checked)}
          className="rounded"
        />
        Mostrar inactivos
      </label>

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
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
          {filtered.map((emp, i) => (
            <div
              key={emp.id}
              className={`px-4 py-4 flex items-start justify-between gap-3 ${i < filtered.length - 1 ? "border-b border-[var(--border)]" : ""}`}
            >
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-[var(--foreground)] text-sm">{emp.full_name}</span>
                  <Badge variant={emp.role === "admin" ? "default" : "outline"}>
                    {emp.role === "admin" ? "Admin" : "Empleado"}
                  </Badge>
                  <Badge variant={emp.is_active ? "success" : "outline"}>
                    {emp.is_active ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
                {emp.phone && (
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{emp.phone}</p>
                )}
                {emp.salary_pct > 0 && (
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    Sueldo: {Math.round(emp.salary_pct * 100)}%
                  </p>
                )}
              </div>
              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button size="sm" variant="ghost" onClick={() => openEditar(emp)} title="Editar">
                  <Pencil size={14} />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openPassword(emp)} title="Cambiar contraseña">
                  <KeyRound size={14} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  title={emp.is_active ? "Desactivar" : "Activar"}
                  onClick={() => toggleActivo.mutate({ id: emp.id, is_active: !emp.is_active })}
                >
                  {emp.is_active
                    ? <UserX size={14} className="text-[var(--destructive)]" />
                    : <UserCheck size={14} className="text-green-600" />
                  }
                </Button>
              </div>
            </div>
          ))}
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
