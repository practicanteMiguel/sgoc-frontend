"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, User, Mail, Phone, Briefcase, MapPin } from "lucide-react";
import { useAuthStore } from "@/src/stores/auth.store";
import { useUpdateProfile, useProfile } from "@/src/hooks/settings/use-profile";
import { getInitials, ROLE_LABELS } from "@/src/lib/utils";

const schema = z.object({
  first_name: z.string().min(2, "Mínimo 2 caracteres"),
  last_name: z.string().min(2, "Mínimo 2 caracteres"),
  phone: z.string(),
  position: z.string().min(2, "Requerido"),
});
type FormData = z.infer<typeof schema>;

const FIELD_STYLE = {
  background: "var(--color-surface-1)",
  border: "1.5px solid var(--color-border)",
  color: "var(--color-text-900)",
  borderRadius: "8px",
  padding: "10px 14px 10px 40px",
  fontSize: "13px",
  width: "100%",
  outline: "none",
  transition: "all .15s",
};

export function ProfileTab() {
  const { data: profile, isLoading } = useProfile();
  const { user } = useAuthStore();
  const updateProfile = useUpdateProfile();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (profile) {
      reset({
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone ?? "",
        position: profile.position,
      });
    }
  }, [profile, reset]);
  const roleSlug = profile?.user_roles?.[0]?.role?.slug ?? '';
  const roleLabel = ROLE_LABELS[roleSlug] ?? roleSlug;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div
        className="flex items-center gap-5 p-5 rounded-xl mb-6"
        style={{
          background: "var(--color-surface-0)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold font-display shrink-0"
          style={{ background: "var(--color-secondary)", color: "#fff" }}
        >
          {profile ? getInitials(profile.first_name, profile.last_name) : "?"}
        </div>
        <div>
          <p
            className="font-display font-semibold text-lg"
            style={{ color: "var(--color-secundary)" }}
          >
            {profile?.first_name} {profile?.last_name}
          </p>
          <p
            className="text-sm mt-0.5"
            style={{ color: "var(--color-text-400)" }}
          >
            {profile?.email}
          </p>
          <span
            className="inline-block mt-1.5 text-xs px-2.5 py-0.5 rounded-full font-medium"
            style={{
              background: "var(--color-secundary-muted)",
              color: "var(--color-secundary)",
              border: "1px solid rgba(7,44,44,0.15)",
            }}
          >
            {roleLabel}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit((d) => updateProfile.mutate(d))}>
        <div
          className="rounded-xl overflow-hidden mb-4"
          style={{
            background: "var(--color-surface-0)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div
            className="px-5 py-3"
            style={{ borderBottom: "1px solid var(--color-border)" }}
          >
            <p
              className="text-xs font-mono uppercase tracking-widest"
              style={{ color: "var(--color-text-400)" }}
            >
              Información personal
            </p>
          </div>
          <div className="p-5 flex flex-col gap-4">
            <div className="grid md:grid-cols-2 gap-3">
              {[
                { name: "first_name" as const, label: "Nombre", Icon: User },
                { name: "last_name" as const, label: "Apellido", Icon: User },
              ].map(({ name, label, Icon }) => (
                <div key={name} className="flex flex-col gap-1.5">
                  <label
                    className="text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--color-text-400)" }}
                  >
                    {label}
                  </label>
                  <div className="relative">
                    <Icon
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2"
                      style={{ color: "var(--color-text-400)" }}
                    />
                    <input
                      {...register(name)}
                      style={{
                        ...FIELD_STYLE,
                        borderColor: errors[name]
                          ? "var(--color-danger)"
                          : "var(--color-border)",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "var(--color-secondary)";
                        e.target.style.boxShadow =
                          "0 0 0 3px var(--color-secondary-muted)";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = errors[name]
                          ? "var(--color-danger)"
                          : "var(--color-border)";
                        e.target.style.boxShadow = "none";
                      }}
                    />
                  </div>
                  {errors[name] && (
                    <span
                      className="text-xs"
                      style={{ color: "var(--color-danger)" }}
                    >
                      {errors[name]?.message}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {[
              {
                name: "position" as const,
                label: "Cargo",
                Icon: Briefcase,
                placeholder: "Ej: Supervisor de Planta",
              },
              {
                name: "phone" as const,
                label: "Teléfono",
                Icon: Phone,
                placeholder: "+57 300 000 0000",
              },
            ].map(({ name, label, Icon, placeholder }) => (
              <div key={name} className="flex flex-col gap-1.5">
                <label
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: "var(--color-text-400)" }}
                >
                  {label}
                </label>
                <div className="relative">
                  <Icon
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--color-text-400)" }}
                  />
                  <input
                    {...register(name)}
                    placeholder={placeholder}
                    style={{
                      ...FIELD_STYLE,
                      borderColor: "var(--color-border)",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "var(--color-secondary)";
                      e.target.style.boxShadow =
                        "0 0 0 3px var(--color-secondary-muted)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "var(--color-border)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>
              </div>
            ))}

            <div className="grid md:grid-cols-2 gap-3">
              {[
                { label: "Correo", value: profile?.email, Icon: Mail },
                ...(roleSlug === 'supervisor' ? [{ label: "Campo", value: (profile?.field as { name?: string } | null)?.name ?? "—", Icon: MapPin }] : []),
              ].map(({ label, value, Icon }) => (
                <div key={label} className="flex flex-col gap-1.5">
                  <label
                    className="text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--color-text-400)" }}
                  >
                    {label}
                  </label>
                  <div className="relative">
                    <Icon
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2"
                      style={{ color: "var(--color-text-400)" }}
                    />
                    <div
                      style={{
                        ...FIELD_STYLE,
                        opacity: 0.6,
                        cursor: "default",
                        userSelect: "none",
                      }}
                    >
                      {value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={!isDirty || updateProfile.isPending}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
          style={{
            background: !isDirty
              ? "var(--color-surface-2)"
              : "var(--color-primary)",
            color: !isDirty ? "var(--color-text-400)" : "#fff",
            border: "1px solid var(--color-border)",
            opacity: updateProfile.isPending ? 0.75 : 1,
            cursor: !isDirty ? "default" : "pointer",
          }}
        >
          {updateProfile.isPending && (
            <Loader2 size={14} className="animate-spin" />
          )}
          {updateProfile.isPending ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>
    </div>
  );
}
