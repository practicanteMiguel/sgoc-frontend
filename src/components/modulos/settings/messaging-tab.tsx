"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Send,
  Loader2,
  ChevronDown,
  AlertCircle,
  Info,
  Zap,
} from "lucide-react";
import { useSendNotification } from "@/src/hooks/settings/use-notifications";
import { useListUsersSelect } from "@/src/hooks/users/use-users";
import { ROLE_LABELS } from "@/src/lib/utils";

const schema = z.object({
  recipient_id: z.string().min(1, "Seleccioná un destinatario"),
  title: z.string().min(3, "Mínimo 3 caracteres").max(100),
  message: z.string().min(5, "Mínimo 5 caracteres").max(500),
  priority: z.enum(["low", "medium", "high"]),
});
type FormData = z.infer<typeof schema>;

const PRIORITY_OPTIONS = [
  {
    value: "low" as const,
    label: "Informativo",
    icon: Info,
    color: "var(--color-info)",
    bg: "var(--color-info-bg)",
  },
  {
    value: "medium" as const,
    label: "Media prioridad",
    icon: AlertCircle,
    color: "var(--color-warning)",
    bg: "var(--color-warning-bg)",
  },
  {
    value: "high" as const,
    label: "Urgente",
    icon: Zap,
    color: "var(--color-danger)",
    bg: "var(--color-danger-bg)",
  },
];

const FIELD_STYLE = {
  background: "var(--color-surface-1)",
  border: "1.5px solid var(--color-border)",
  color: "var(--color-text-900)",
  borderRadius: "8px",
  fontSize: "13px",
  width: "100%",
  outline: "none",
  transition: "all .15s",
};

export function MessagingTab() {
  const sendNotif = useSendNotification();
  const { data: users } = useListUsersSelect();
  const [charCount, setCharCount] = useState(0);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: "low" },
  });

  const onSubmit = (data: FormData) => {
    sendNotif.mutate(data, {
      onSuccess: () => {
        reset({ priority: "low", title: "", message: "" ,recipient_id: ""});
        setCharCount(0);
      },
    });
  };

  return (
    <div className="max-w-4xl">
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "var(--color-surface-0)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div
          className="px-5 py-3 flex items-center gap-3"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <Send size={15} style={{ color: "var(--color-secudary)" }} />
          <p
            className="text-xs font-mono uppercase tracking-widest"
            style={{ color: "var(--color-text-400)" }}
          >
            Enviar mensaje interno
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="p-5 flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <label
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: "var(--color-text-400)" }}
            >
              Destinatario
            </label>
            <div className="relative">
              <select
                {...register("recipient_id")}
                style={{
                  ...FIELD_STYLE,
                  padding: "10px 36px 10px 14px",
                  appearance: "none",
                  cursor: "pointer",
                  borderColor: errors.recipient_id
                    ? "var(--color-danger)"
                    : "var(--color-border)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--color-secondary)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors.recipient_id
                    ? "var(--color-danger)"
                    : "var(--color-border)";
                }}
              >
                <option value="">Seleccioná un usuario...</option>
                {users?.map((u) => {
                  const role = u.user_roles?.[0]?.role?.slug ?? "";
                  return (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} — {ROLE_LABELS[role] ?? role}
                    </option>
                  );
                })}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "var(--color-text-400)" }}
              />
            </div>
            {errors.recipient_id && (
              <span
                className="text-xs"
                style={{ color: "var(--color-danger)" }}
              >
                {errors.recipient_id.message}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: "var(--color-text-400)" }}
            >
              Prioridad
            </label>
            <Controller
              name="priority"
              control={control}
              render={({ field }) => (
                <div className="grid md:grid-cols-3 gap-2">
                  {PRIORITY_OPTIONS.map(
                    ({ value, label, icon: Icon, color, bg }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => field.onChange(value)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all"
                        style={{
                          background:
                            field.value === value
                              ? bg
                              : "var(--color-surface-1)",
                          color:
                            field.value === value
                              ? color
                              : "var(--color-text-400)",
                          border: "1.5px solid",
                          borderColor:
                            field.value === value
                              ? color
                              : "var(--color-border)",
                        }}
                      >
                        <Icon size={13} /> {label}
                      </button>
                    ),
                  )}
                </div>
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: "var(--color-text-400)" }}
            >
              Asunto
            </label>
            <input
              {...register("title")}
              placeholder="Ej: Solicitud de revisión de vehículo"
              style={{
                ...FIELD_STYLE,
                padding: "10px 14px",
                borderColor: errors.title
                  ? "var(--color-danger)"
                  : "var(--color-border)",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--color-secondary)";
                e.target.style.boxShadow =
                  "0 0 0 3px var(--color-secondary-muted)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = errors.title
                  ? "var(--color-danger)"
                  : "var(--color-border)";
                e.target.style.boxShadow = "none";
              }}
            />
            {errors.title && (
              <span
                className="text-xs"
                style={{ color: "var(--color-danger)" }}
              >
                {errors.title.message}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: "var(--color-text-400)" }}
              >
                Mensaje
              </label>
              <span
                className="text-xs font-mono"
                style={{
                  color:
                    charCount > 450
                      ? "var(--color-warning)"
                      : "var(--color-text-200)",
                }}
              >
                {charCount}/500
              </span>
            </div>
            <textarea
              {...register("message", {
                onChange: (e) => setCharCount(e.target.value.length),
              })}
              rows={4}
              placeholder="Describí el motivo de tu mensaje con detalle..."
              style={{
                ...FIELD_STYLE,
                padding: "10px 14px",
                resize: "vertical",
                minHeight: "100px",
                borderColor: errors.message
                  ? "var(--color-danger)"
                  : "var(--color-border)",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--color-secondary)";
                e.target.style.boxShadow =
                  "0 0 0 3px var(--color-secondary-muted)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = errors.message
                  ? "var(--color-danger)"
                  : "var(--color-border)";
                e.target.style.boxShadow = "none";
              }}
            />
            {errors.message && (
              <span
                className="text-xs"
                style={{ color: "var(--color-danger)" }}
              >
                {errors.message.message}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={sendNotif.isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold w-fit transition-all"
            style={{
              background: "var(--color-primary)",
              color: "#fff",
              opacity: sendNotif.isPending ? 0.75 : 1,
            }}
          >
            {sendNotif.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            {sendNotif.isPending ? "Enviando..." : "Enviar mensaje"}
          </button>
        </form>
      </div>
    </div>
  );
}
