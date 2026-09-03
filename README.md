# Plataforma de Gestión - Frontend

Interfaz web construida con Next.js 16, Tailwind CSS v4 y TypeScript para la gestión operativa del contrato de servicios en campos petroleros.

> El contexto funcional completo (todos los módulos, modelo de datos del backend, decisiones y deuda técnica) vive en el vault de Obsidian `../gestion-contexto-vault`. Este README es un resumen operativo para levantar el proyecto y ubicarse en la estructura de carpetas.

> [!WARNING]
> Este repo usa Next.js 16 con cambios importantes respecto a versiones anteriores (ver `AGENTS.md`). Las rutas dinámicas reciben `params` como una `Promise` que hay que await-ear. Revisar `node_modules/next/dist/docs/` antes de escribir patrones de rutas nuevos, no asumir compatibilidad con Next 13/14/15.

---

## Stack tecnológico

| Tecnología | Versión | Propósito |
|---|---|---|
| Next.js | 16.x (App Router) | Framework React |
| React | 19.x | UI |
| TypeScript | 5.x | Tipado estático, `strict: true` |
| Tailwind CSS | v4 (CSS-first, sin `tailwind.config.js`) | Estilos utilitarios y design system |
| Zustand | 5.x | Estado global (auth, tema) |
| TanStack Query | 5.x | Cache y estado del servidor |
| Axios | 1.x | Cliente HTTP con interceptores JWT |
| socket.io-client | — | Notificaciones en tiempo real |
| React Hook Form | 7.x | Formularios |
| Zod | 4.x | Validación de esquemas |
| Recharts | — | Gráficas de informes |
| Leaflet | — | Mapas (módulo de vías) |
| docx / html2pdf.js / pdfjs-dist / exceljs | — | Exportación de informes a Word/PDF/Excel |
| Lucide React | — | Iconografía |
| Sonner | — | Notificaciones toast |
| pnpm | — | Gestor de paquetes |

No hay tests automatizados (sin Jest/Vitest/Playwright). El control de calidad se hace de forma manual, registrado en `qa-reports/`.

---

## Requisitos previos

- Node.js v20 o superior
- pnpm
- Backend corriendo (por defecto en `http://localhost:3001`, ver `gestion-backend/README.md`)

---

## Instalación

```bash
git clone <url-del-repo>
cd gestion-frontend

pnpm install

# No existe .env.example - crear .env.local a mano con las variables de la sección siguiente
```

---

## Variables de entorno

Crear `.env.local` en la raíz:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_WS_URL=http://localhost:3001
NEXT_PUBLIC_API_KEY=

# Tokens de validación server-side para los flujos públicos por link (ver más abajo)
COMPRAS_TOKEN=
DOTACIONES_AUTORIZADOR_TOKEN=
```

`NEXT_PUBLIC_API_URL` cae por defecto a `http://localhost:3001/api/v1` si no se define. `NEXT_PUBLIC_API_KEY`, si existe, se envía como header `X-Api-Key` en cada request (algunos endpoints del backend lo exigen en vez de JWT, ver sección de flujos públicos).

---

## Comandos disponibles

```bash
pnpm dev      # Desarrollo (Turbopack), puerto 3000 por defecto
pnpm build    # Build de producción
pnpm start    # Servir el build de producción
pnpm lint     # ESLint
```

---

## Estructura del proyecto

Organización **feature-based**: cada dominio de negocio tiene su propia tríada de hooks, tipos y componentes con el mismo nombre.

```
src/
├── app/                  # App Router: rutas y páginas (cascarones delgados)
│   ├── auth/                # Login, cambio de contraseña, verificación de email
│   ├── dashboard/            # Rutas protegidas (Header + Sidebar + AuthGuard)
│   │   └── <modulo>/           # page.tsx envuelve components/modulos/<modulo>/<modulo>-view.tsx en <ModuleGuard>
│   └── (rutas públicas con token en la URL, ver abajo)
├── components/
│   ├── auth/                # Login, guard de autenticación
│   ├── layout/               # Header, sidebar, ModuleGuard, panel de notificaciones
│   ├── modulos/              # El grueso de la app: un subdirectorio por dominio de negocio
│   ├── providers/            # QueryClientProvider + SocketProvider + Toaster + ThemeEffect
│   └── ui/                    # Primitivas genéricas (pocas: modal-portal, firma-canvas, module-placeholder)
├── config/               # modules.config.ts - mapa slug -> icono/label, sincronizado con el seed del backend
├── hooks/                 # Hooks de datos (TanStack Query), organizados por dominio
├── lib/                    # axios, utilidades, generadores de exportación, firma, push
├── stores/                 # Zustand: auth.store.ts
└── types/                   # Tipos TS por dominio (*.types.ts), reflejan los DTOs del backend
```

### Rutas públicas con token en la URL

Fuera del layout autenticado, validadas contra variables de entorno server-side (`COMPRAS_TOKEN`, `DOTACIONES_AUTORIZADOR_TOKEN`) o contra un UUID generado por el backend: `app/consumables/compras/[token]`, `app/consumables/llenado/[id]`, `app/consumables/solicitudes/[id]`, `app/dotaciones/[token]`, `app/dotaciones/autorizador/[token]`, `app/vault/[token]`, `app/via-vault/[token]`. Permiten que terceros externos (proveedores, autorizadores, trabajadores de campo) accedan a un formulario puntual sin cuenta.

---

## Arquitectura de autenticación

```
Login -> access_token (en Zustand persist / localStorage) + refresh_token (cookie HttpOnly)
         |
Cada request -> Authorization: Bearer {access_token}
         |
401 recibido -> interceptor de Axios intenta refresh automático (con cola de requests concurrentes)
         |
Nuevo access_token -> reintenta el request original
         |
Refresh fallido -> limpia sesión -> redirige a /auth/login?returnUrl=...
```

El estado de autenticación se persiste en `localStorage` bajo la clave `auth-storage` (Zustand `persist`). El interceptor de Axios (`src/lib/axios.ts`) lee el token directamente de `localStorage`, no del store en memoria, para evitar condiciones de carrera antes de que Zustand hidrate en cliente.

`AuthGuard` protege el layout autenticado (redirige a `/auth/login` si no hay sesión, o a `/auth/change-password` si `is_first_login`). `ModuleGuard` protege cada ruta de módulo consultando `GET /modules/my-access`.

---

## Sistema de permisos

El sidebar se construye dinámicamente a partir de `GET /modules/my-access`. El hook `usePermissions(moduleSlug)` expone `canCreate/canEdit/canDelete/canExport` por módulo:

```typescript
const { canCreate, canEdit, canDelete } = usePermissions('tools');

{canCreate && <button>Agregar herramienta</button>}
```

`admin` tiene bypass total (siempre `true`, sin consultar el mapa de módulos). El rol `supervisor` además dispara **vistas completas alternativas** en varios módulos (no solo botones ocultos) - patrón `if (isSupervisor) return <SupervisorXView/>`.

Roles existentes: `admin`, `coordinator`, `module_manager`, `supervisor`.

---

## Módulos de la plataforma

| Módulo | Slug | Ruta | Estado |
|---|---|---|---|
| Dashboard | `dashboard` | `/dashboard` | Completo, informes embebidos |
| Autenticación | - | `/auth/*` | Completo |
| Dotaciones / Indumentaria | `consumables` (submódulo) | `/dashboard/consumables` | Completo |
| Consumibles / Compras | `consumables` | `/dashboard/consumables` | Completo |
| Herramientas / Servicios | `tools` | `/dashboard/tools` | Completo, en desarrollo activo |
| Actividades / Cuadrillas / Bitácora | `reports` (submódulo) | `/dashboard/reports` | Completo |
| Vías | `reports` (submódulo) | `/dashboard/reports` | Completo |
| Cumplimiento (Compliance) | `reports` (submódulo) | `/dashboard/reports` | Completo |
| Monitoreo (auditoría y voz) | `monitoring` | `/dashboard/monitoring` | Completo |
| Usuarios y roles | `users` | `/dashboard/users` | Completo |
| Configuración / perfil | `settings` | `/dashboard/settings` | Completo |
| Equipos | `equipment` | `/dashboard/equipment` | **Placeholder - próximo módulo a construir** |
| Vehículos | `vehicles` | `/dashboard/vehicles` | Placeholder |

Detalle funcional completo de cada módulo (componentes, endpoints, roles) en el vault: `../gestion-contexto-vault/02-Modulos/`.

---

## Conexión con el backend

Todas las llamadas usan la instancia de Axios de `src/lib/axios.ts` (nunca `fetch` directo). Maneja automáticamente: inyección del header `Authorization`, refresh del access token en 401, redirección al login cuando el refresh también falla, timeout de 10s por request (extendido puntualmente en operaciones pesadas, ej. `PUT /compliance/schedules/:id/days` a 60s).

`next.config.ts` define un rewrite de `/proxy/:path*` -> `${NEXT_PUBLIC_API_URL}/api/v1/:path*` como proxy interno adicional al backend.

WebSockets: `socket.io-client` conecta al namespace `/notifications` del backend usando el `accessToken`, escucha `notification:new` para invalidar la cache de TanStack Query y mostrar toasts según prioridad.

---

## Despliegue en Vercel

1. Importar el repositorio en Vercel.
2. Framework preset: Next.js (detectado automáticamente).
3. Agregar las variables de entorno de la sección correspondiente, apuntando `NEXT_PUBLIC_API_URL` al backend desplegado.
4. Deploy.

---

## Estado del proyecto

La plataforma está en producción con la mayoría de los módulos operativos (ver tabla de módulos arriba). Quedan como placeholder **Equipos** y **Vehículos** - ambos con una vista mínima en el frontend y sin módulo dedicado en el backend todavía.

Deuda técnica y decisiones de arquitectura conocidas: `../gestion-contexto-vault/04-Decisiones-y-Riesgos/`.
