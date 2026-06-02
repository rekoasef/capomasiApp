# Sistema de Gestión Integral — Estudio Contable Capomasi

CRM/ERP liviano para un estudio contable. Reemplaza un Excel operativo por una plataforma web centralizada, multi-usuario, con control de acceso por roles.

**Cliente:** Paola Capomasi — Armstrong, Santa Fe  
**Desarrollador:** Renzo Asef — radevelopment02@gmail.com

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 15.x (App Router) + React 19 + TypeScript |
| Estilos | Tailwind CSS 4.x (config via `@theme` en CSS, sin `tailwind.config.js`) |
| Componentes | shadcn/ui |
| Backend / DB | Supabase (PostgreSQL + Auth) |
| Deploy | Vercel + Supabase Cloud |
| Testing | Jest + Testing Library |

---

## Setup local

### 1. Requisitos

- Node.js 20+
- npm 10+
- Acceso al proyecto en Supabase

### 2. Clonar e instalar

```bash
git clone <repo-url>
cd capomasi-app
npm install
```

### 3. Variables de entorno

```bash
cp .env.example .env.local
```

Completar `.env.local` con los valores del proyecto en Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Solo para API routes server-side — NUNCA en el frontend
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Las keys se obtienen en el dashboard de Supabase → Project Settings → API.

### 4. Levantar el servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). El login redirige automáticamente según el rol del usuario.

---

## Comandos

```bash
npm run dev          # servidor de desarrollo (Turbopack)
npm run build        # build de producción
npm run start        # servir el build local

npm run lint         # ESLint
npm run type-check   # TypeScript sin emitir archivos

npm run test             # todos los tests
npm run test:watch       # modo watch
npm run test:coverage    # cobertura
npm run test -- clientes # filtrar por nombre de módulo
```

---

## Estructura del proyecto

```
src/
├── app/                     # Next.js App Router
│   ├── (auth)/login/        # Login público
│   └── (dashboard)/         # Rutas protegidas (layout con sidebar)
│       ├── page.tsx          # Dashboard home
│       ├── clientes/
│       ├── honorarios/
│       ├── cobranzas/
│       ├── fondos/
│       ├── empleadas/
│       ├── proveedores/
│       └── vencimientos/
│
├── modules/                 # Módulos de negocio (núcleo del sistema)
│   └── [modulo]/
│       ├── components/      # Componentes React del módulo
│       ├── services/        # Lógica de negocio + llamadas a Supabase
│       ├── hooks/           # React Query hooks
│       ├── schemas/         # Zod schemas (única fuente de verdad de validación)
│       ├── types/           # TypeScript types
│       └── __tests__/       # Tests del módulo
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts        # Browser client (singleton, para componentes cliente)
│   │   ├── server.ts        # Server client (async, para Server Components)
│   │   └── types.ts         # Tipos generados por Supabase CLI
│   └── auth/
│       ├── AuthProvider.tsx
│       └── useAuth.ts       # Hook de sesión y rol
│
├── shared/
│   ├── components/ui/       # shadcn/ui (generados — no editar a mano)
│   ├── components/layout/   # Sidebar, Header, PageHeader
│   ├── components/          # ConfirmDialog, DataTable, etc.
│   └── utils/
│       ├── formatters.ts    # formatMoney, formatDate, formatCuit
│       └── serviceResult.ts # Tipo ServiceResult<T>
│
└── middleware.ts            # Protección de rutas y refresh de sesión
```

---

## Patrones clave

### ServiceResult — todos los services lo usan

```typescript
// Nunca throw en services — siempre retornar { ok, ... }
type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: 'DB_ERROR' | 'VALIDATION_ERROR' | 'NOT_FOUND' | ... }

// Consumo en un hook o componente:
const result = await clientesService.create(form)
if (!result.ok) { toast.error(result.error); return }
// result.data está tipado y garantizado
```

### Dos clientes Supabase — cuándo usar cada uno

```typescript
// En componentes cliente ('use client') y services → browser client
import { supabase } from '@/lib/supabase/client'

// En Server Components y page.tsx server-side → server client
import { createSupabaseServerClient } from '@/lib/supabase/server'
const supabase = await createSupabaseServerClient()
```

### Mutations con React Query

```typescript
// Siempre mutate() + onSuccess — nunca mutateAsync (puede throw)
const crear = useCrearCliente()
crear.mutate(data, {
  onSuccess: (r) => {
    if (r.ok) { form.reset(); setShowForm(false) }
    // El hook ya muestra el toast de error si !r.ok
  },
})
```

### Tests de services — mock de cadenas Supabase

```typescript
// El método terminal de la cadena es el que recibe mockResolvedValue
// Los intermedios usan mockReturnThis()
function mockChain(overrides = {}) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq:     jest.fn().mockReturnThis(),
    order:  jest.fn().mockResolvedValue({ data: [...], error: null }), // ← terminal
    ...overrides,
  }
  mockFrom.mockReturnValue(chain)
  return chain
}
```

---

## Módulos y estado

| Módulo | Ruta | Estado |
|--------|------|--------|
| Auth + Usuarios | `/login` | ✅ |
| Clientes | `/clientes` | ✅ |
| Honorarios Mensuales | `/honorarios` | ✅ |
| Facturación + Cobranzas | `/cobranzas` | ✅ |
| Trabajos Anuales | `/cobranzas` (tab) | ✅ |
| Liquidación Personal | `/empleadas` | ✅ |
| Fondos y Cheques | `/fondos` | ✅ |
| Proveedores y Gastos | `/proveedores` | ✅ |
| Vencimientos | `/vencimientos` | ✅ |
| Dashboard | `/` | 🔄 pendiente |
| Reportes | — | 🔄 pendiente |

---

## Roles

| Rol | Descripción |
|-----|-------------|
| `admin` | Paola — acceso total. Ve sueldos, claves de clientes, fondos, vencimientos personales |
| `empleada` | Victoria, Luciana, Paola Aresu — acceso de solo lectura en módulos sensibles |

RLS (Row Level Security) está habilitado en **todas** las tablas desde el momento de crearlas. Los permisos no se controlan solo en la UI — la DB los fuerza a nivel de fila.

---

## Documentación adicional

| Archivo | Contenido |
|---------|-----------|
| `docs/PROYECTO.md` | Fases, módulos, checklist de avance, migración del Excel |
| `docs/DATABASE.md` | DDL completo, RLS, triggers, views |
| `docs/ARQUITECTURA.md` | Principios, patrones de código con ejemplos, decisiones de diseño |
| `docs/BACKUPS.md` | Estrategia de backups, script, procedimientos de restore |
| `CLAUDE.md` | Instrucciones específicas para Claude Code (AI assistant) |

---

## Base de datos

Las migraciones están en `supabase/migrations/`. Para aplicar:

```bash
# Via Supabase CLI
npx supabase db push

# O directamente en el SQL Editor de Supabase dashboard
```

Para regenerar los tipos TypeScript después de cambiar el schema:

```bash
npx supabase gen types typescript --project-id <project-id> > src/lib/supabase/types.ts
```

---

## Notas para nuevos desarrolladores

- **No editar** `src/shared/components/ui/` — son archivos generados por shadcn/ui
- **No usar** `@supabase/auth-helpers-nextjs` — está deprecado. El proyecto usa `@supabase/ssr`
- **No usar** `tailwind.config.js` — Tailwind v4 usa `@theme` en `globals.css`
- En Next.js 15, `cookies()`, `headers()`, `params` y `searchParams` son Promises — siempre `await`
- Toda la lógica de negocio vive en `modules/[modulo]/services/` — nunca en componentes React
- Antes de agregar un módulo, leer `docs/ARQUITECTURA.md` para seguir los patrones establecidos
# capomasiApp
# capomasiApp
