"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2 } from "lucide-react";
import {
  useCreateEmployee,
  useUpdateEmployee,
} from "@/src/hooks/reports/use-employees";
import { useFields } from "@/src/hooks/reports/use-fields";
import { ModalPortal } from "@/src/components/ui/modal-portal";
import type { Employee } from "@/src/types/reports.types";


const optStr = z.string().optional().or(z.literal(""));

const schema = z.object({
  // required
  identification_number: z.string().min(5, "Minimo 5 caracteres"),
  first_name: z.string().min(2, "Requerido"),
  last_name: z.string().min(2, "Requerido"),
  position: z.string().min(2, "Requerido"),
  salario_base: z.coerce.number().min(1, "Ingresa el salario"),
  schedules: z.array(z.string()).min(1, "Selecciona al menos un horario"),
  aux_trans: z.boolean(),
  aux_hab: z.boolean(),
  aux_ali: z.boolean(),
  field_id: optStr,
  // personal opcionales
  lugar_expedicion: optStr,
  fecha_expedicion_cedula: optStr,
  lugar_nacimiento: optStr,
  fecha_nacimiento: optStr,
  estado_civil: optStr,
  celular: optStr,
  direccion: optStr,
  correo_electronico: optStr,
  formacion: optStr,
  // contrato opcionales
  codigo_vacante: optStr,
  fecha_inicio_contrato: optStr,
  fecha_retiro_contrato: optStr,
  numero_prorroga: optStr,
  numero_otro_si: optStr,
  convenio: optStr,
  vigencia: optStr,
  // seguridad social opcionales
  eps: optStr,
  afp: optStr,
  afiliacion_sindicato: optStr,
  inclusion: optStr,
  // bancarios opcionales
  banco: optStr,
  tipo_cuenta: optStr,
  numero_cuenta: optStr,
  // certificado residencia opcionales
  lugar_exp_certificado_residencia: optStr,
  fecha_exp_certificado_residencia: optStr,
  vencimiento_certificado_residencia: optStr,
  // Estado actual
  is_active: z.boolean().default(false),
});

type FormData = z.infer<typeof schema>;

const FIELD_STYLE = {
  background: "var(--color-surface-1)",
  border: "1.5px solid var(--color-border)",
  color: "var(--color-text-900)",
  borderRadius: "8px",
  padding: "10px 14px",
  fontSize: "13px",
  width: "100%",
  outline: "none",
  transition: "all .15s",
};

const LABEL_CLASS = "text-xs font-medium uppercase tracking-wider";
const SCHEDULES = ["6x6", "5x2"];

const ESTADO_CIVIL_OPTIONS = [
  "SOLTERO/A",
  "CASADO/A",
  "UNIÓN MARITAL DE HECHO",
  "VIUDO/A",
  "DIVORCIADO/A",
  "SEPARADO/A",
];

interface EmployeeFormProps {
  employee?: Employee | null;
  defaultFieldId?: string;
  onClose: () => void;
  onSuccess?:      () => void;
}

function fieldFocus(
  e: React.FocusEvent<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >,
) {
  e.target.style.borderColor = "var(--color-secondary)";
  e.target.style.boxShadow = "0 0 0 3px var(--color-secondary-muted)";
}
function fieldBlur(
  e: React.FocusEvent<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >,
  hasError: boolean,
) {
  e.target.style.borderColor = hasError
    ? "var(--color-danger)"
    : "var(--color-border)";
  e.target.style.boxShadow = "none";
}

function toDateInput(val?: string | null) {
  if (!val) return "";
  return val.split("T")[0];
}

function empty(val?: string | null): undefined {
  return val && val.trim() !== "" ? (val as any) : undefined;
}

export function EmployeeForm({
  employee,
  defaultFieldId,
  onClose,
  onSuccess,
}: EmployeeFormProps) {
  const isEdit = !!employee;
  const create = useCreateEmployee();
  const update = useUpdateEmployee();
  const { data: fieldsData } = useFields();

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      aux_trans: false,
      aux_hab: false,
      aux_ali: false,
      schedules: [],
    },
  });

  useEffect(() => {
    if (employee) {
      reset({
        identification_number: employee.identification_number,
        first_name: employee.first_name,
        last_name: employee.last_name,
        position: employee.position,
        salario_base: employee.salario_base,
        aux_trans: employee.aux_trans,
        aux_hab: employee.aux_hab,
        aux_ali: employee.aux_ali,
        schedules: employee.schedules,
        field_id: employee.field_id ?? "",
        lugar_expedicion: employee.lugar_expedicion ?? "",
        fecha_expedicion_cedula: toDateInput(employee.fecha_expedicion_cedula),
        lugar_nacimiento: employee.lugar_nacimiento ?? "",
        fecha_nacimiento: toDateInput(employee.fecha_nacimiento),
        estado_civil: employee.estado_civil ?? "",
        celular: employee.celular ?? "",
        direccion: employee.direccion ?? "",
        correo_electronico: employee.correo_electronico ?? "",
        formacion: employee.formacion ?? "",
        codigo_vacante: employee.codigo_vacante ?? "",
        fecha_inicio_contrato: toDateInput(employee.fecha_inicio_contrato),
        fecha_retiro_contrato: toDateInput(employee.fecha_retiro_contrato),
        numero_prorroga: employee.numero_prorroga ?? "",
        numero_otro_si: employee.numero_otro_si ?? "",
        convenio: employee.convenio ?? "",
        vigencia: toDateInput(employee.vigencia),
        eps: employee.eps ?? "",
        afp: employee.afp ?? "",
        afiliacion_sindicato: employee.afiliacion_sindicato ?? "",
        inclusion: employee.inclusion ?? "",
        banco: employee.banco ?? "",
        tipo_cuenta: employee.tipo_cuenta ?? "",
        numero_cuenta: employee.numero_cuenta ?? "",
        lugar_exp_certificado_residencia:
          employee.lugar_exp_certificado_residencia ?? "",
        fecha_exp_certificado_residencia: toDateInput(
          employee.fecha_exp_certificado_residencia,
        ),
        vencimiento_certificado_residencia: toDateInput(
          employee.vencimiento_certificado_residencia,
        ),
        is_active: employee.is_active,
      });
    } else if (defaultFieldId) {
      reset((prev) => ({ ...prev, field_id: defaultFieldId }));
    }
  }, [employee, defaultFieldId, reset]);

  const selectedSchedules = watch("schedules") ?? [];

  const onSubmit = (data: FormData) => {
    const clean = (v?: string | null) => (v && v.trim() !== "" ? v : undefined);

    const base = {
      first_name: data.first_name,
      last_name: data.last_name,
      position: data.position,
      salario_base: data.salario_base,
      aux_trans: data.aux_trans,
      aux_hab: data.aux_hab,
      aux_ali: data.aux_ali,
      schedules: data.schedules,
      lugar_expedicion: clean(data.lugar_expedicion),
      fecha_expedicion_cedula: clean(data.fecha_expedicion_cedula),
      lugar_nacimiento: clean(data.lugar_nacimiento),
      fecha_nacimiento: clean(data.fecha_nacimiento),
      estado_civil: clean(data.estado_civil),
      celular: clean(data.celular),
      direccion: clean(data.direccion),
      correo_electronico: clean(data.correo_electronico),
      formacion: clean(data.formacion),
      codigo_vacante: clean(data.codigo_vacante),
      fecha_inicio_contrato: clean(data.fecha_inicio_contrato),
      fecha_retiro_contrato: clean(data.fecha_retiro_contrato),
      numero_prorroga: clean(data.numero_prorroga),
      numero_otro_si: clean(data.numero_otro_si),
      convenio: clean(data.convenio),
      vigencia: clean(data.vigencia),
      eps: clean(data.eps),
      afp: clean(data.afp),
      afiliacion_sindicato: clean(data.afiliacion_sindicato),
      inclusion: clean(data.inclusion),
      banco: clean(data.banco),
      tipo_cuenta: clean(data.tipo_cuenta),
      numero_cuenta: clean(data.numero_cuenta),
      lugar_exp_certificado_residencia: clean(
        data.lugar_exp_certificado_residencia,
      ),
      fecha_exp_certificado_residencia: clean(
        data.fecha_exp_certificado_residencia,
      ),
      vencimiento_certificado_residencia: clean(
        data.vencimiento_certificado_residencia,
      ),
      is_active: data.is_active,
    };

    if (isEdit) {
      update.mutate({ id: employee!.id, ...base }, { onSuccess: () => { onClose(); onSuccess?.(); } });
    } else {
      create.mutate(
        {
          identification_number: data.identification_number,
          field_id: clean(data.field_id),
          ...base,
        },
        { onSuccess: onClose },
      );
    }
  };

  const isPending = create.isPending || update.isPending;
  const fields = fieldsData?.data ?? [];

  const inp = (name: keyof FormData, hasError: boolean) => ({
    ...register(name),
    style: {
      ...FIELD_STYLE,
      borderColor: hasError ? "var(--color-danger)" : "var(--color-border)",
    },
    onFocus: fieldFocus,
    onBlur: (e: any) => fieldBlur(e, hasError),
  });

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-2xl rounded-xl overflow-hidden flex flex-col"
        style={{
          background: "var(--color-surface-0)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 20px 60px rgba(4,24,24,0.25)",
          maxHeight: "92vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <div>
            <h3
              className="font-display font-semibold text-base"
              style={{ color: "var(--color-secundary)" }}
            >
              {isEdit ? "Editar empleado" : "Nuevo empleado"}
            </h3>
            <p
              className="text-xs mt-0.5"
              style={{ color: "var(--color-text-400)" }}
            >
              {isEdit
                ? "Modificá los datos del empleado"
                : "Los campos marcados con * son obligatorios"}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-all"
            style={{ color: "var(--color-text-400)" }}
          >
            <X size={16} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="overflow-y-auto flex-1"
        >
          <div className="px-6 py-5 flex flex-col gap-6">
            {/* ── Datos basicos ── */}
            <Section title="Datos básicos">
              {!isEdit && (
                <Field
                  label="Número de cédula *"
                  error={errors.identification_number?.message}
                >
                  <input
                    {...inp(
                      "identification_number",
                      !!errors.identification_number,
                    )}
                    placeholder="Ej: 1234567890"
                  />
                </Field>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nombre *" error={errors.first_name?.message}>
                  <input {...inp("first_name", !!errors.first_name)} />
                </Field>
                <Field label="Apellido *" error={errors.last_name?.message}>
                  <input {...inp("last_name", !!errors.last_name)} />
                </Field>
                <Field
                  label="Lugar expedición cédula"
                  error={errors.lugar_expedicion?.message}
                >
                  <input
                    {...inp("lugar_expedicion", !!errors.lugar_expedicion)}
                    placeholder="Ej: Bogotá"
                  />
                </Field>
                <Field
                  label="Fecha expedición cédula"
                  error={errors.fecha_expedicion_cedula?.message}
                >
                  <input
                    type="date"
                    {...inp(
                      "fecha_expedicion_cedula",
                      !!errors.fecha_expedicion_cedula,
                    )}
                  />
                </Field>
                <Field
                  label="Lugar nacimiento"
                  error={errors.lugar_nacimiento?.message}
                >
                  <input
                    {...inp("lugar_nacimiento", !!errors.lugar_nacimiento)}
                  />
                </Field>
                <Field
                  label="Fecha nacimiento"
                  error={errors.fecha_nacimiento?.message}
                >
                  <input
                    type="date"
                    {...inp("fecha_nacimiento", !!errors.fecha_nacimiento)}
                  />
                </Field>
                <Field
                  label="Estado civil"
                  error={errors.estado_civil?.message}
                >
                  <select
                    {...inp("estado_civil", !!errors.estado_civil)}
                    style={{ ...FIELD_STYLE, cursor: "pointer" }}
                  >
                    <option value="">Seleccionar...</option>
                    {ESTADO_CIVIL_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Celular" error={errors.celular?.message}>
                  <input
                    {...inp("celular", !!errors.celular)}
                    placeholder="Ej: 3001234567"
                  />
                </Field>
              </div>
              <Field label="Dirección" error={errors.direccion?.message}>
                <input
                  {...inp("direccion", !!errors.direccion)}
                  placeholder="Ej: Calle 10 # 5-20"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Correo electrónico"
                  error={errors.correo_electronico?.message}
                >
                  <input
                    type="email"
                    {...inp("correo_electronico", !!errors.correo_electronico)}
                  />
                </Field>
                <Field label="Formación" error={errors.formacion?.message}>
                  <input
                    {...inp("formacion", !!errors.formacion)}
                    placeholder="Ej: Bachiller"
                  />
                </Field>
              </div>
            </Section>

            {/* ── Datos laborales ── */}
            <Section title="Datos laborales">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cargo *" error={errors.position?.message}>
                  <input
                    {...inp("position", !!errors.position)}
                    placeholder="Ej: Operario"
                  />
                </Field>
                <Field
                  label="Salario base (COP) *"
                  error={errors.salario_base?.message}
                >
                  <input
                    type="number"
                    {...inp("salario_base", !!errors.salario_base)}
                    placeholder="Ej: 1500000"
                  />
                </Field>
                <Field
                  label="Código vacante"
                  error={errors.codigo_vacante?.message}
                >
                  <input {...inp("codigo_vacante", !!errors.codigo_vacante)} />
                </Field>
                <Field label="Convenio" error={errors.convenio?.message}>
                  <input
                    {...inp("convenio", !!errors.convenio)}
                    placeholder="Ej: Loma Larga"
                  />
                </Field>
                <Field
                  label="Fecha inicio contrato"
                  error={errors.fecha_inicio_contrato?.message}
                >
                  <input
                    type="date"
                    {...inp(
                      "fecha_inicio_contrato",
                      !!errors.fecha_inicio_contrato,
                    )}
                  />
                </Field>
                <Field
                  label="Fecha retiro contrato"
                  error={errors.fecha_retiro_contrato?.message}
                >
                  <input
                    type="date"
                    {...inp(
                      "fecha_retiro_contrato",
                      !!errors.fecha_retiro_contrato,
                    )}
                  />
                </Field>
                <Field
                  label="Número prórroga"
                  error={errors.numero_prorroga?.message}
                >
                  <input
                    {...inp("numero_prorroga", !!errors.numero_prorroga)}
                    placeholder="Ej: Prorroga No2"
                  />
                </Field>
                <Field
                  label="Número otrosí"
                  error={errors.numero_otro_si?.message}
                >
                  <input
                    {...inp("numero_otro_si", !!errors.numero_otro_si)}
                    placeholder="Ej: Otrosi No1"
                  />
                </Field>
                <Field label="Vigencia" error={errors.vigencia?.message}>
                  <input type="date" {...inp("vigencia", !!errors.vigencia)} />
                </Field>
              </div>

              <div className="flex flex-col gap-2">
                <label
                  className={LABEL_CLASS}
                  style={{ color: "var(--color-text-400)" }}
                >
                  Turnos / Horario *
                </label>
                <Controller
                  control={control}
                  name="schedules"
                  render={({ field: ctrl }) => (
                    <div className="flex gap-2">
                      {SCHEDULES.map((s) => {
                        const active = ctrl.value?.includes(s);
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              const next = active
                                ? ctrl.value.filter((v: string) => v !== s)
                                : [...(ctrl.value ?? []), s];
                              ctrl.onChange(next);
                            }}
                            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                            style={{
                              background: active
                                ? "var(--color-secondary)"
                                : "var(--color-surface-1)",
                              color: active ? "#fff" : "var(--color-text-600)",
                              border: `1.5px solid ${active ? "var(--color-secondary)" : "var(--color-border)"}`,
                            }}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  )}
                />
                {errors.schedules && (
                  <span
                    className="text-xs"
                    style={{ color: "var(--color-danger)" }}
                  >
                    {errors.schedules.message}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label
                  className={LABEL_CLASS}
                  style={{ color: "var(--color-text-400)" }}
                >
                  Auxilios
                </label>
                <div className="flex flex-wrap gap-3">
                  {[
                    { name: "aux_trans" as const, label: "Transporte" },
                    { name: "aux_hab" as const, label: "Habitacion" },
                    { name: "aux_ali" as const, label: "Alimentacion" },
                  ].map(({ name, label }) => (
                    <label
                      key={name}
                      className="flex items-center gap-2 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        {...register(name)}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: "var(--color-secondary)" }}
                      />
                      <span
                        className="text-sm"
                        style={{ color: "var(--color-text-600)" }}
                      >
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {!isEdit && (
                <Field label="Planta (opcional)">
                  <select
                    {...register("field_id")}
                    style={{ ...FIELD_STYLE, cursor: "pointer" }}
                    onFocus={fieldFocus}
                    onBlur={(e) => fieldBlur(e, false)}
                  >
                    <option value="">Sin planta asignada</option>
                    {fields.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </Section>

            {/* ── Seguridad social ── */}
            <Section title="Seguridad social">
              <div className="grid grid-cols-2 gap-3">
                <Field label="EPS" error={errors.eps?.message}>
                  <input
                    {...inp("eps", !!errors.eps)}
                    placeholder="Ej: Sanitas"
                  />
                </Field>
                <Field label="AFP / Pensión" error={errors.afp?.message}>
                  <input
                    {...inp("afp", !!errors.afp)}
                    placeholder="Ej: Porvenir"
                  />
                </Field>
                <Field
                  label="Afiliación sindicato"
                  error={errors.afiliacion_sindicato?.message}
                >
                  <select
                    {...inp(
                      "afiliacion_sindicato",
                      !!errors.afiliacion_sindicato,
                    )}
                    style={{ ...FIELD_STYLE, cursor: "pointer" }}
                  >
                    <option value="">Seleccionar...</option>
                    <option value="SI">SI</option>
                    <option value="NO">NO</option>
                  </select>
                </Field>
                <Field label="Inclusión" error={errors.inclusion?.message}>
                  <input
                    {...inp("inclusion", !!errors.inclusion)}
                    placeholder="Ej: No pertenece..."
                  />
                </Field>
              </div>
            </Section>

            {/* ── Datos bancarios ── */}
            <Section title="Datos bancarios">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Banco" error={errors.banco?.message}>
                  <input
                    {...inp("banco", !!errors.banco)}
                    placeholder="Ej: Bancolombia"
                  />
                </Field>
                <Field
                  label="Tipo de cuenta"
                  error={errors.tipo_cuenta?.message}
                >
                  <select
                    {...inp("tipo_cuenta", !!errors.tipo_cuenta)}
                    style={{ ...FIELD_STYLE, cursor: "pointer" }}
                  >
                    <option value="">Seleccionar...</option>
                    <option value="AHORROS">AHORROS</option>
                    <option value="CORRIENTE">CORRIENTE</option>
                  </select>
                </Field>
                <Field
                  label="Número de cuenta"
                  error={errors.numero_cuenta?.message}
                >
                  <input {...inp("numero_cuenta", !!errors.numero_cuenta)} />
                </Field>
              </div>
            </Section>

            {/* ── Certificado de residencia ── */}
            <Section title="Certificado de residencia">
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Lugar expedición"
                  error={errors.lugar_exp_certificado_residencia?.message}
                  className="col-span-2"
                >
                  <input
                    {...inp(
                      "lugar_exp_certificado_residencia",
                      !!errors.lugar_exp_certificado_residencia,
                    )}
                  />
                </Field>
                <Field
                  label="Fecha expedición"
                  error={errors.fecha_exp_certificado_residencia?.message}
                >
                  <input
                    type="date"
                    {...inp(
                      "fecha_exp_certificado_residencia",
                      !!errors.fecha_exp_certificado_residencia,
                    )}
                  />
                </Field>
                <Field
                  label="Vencimiento"
                  error={errors.vencimiento_certificado_residencia?.message}
                >
                  <input
                    type="date"
                    {...inp(
                      "vencimiento_certificado_residencia",
                      !!errors.vencimiento_certificado_residencia,
                    )}
                  />
                </Field>
              </div>
            </Section>
            <Section title="Estado actual">
              <label className="flex items-center gap-3 cursor-pointer select-none w-fit">
                <input
                  type="checkbox"
                  {...register("is_active")}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: "var(--color-secondary)" }}
                />
                <span
                  className="text-sm font-medium"
                  style={{ color: watch("is_active") ? "#16a34a" : "#dc2626" }}
                >
                  {watch("is_active") ? "Empleado activo" : "Empleado inactivo"}
                </span>
              </label>
            </Section>
          </div>

          <div
            className="flex gap-3 px-6 py-4 shrink-0"
            style={{ borderTop: "1px solid var(--color-border)" }}
          >
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium hover:opacity-70 transition-opacity"
              style={{
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-600)",
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-opacity"
              style={{
                background: "var(--color-primary)",
                color: "#fff",
                opacity: isPending ? 0.75 : 1,
              }}
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {isPending
                ? "Guardando..."
                : isEdit
                  ? "Guardar cambios"
                  : "Crear empleado"}
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
}

// ── Helpers ──
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p
        className="text-xs font-mono uppercase tracking-wider pb-2"
        style={{
          color: "var(--color-text-400)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        {title}
      </p>
      {children}
    </div>
  );
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <label
        className="text-xs font-medium uppercase tracking-wider"
        style={{ color: "var(--color-text-400)" }}
      >
        {label}
      </label>
      {children}
      {error && (
        <span className="text-xs" style={{ color: "var(--color-danger)" }}>
          {error}
        </span>
      )}
    </div>
  );
}
