# Plataforma de Gestión — Frontend

Interfaz web construida con Next.js 15, Tailwind CSS v4 y TypeScript para la gestión operativa del contrato de servicios en campos petroleros.

---

## Stack tecnológico

| Tecnología | Versión | Propósito |
|---|---|---|
| Next.js | 15.x | Framework React con App Router |
| TypeScript | 5.x | Tipado estático |
| Tailwind CSS | v4 | Estilos utilitarios |
| Zustand | 5.x | Estado global (auth, tema, sidebar) |
| TanStack Query | 5.x | Cache y manejo de estado del servidor |
| Axios | 1.x | Cliente HTTP con interceptores JWT |
| React Hook Form | 7.x | Manejo de formularios |
| Zod | 3.x | Validación de esquemas |
| Lucide React | — | Iconografía |
| Sonner | — | Notificaciones toast |
| pnpm | 8.x | Gestor de paquetes |

---

## Requisitos previos

- Node.js v20 o superior
- pnpm v8 o superior
- Backend corriendo en `http://localhost:3000`

---

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/TU_USUARIO/gestion-frontend.git
cd gestion-frontend

# Instalar dependencias
pnpm install

# Copiar variables de entorno
cp .env.example .env.local
# Editar .env.local con tu URL del backend
```

---

## Variables de entorno

Crear el archivo `.env.local` en la raíz del proyecto:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

Para producción en Vercel:

```bash
NEXT_PUBLIC_API_URL=https://tu-backend.railway.app/api/v1
```

---

## Comandos disponibles

```bash
# Desarrollo con Turbopack
pnpm dev

# Build para producción
pnpm build

# Producción local
pnpm start

# Linter
pnpm lint
```

El servidor de desarrollo corre en `http://localhost:3001`

---

## Estructura del proyecto

```
src/
├── app/
│   ├── (auth)/                     # Rutas públicas — sin layout de plataforma
│   │   ├── login/
│   │   │   └── page.tsx            # Página de inicio de sesión
│   │   ├── verify-email/
│   │   │   └── page.tsx            # Verificación de correo por token
│   │   └── layout.tsx              # Layout limpio para auth
│   ├── (dashboard)/                # Rutas protegidas — con header y sidebar
│   │   ├── dashboard/page.tsx      # Panel principal
│   │   ├── users/page.tsx          # Gestión de usuarios
│   │   ├── roles/page.tsx          # Gestión de roles y permisos
│   │   ├── notifications/page.tsx  # Centro de notificaciones
│   │   ├── settings/page.tsx       # Configuración y mensajería
│   │   ├── vehicles/page.tsx       # Módulo vehículos (Fase 2)
│   │   ├── consumables/page.tsx    # Módulo consumibles (Fase 2)
│   │   ├── tools/page.tsx          # Módulo herramientas (Fase 2)
│   │   ├── equipment/page.tsx      # Módulo equipos (Fase 2)
│   │   ├── reports/page.tsx        # Módulo reportes (Fase 2)
│   │   ├── monitoring/page.tsx     # Módulo monitoreo (Fase 2)
│   │   └── layout.tsx              # Layout con Header + Sidebar + protección
│   ├── globals.css                 # Estilos globales
│   ├── layout.tsx                  # Root layout con Providers
│   └── page.tsx                    # Redirect → /dashboard o /login
│
├── components/
│   ├── layout/
│   │   ├── header.tsx              # Topbar: usuario, notificaciones, tema
│   │   ├── sidebar.tsx             # Navegación lateral dinámica por permisos
│   │   └── sidebar-item.tsx        # Item individual del sidebar
│   ├── auth/
│   │   └── auth-guard.tsx          # Protección de rutas privadas
│   └── ui/
│       ├── button.tsx              # Botón con variantes
│       ├── input.tsx               # Input con validación
│       ├── badge.tsx               # Badge de estado/prioridad
│       └── spinner.tsx             # Indicador de carga
│
├── lib/
│   ├── axios.ts                    # Cliente HTTP con interceptores JWT automáticos
│   └── utils.ts                    # cn(), formatDate(), getInitials(), labels
│
├── hooks/
│   ├── use-auth.ts                 # Hook: login, logout, verificación
│   └── use-permissions.ts          # Hook: canView, canCreate, canEdit, canDelete
│
├── stores/
│   └── auth.store.ts               # Zustand: usuario, tokens, tema (persistente)
│
├── types/
│   ├── auth.types.ts               # LoginRequest, AuthResponse, AuthUser
│   ├── user.types.ts               # User, Role, PaginatedResponse
│   └── module.types.ts             # AppModule, Notification
│
└── config/
    └── modules.config.ts           # Mapa slug → ícono, label, ruta
```

---

## Arquitectura de autenticación

### Flujo de tokens

```
Login → access_token (15 min) + refresh_token (7 días)
         ↓
Cada request → Authorization: Bearer {access_token}
         ↓
401 recibido → interceptor intenta refresh automático
         ↓
Nuevo access_token → reintenta el request original
         ↓
Refresh fallido → limpia sesión → redirige a /login
```

### Persistencia

El estado de autenticación se persiste en `localStorage` bajo la clave `auth-storage` usando Zustand persist. El interceptor de Axios lee directamente de ahí para agregar el token a cada petición.

### Protección de rutas

El layout `(dashboard)/layout.tsx` verifica si el usuario está autenticado. Si no, redirige a `/login`. Si `is_first_login` es `true`, redirige a la pantalla de cambio de contraseña.

---

## Sistema de permisos en el frontend

El sidebar se construye dinámicamente a partir de la respuesta de `GET /modules/my-access`. Cada módulo viene con sus flags de acceso:

```typescript
{
  slug: 'vehicles',
  can_view: true,
  can_create: true,
  can_edit: true,
  can_delete: false,
  can_export: true
}
```

El hook `usePermissions` expone estos flags para condicionar la UI dentro de cada módulo:

```typescript
const { canCreate, canEdit, canDelete } = usePermissions('vehicles');

// Ocultar botón si no tiene permiso
{canCreate && <Button>Agregar vehículo</Button>}
```

---

## Modo oscuro / claro

El tema se guarda en el store de Zustand y persiste en `localStorage`. Se aplica la clase `dark` al elemento `<html>` usando Tailwind CSS. El toggle está disponible en el header de la plataforma.

---

## Módulos de la plataforma

| Módulo | Slug | Ruta | Estado |
|---|---|---|---|
| Dashboard | `dashboard` | `/dashboard` | Fase 1 — estructura lista |
| Vehículos | `vehicles` | `/vehicles` | Fase 2 |
| Consumibles | `consumables` | `/consumables` | Fase 2 |
| Herramientas | `tools` | `/tools` | Fase 2 |
| Equipos | `equipment` | `/equipment` | Fase 2 |
| Reportes | `reports` | `/reports` | Fase 2 |
| Monitoreo | `monitoring` | `/monitoring` | Fase 2 |
| Usuarios | `users` | `/users` | Fase 1 |
| Configuración | `settings` | `/settings` | Fase 1 |

---

## Conexión con el backend

Todas las llamadas al backend usan la instancia de Axios configurada en `src/lib/axios.ts`. Nunca usar `fetch` directamente — el cliente de Axios maneja automáticamente:

- Inyección del `Authorization` header en cada request
- Refresh automático del access token cuando expira (401)
- Redirección al login cuando el refresh también falla
- Timeout de 10 segundos por request

---

## Despliegue en Vercel

1. Importar el repositorio en Vercel
2. Framework preset: Next.js (detectado automáticamente)
3. Agregar la variable de entorno `NEXT_PUBLIC_API_URL` apuntando al backend en Railway
4. Deploy

Vercel detecta automáticamente el proyecto Next.js y configura el build.

---

## Estado del proyecto

### Fase 1 — Completada ✅
- Configuración del proyecto con Next.js 15 + Tailwind v4
- Cliente HTTP con interceptores JWT automáticos
- Store de autenticación persistente con Zustand
- Tipos TypeScript para todas las entidades del backend
- Mapa de módulos sincronizado con el backend
- Estructura de carpetas completa para Fase 2

### Fase 2 — Pendiente 🔄

**Login y autenticación**
- Página de login con validación
- Página de verificación de email
- Pantalla de cambio de contraseña (primer login)

**Layout de la plataforma**
- Header con usuario, notificaciones y toggle de tema
- Sidebar dinámico según permisos del usuario
- Modo oscuro / claro persistente

**Módulos de negocio** (se construyen uno por uno)
- Vehículos
- Consumibles
- Herramientas
- Equipos
- Reportes
- Monitoreo con gráficas