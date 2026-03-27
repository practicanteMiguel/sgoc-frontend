"use client";

import { useState, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { useLogin } from "@/src/hooks/auth/use-auth";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});
type LoginFormData = z.infer<typeof loginSchema>;

const COLS = 14;
const ROWS = 18;
const TOTAL = COLS * ROWS;

function GridLayer({
  mousePos,
}: {
  mousePos: { x: number; y: number } | null;
}) {
  const getWeight = (id: number): number => {
    if (!mousePos) return 0;
    const hx = Math.floor(mousePos.x * COLS);
    const hy = Math.floor(mousePos.y * ROWS);
    const cx = id % COLS;
    const cy = Math.floor(id / COLS);
    const d = Math.sqrt((cx - hx) ** 2 + (cy - hy) ** 2);
    if (d === 0) return 1;
    if (d < 1.5) return 0.6;
    if (d < 2.5) return 0.25;
    return 0;
  };

  return (
    /* pointer-events-none: esta capa NUNCA intercepta eventos del mouse */
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${COLS},1fr)`,
        gridTemplateRows: `repeat(${ROWS},1fr)`,
      }}
    >
      {Array.from({ length: TOTAL }, (_, id) => {
        const w = getWeight(id);
        return (
          <div
            key={id}
            className="border-[0.5px] transition-all duration-160"
            style={{
              borderColor: "var(--color-border)",
              background: w > 0 ? `rgba(232,99,10,${w * 0.08})` : "transparent",
              transform: w > 0 ? `scale(${1 + w * 0.05})` : "scale(1)",
              boxShadow:
                w > 0
                  ? `0 0 ${w * 18}px rgba(232,99,10,${w * 0.45}),inset 0 0 ${w * 8}px rgba(232,99,10,${w * 0.1})`
                  : "none",
            }}
          />
        );
      })}
    </div>
  );
}

/* ── Logo ─────────────────────────────────────────────────── */
function Logo({ size = 36 }: { size?: number }) {
  return (
    <div
      className="rounded-lg shrink-0 flex items-center justify-center"
      style={{ width: size, height: size, background: "var(--color-brand)" }}
    >
      <svg
        width={size * 0.5}
        height={size * 0.5}
        viewBox="0 0 18 18"
        fill="none"
      >
        <rect x="2" y="2" width="6" height="6" rx="1.5" fill="white" />
        <rect
          x="10"
          y="2"
          width="6"
          height="6"
          rx="1.5"
          fill="white"
          fillOpacity="0.5"
        />
        <rect
          x="2"
          y="10"
          width="6"
          height="6"
          rx="1.5"
          fill="white"
          fillOpacity="0.5"
        />
        <rect x="10" y="10" width="6" height="6" rx="1.5" fill="white" />
      </svg>
    </div>
  );
}

/* ── Field error ──────────────────────────────────────────── */
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p
      className="flex items-center gap-1 text-xs animate-fade-in"
      style={{ color: "var(--color-danger)" }}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="currentColor"
        className="shrink-0"
      >
        <path d="M6 1a5 5 0 100 10A5 5 0 006 1zm0 3a.75.75 0 01.75.75v2a.75.75 0 01-1.5 0v-2A.75.75 0 016 4zm0 5.5a.75.75 0 110-1.5.75.75 0 010 1.5z" />
      </svg>
      {msg}
    </p>
  );
}

/* ── Main ─────────────────────────────────────────────────── */
export function LoginForm() {
  const [showPass, setShowPass] = useState(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const login = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginFormData) => login.mutate(data);

  /* El tracking se hace en el panel padre, no en la grid */
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = leftPanelRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMousePos({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  }, []);

  const inputBase =
    "w-full rounded-md outline-none transition-all duration-200 login-input font-sans" +
    " placeholder:text-[--color-text-200]";

  const inputStyle = {
    padding: "clamp(0.65rem,1.2vw,0.875rem) 1rem",
    background: "var(--color-surface-1)",
    color: "var(--color-text-900)",
    fontSize: "clamp(0.8rem,1.2vw,0.9rem)",
  };

  const labelClass = "text-[0.65rem] font-mono uppercase tracking-[0.15em]";

  return (
    <div className="flex w-full min-h-svh flex-col lg:flex-row">
      <div
        ref={leftPanelRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setMousePos(null)}
        className="relative grid justify-between items-center p-12  xl:w-1/2 "
        style={{
          background: "var(--color-surface-1)",
        }}
      >
        {/* Grid interactiva — solo visible en desktop */}
        <div className="hidden lg:block">
          <GridLayer mousePos={mousePos} />
        </div>

        {/* Línea de acento izquierda — solo desktop */}
        <div
          className="hidden lg:block absolute top-0 left-0 h-full pointer-events-none"
          style={{
            width: "3px",
            background:
              "linear-gradient(180deg,var(--color-brand) 0%,transparent 100%)",
            zIndex: 2,
          }}
        />

        {/* Borde inferior móvil */}
        <div
          className="lg:hidden absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{ height: "1px", background: "var(--color-border)" }}
        />

        {/* ── Contenido — pointer-events-none para no romper grid ── */}
        <div className="relative pointer-events-none  " style={{ zIndex: 2 }}>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-6 lg:mb-0 animate-slide-left pointer-events-auto ">
            <Logo size={32} />
            <span
              className="text-[0.65rem] font-mono uppercase tracking-[0.18em]"
              style={{ color: "var(--color-text-400)" }}
            >
              Gestión Operativa
            </span>
          </div>
        </div>

        {/* Copy central — solo en desktop ocupa espacio vertical propio */}
        <div className="relative stagger  " style={{ zIndex: 2 }}>
          <div className="pointer-events-none">
            {/* Badge */}
            <div className="flex items-center gap-2 mb-4 animate-fade-in">
              <span
                className="inline-block rounded-full animate-pulse-brand"
                style={{
                  width: "0.5rem",
                  height: "0.5rem",
                  background: "var(--color-brand)",
                }}
              />
              <span
                className="text-[0.65rem]  font-mono uppercase tracking-[0.2em]"
                style={{ color: "var(--color-brand)" }}
              >
                Sistema activo
              </span>
            </div>

            {/* Headline */}
            <h1
              className="font-bold leading-none mb-4 animate-fade-in"
              style={{
                fontSize: "clamp(2rem,4.5vw,4rem)",
                color: "var(--color-text-900)",
                letterSpacing: "-0.03em",
              }}
            >
              Control total
              <br />
              <span style={{ color: "var(--color-brand)" }}>en campo.</span>
            </h1>

            {/* Descripción */}
            <p
              className="leading-[1.8] animate-fade-in"
              style={{
                color: "var(--color-text-400)",
                fontSize: "clamp(0.8rem,1.1vw,0.875rem)",
                maxWidth: "22rem",
              }}
            >
              Plataforma centralizada para la gestión de vehículos, consumibles,
              herramientas y equipos del contrato de operación.
            </p>
          </div>
        </div>

        {/* Stats — solo desktop */}
        <div
          className="hidden lg:grid grid-cols-3 gap-3 animate-fade-in relative"
          style={{ zIndex: 2 }}
        >
          {[
            { label: "Campos activos", value: "12" },
            { label: "Supervisores", value: "38" },
            { label: "Módulos", value: "09" },
          ].map((s) => (
            <div
              key={s.label}
              className="flex flex-col gap-1 rounded-lg p-4 transition-all duration-200
                         hover:-translate-y-0.5 cursor-default"
              style={{
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = "var(--color-brand)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = "var(--color-border)")
              }
            >
              <span
                className="font-bold font-mono leading-none"
                style={{
                  fontSize: "clamp(1.6rem,2.5vw,2.2rem)",
                  color: "var(--color-brand)",
                }}
              >
                {s.value}
              </span>
              <span
                className="text-[0.7rem]"
                style={{ color: "var(--color-text-400)" }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Footer — solo desktop */}
        <p
          className="hidden lg:block relative text-[0.7rem] font-mono tracking-[0.05em]"
          style={{ zIndex: 2, color: "var(--color-text-200)" }}
        >
          © 2026 Todos los derechos reservados · Plataforma de Gestión Operativa
          · Versión 1.0
        </p>
      </div>

      {/* ══ PANEL DERECHO — FORMULARIO ═══════════════════════ */}
      <div
        className="flex  flex-1 md:items-center justify-center"
        style={{
          padding: "clamp(1.5rem,5vw,3rem)",
          background: "var(--color-surface-0)",
        }}
      >
        <div className="w-full" style={{ maxWidth: "22rem" }}>
          {/* Encabezado */}
          <div className="mb-8 animate-fade-in">
            <h2
              className="font-bold mb-1"
              style={{
                fontSize: "clamp(1.4rem,3vw,1.75rem)",
                color: "var(--color-text-900)",
                letterSpacing: "-0.02em",
              }}
            >
              Acceso al sistema
            </h2>
            <p className="text-sm" style={{ color: "var(--color-text-400)" }}>
              Ingresá tus credenciales para continuar
            </p>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4 stagger"
          >
            {/* Email */}
            <div className="flex flex-col gap-1.5 animate-fade-in">
              <label
                className={labelClass}
                style={{ color: "var(--color-text-400)" }}
              >
                Correo electrónico
              </label>
              <input
                {...register("email")}
                type="email"
                placeholder="tu@empresa.com"
                autoComplete="email"
                className={`${inputBase} ${errors.email ? "login-input--error" : ""}`}
                style={{
                  ...inputStyle,
                  border: `1.5px solid ${errors.email ? "var(--color-danger)" : "var(--color-border)"}`,
                }}
              />
              <FieldError msg={errors.email?.message} />
            </div>

            {/* Contraseña */}
            <div className="flex flex-col gap-1.5 animate-fade-in">
              <label
                className={labelClass}
                style={{ color: "var(--color-text-400)" }}
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  {...register("password")}
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={`${inputBase} pr-11 ${errors.password ? "login-input--error" : ""}`}
                  style={{
                    ...inputStyle,
                    border: `1.5px solid ${errors.password ? "var(--color-danger)" : "var(--color-border)"}`,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-opacity hover:opacity-60"
                  style={{ color: "var(--color-text-400)" }}
                  aria-label={
                    showPass ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <FieldError msg={errors.password?.message} />
            </div>

            {/* Error servidor */}
            {login.isError && (
              <div
                className="flex items-center gap-2 rounded-lg text-sm animate-fade-in"
                style={{
                  padding: "0.75rem 1rem",
                  background: "var(--color-danger-bg)",
                  border:
                    "1px solid color-mix(in srgb,var(--color-danger) 25%,transparent)",
                  color: "var(--color-danger)",
                  fontSize: "clamp(0.75rem,1.1vw,0.875rem)",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 12 12"
                  fill="currentColor"
                  className="shrink-0"
                >
                  <path d="M6 1a5 5 0 100 10A5 5 0 006 1zm0 3a.75.75 0 01.75.75v2a.75.75 0 01-1.5 0v-2A.75.75 0 016 4zm0 5.5a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                </svg>
                Credenciales incorrectas. Verificá tus datos.
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={login.isPending}
              className="login-submit-btn animate-fade-in w-full mt-2 rounded-md font-mono font-bold
                         uppercase flex items-center justify-center gap-2 transition-all duration-150
                         disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                padding: "clamp(0.7rem,1.3vw,0.9rem) 1.25rem",
                fontSize: "clamp(0.7rem,1.1vw,0.78rem)",
                letterSpacing: "0.08em",
                background: "var(--color-brand)",
                color: "#fff",
                boxShadow: "0 4px 16px var(--color-brand-muted)",
              }}
            >
              {login.isPending ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Ingresando...</span>
                </>
              ) : (
                <>
                  <span>Ingresar al sistema</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <p
            className="text-center mt-8"
            style={{
              fontSize: "clamp(0.7rem,1vw,0.75rem)",
              color: "var(--color-text-200)",
            }}
          >
            ¿Problemas para acceder?{" "}
            <span
              className="underline decoration-dotted cursor-pointer transition-colors hover:text-[--color-brand]"
              style={{ color: "var(--color-text-400)" }}
            >
              Contactá al administrador
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
