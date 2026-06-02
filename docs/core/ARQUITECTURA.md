# Documentación de Arquitectura
## Sistema de Gestión Integral — Estudio Contable Capomasi

---

## 1. Principios de Arquitectura

| Principio | Descripción |
|-----------|-------------|
| **Modularidad por dominio** | Cada módulo de negocio es autónomo: UI, servicios, hooks, tipos y tests propios |
| **Separación de responsabilidades** | Componentes = UI; Services = lógica de negocio; DB = persistencia + seguridad |
| **Una regla, un lugar** | Ninguna regla de negocio existe en más de un lugar del código |
| **Extensibilidad** | Agregar features no debe requerir refactors masivos |
| **Seguridad por defecto** | RLS desde el día uno; sin excepciones |
| **Testeable por diseño** | Services como funciones puras → fáciles de testear con Jest |

---

## 2. Stack Completo

```
┌─────────────────────────────────────────────────┐
│                   USUARIO FINAL                  │
│            (browser — desktop/mobile)            │
└──────────────────────┬──────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────┐
│                    VERCEL                        │
│         Next.js 15.x + React 19 + TypeScript    │
│         Tailwind CSS v4 + shadcn/ui             │
│         React Query + React Hook Form           │
└──────────────────────┬──────────────────────────┘
                       │ Supabase JS SDK (@supabase/ssr)
┌──────────────────────▼──────────────────────────┐
│                  SUPABASE CLOUD                  │
│   ┌────────────┬──────────────┬──────────────┐  │
│   │ PostgreSQL │ Supabase Auth│   Storage    │  │
│   │   (+ RLS)  │ (JWT tokens) │  (archivos)  │  │
│   └────────────┴──────────────┴──────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## 3. Estructura de Carpetas

```
src/
│
├── app/                         # Next.js App Router
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx           # Layout con sidebar + header
│   │   ├── page.tsx             # Dashboard home
│   │   ├── clientes/
│   │   │   ├── page.tsx         # Lista de clientes
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx     # Detalle de cliente
│   │   │   └── nuevo/
│   │   │       └── page.tsx
│   │   ├── honorarios/
│   │   ├── cobranzas/
│   │   ├── fondos/
│   │   ├── empleadas/
│   │   ├── proveedores/
│   │   ├── vencimientos/
│   │   └── configuracion/
│   ├── api/                     # API Routes (solo si se necesita server-side)
│   │   └── auth/
│   └── layout.tsx               # Root layout
│
├── modules/                     # Módulos de negocio (núcleo del sistema)
│   │
│   ├── clientes/
│   │   ├── components/
│   │   │   ├── ClienteTable.tsx
│   │   │   ├── ClienteCard.tsx
│   │   │   ├── ClienteForm.tsx
│   │   │   └── ClavesCliente.tsx    # Solo admin
│   │   ├── services/
│   │   │   ├── clientesService.ts
│   │   │   └── clientesService.test.ts
│   │   ├── hooks/
│   │   │   ├── useClientes.ts
│   │   │   └── useClienteById.ts
│   │   ├── schemas/
│   │   │   └── clienteSchema.ts     # Zod schema
│   │   └── types/
│   │       └── index.ts             # TCliente, TClienteForm, etc.
│   │
│   ├── honorarios/
│   │   ├── components/
│   │   │   ├── HonorarioActual.tsx
│   │   │   ├── HistorialHonorarios.tsx
│   │   │   └── FormAjusteHonorario.tsx
│   │   ├── services/
│   │   │   ├── honorariosService.ts
│   │   │   └── honorariosService.test.ts
│   │   ├── hooks/
│   │   ├── schemas/
│   │   └── types/
│   │
│   ├── cobranzas/
│   │   ├── components/
│   │   ├── services/
│   │   │   ├── liquidacionesService.ts
│   │   │   ├── pagosService.ts
│   │   │   └── cuentaCorrienteService.ts
│   │   ├── hooks/
│   │   ├── schemas/
│   │   └── types/
│   │
│   ├── fondos/
│   ├── empleadas/
│   ├── proveedores/
│   ├── vencimientos/
│   └── dashboard/
│
├── lib/                         # Infraestructura compartida
│   ├── supabase/
│   │   ├── client.ts            # Cliente browser (singleton)
│   │   ├── server.ts            # Cliente server-side (API routes)
│   │   └── types.ts             # Tipos generados por Supabase CLI
│   ├── auth/
│   │   ├── AuthProvider.tsx
│   │   └── useAuth.ts
│   └── constants/
│       └── index.ts
│
├── shared/                      # Componentes y utilidades reutilizables
│   ├── components/
│   │   ├── ui/                  # shadcn/ui components (generados)
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── PageHeader.tsx
│   │   ├── DataTable.tsx        # Tabla genérica reutilizable
│   │   ├── ConfirmDialog.tsx
│   │   ├── FormField.tsx
│   │   └── StatusBadge.tsx
│   ├── utils/
│   │   ├── formatters.ts        # formatMoney, formatDate, formatCuit
│   │   ├── validators.ts        # validarCuit, etc.
│   │   └── serviceResult.ts     # Tipo ServiceResult<T>
│   └── types/
│       └── index.ts             # Tipos compartidos globales
│
└── middleware.ts                # Protección de rutas Next.js
```

---

## 4. Patrones de Código

### 4.1 Service Pattern

Cada módulo tiene su(s) service(s). Los services son el único lugar donde vive la lógica de negocio.

```typescript
// modules/honorarios/services/honorariosService.ts
import { supabase } from '@/lib/supabase/client'
import type { ServiceResult } from '@/shared/utils/serviceResult'
import type { THonorarioMensual, TAjusteHonorarioForm } from '../types'

export const honorariosService = {

  async getActivoByCliente(clienteId: string): Promise<ServiceResult<THonorarioMensual>> {
    const { data, error } = await supabase
      .from('honorarios_mensuales')
      .select('*')
      .eq('cliente_id', clienteId)
      .is('vigente_hasta', null)
      .single()

    if (error) return { ok: false, error: 'No se encontró honorario activo', code: 'NOT_FOUND' }
    return { ok: true, data }
  },

  async aplicarAjuste(
    clienteId: string,
    form: TAjusteHonorarioForm
  ): Promise<ServiceResult<THonorarioMensual>> {
    // 1. Validar con Zod
    const parsed = ajusteHonorarioSchema.safeParse(form)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.message, code: 'VALIDATION_ERROR' }
    }

    // 2. Calcular nuevo monto
    const nuevoMonto = calcularNuevoHonorario(
      form.montoActual,
      form.porcentajeInflacion
    )

    // 3. Cerrar honorario actual y crear nuevo (transacción)
    const { data, error } = await supabase.rpc('aplicar_ajuste_honorario', {
      p_cliente_id: clienteId,
      p_nuevo_monto: nuevoMonto,
      p_porcentaje: form.porcentajeInflacion,
    })

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data }
  },
}

// Función pura — fácil de testear
export function calcularNuevoHonorario(
  montoActual: number,
  porcentaje: number
): number {
  return Math.round((montoActual * (1 + porcentaje / 100)) * 100) / 100
}
```

### 4.2 ServiceResult type

```typescript
// shared/utils/serviceResult.ts
export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: string }

// Uso en componente:
const result = await honorariosService.aplicarAjuste(clienteId, form)
if (!result.ok) {
  toast.error(result.error)
  return
}
// Acá TypeScript sabe que result.data está disponible
```

### 4.3 Hook Pattern (React Query)

```typescript
// modules/honorarios/hooks/useHonorarioActivo.ts
import { useQuery } from '@tanstack/react-query'
import { honorariosService } from '../services/honorariosService'

export function useHonorarioActivo(clienteId: string) {
  return useQuery({
    queryKey: ['honorario-activo', clienteId],
    queryFn: () => honorariosService.getActivoByCliente(clienteId),
    enabled: !!clienteId,
  })
}
```

### 4.4 Zod Schema + TypeScript type

```typescript
// modules/clientes/schemas/clienteSchema.ts
import { z } from 'zod'

export const clienteSchema = z.object({
  nombre:    z.string().min(2, 'El nombre es requerido'),
  cuit:      z.string().regex(/^\d{11}$/, 'CUIT inválido (11 dígitos sin guiones)'),
  domicilio: z.string().optional(),
  telefono:  z.string().optional(),
  email:     z.string().email('Email inválido').optional().or(z.literal('')),
  localidad: z.string().optional(),
  notas:     z.string().optional(),
})

// El tipo se infiere del schema — una sola fuente de verdad
export type TClienteForm = z.infer<typeof clienteSchema>
```

### 4.5 Componente de formulario con RHF + Zod

```typescript
// modules/clientes/components/ClienteForm.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { clienteSchema, type TClienteForm } from '../schemas/clienteSchema'

export function ClienteForm({ onSubmit }: { onSubmit: (data: TClienteForm) => void }) {
  const form = useForm<TClienteForm>({
    resolver: zodResolver(clienteSchema),
    defaultValues: { nombre: '', cuit: '' },
  })

  // La validación en submit también pasa por el service (doble validación intencional)
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* ... */}
    </form>
  )
}
```

---

## 5. Clientes Supabase

> ⚠️ **`@supabase/auth-helpers-nextjs` está deprecado.** Usar `@supabase/ssr` en todos los casos.

### 5.1 Browser client (componentes cliente)

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

// Singleton — reutilizar en toda la app
let client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function getSupabaseClient() {
  if (!client) {
    client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return client
}

export const supabase = getSupabaseClient()
```

### 5.2 Server client (Server Components y API Routes)

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types'

// IMPORTANTE: función async — Next.js 15 requiere await en cookies()
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Components no pueden setear cookies — ignorar
          }
        },
      },
    }
  )
}
```

---

## 6. Middleware de rutas

> Usar `@supabase/ssr` — el `createMiddlewareClient` de `auth-helpers-nextjs` está deprecado.

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({ request: req })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Propagar cookies al request y response
          cookiesToSet.forEach(({ name, value }) =>
            req.cookies.set(name, value)
          )
          response = NextResponse.next({ request: req })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh de sesión — IMPORTANTE: llamar en cada request
  const { data: { user } } = await supabase.auth.getUser()

  // Sin sesión → redirigir al login
  if (!user && !req.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Con sesión en login → redirigir al dashboard
  if (user && req.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

---

## 7. Manejo de roles en UI

```typescript
// lib/auth/useAuth.ts
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { TUsuario } from '@/shared/types'

export function useAuth() {
  const [usuario, setUsuario] = useState<TUsuario | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Usar getUser() en lugar de getSession() — getUser() valida el token
    // contra el servidor, getSession() solo lee la cookie local (menos seguro)
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', user.id)
          .single()
        setUsuario(data)
      }
      setLoading(false)
    })

    // Suscribirse a cambios de sesión (logout, refresh, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const { data } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', session.user.id)
            .single()
          setUsuario(data)
        } else {
          setUsuario(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return {
    usuario,
    loading,
    isAdmin: usuario?.rol === 'admin',
    isEmpleada: usuario?.rol === 'empleada',
  }
}
```

---

## 8. Reglas de desarrollo obligatorias

### Lo que NUNCA va en un componente React
```typescript
// ❌ MAL — lógica de negocio en el componente
function HonorarioCard({ cliente }) {
  const nuevoMonto = cliente.honorario * (1 + inflacion / 100)  // ← MAL
  // ...
}

// ✅ BIEN — lógica en el service
function HonorarioCard({ cliente }) {
  const { mutate } = useMutation(honorariosService.aplicarAjuste)
  // ...
}
```

### No hardcodear valores de negocio
```typescript
// ❌ MAL
if (frecuenciaAjuste === 2) { ... }

// ✅ BIEN — valores desde parametros
const FRECUENCIAS = { BIMESTRAL: 2, TRIMESTRAL: 3 } as const
if (frecuenciaAjuste === FRECUENCIAS.BIMESTRAL) { ... }
```

### No duplicar validaciones
```typescript
// La validación Zod en el schema es la única fuente de verdad
// El frontend la usa via react-hook-form
// El service la usa al recibir datos
// Nunca validar manualmente en ambos lugares
```

---

## 9. Variables de entorno y configuración

```typescript
// lib/constants/index.ts
export const APP_CONFIG = {
  name: 'Estudio Capomasi',
  version: '1.0.0',
} as const

// Helpers tipados para env vars
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
} as const
```

---

## 10. Cuándo escalar más allá de Supabase

El backend en Supabase (PostgreSQL + Auth + Storage) es suficiente para todo el MVP y Fase 2. Agregar un backend adicional (Node.js / NestJS) solo tiene sentido cuando:

| Trigger | Solución |
|---------|----------|
| Integración AFIP (OAuth + certificados digitales) | API Route Next.js o microservicio Node |
| Jobs recurrentes (alertas de vencimientos automáticas) | Supabase Edge Functions o cron externo |
| Procesamiento de archivos pesado (PDFs, exports masivos) | Supabase Edge Functions |
| Lógica de negocio muy compleja con múltiples pasos transaccionales | Stored procedures en PostgreSQL |
| Webhooks entrantes de terceros | API Routes de Next.js |

**La regla:** si la lógica puede ejecutarse en el cliente o en un service de Next.js, no crear infraestructura adicional.

---

## 11. Branding y diseño

| Variable | Valor |
|----------|-------|
| Primary | `#3B82F6` |
| Secondary | `#64748B` |
| Background | `#F8FAFC` |
| Surface | `#FFFFFF` |
| Text primary | `#0F172A` |
| Text secondary | `#475569` |
| Success | `#22C55E` |
| Warning | `#EAB308` |
| Danger | `#EF4444` |
| Font | Inter (fallback: system-ui) |

**Configuración en `app/globals.css` (Tailwind v4 — NO existe `tailwind.config.js`):**
```css
@import "tailwindcss";

@theme {
  --color-primary:    #3B82F6;
  --color-secondary:  #64748B;
  --color-background: #F8FAFC;
  --color-surface:    #FFFFFF;
  --color-danger:     #EF4444;
  --color-success:    #22C55E;
  --color-warning:    #EAB308;
  --font-family-sans: 'Inter', system-ui, sans-serif;
}
```

**Principios:** nunca hardcodear colores en componentes. Siempre usar las variables del config.

---

## 12. Checklist pre-desarrollo por módulo

Antes de empezar a codear cada módulo:

- [ ] ¿Están definidas las tablas y relaciones en DATABASE.md?
- [ ] ¿Está configurado el RLS para este módulo?
- [ ] ¿Están definidos los permisos por rol para este módulo?
- [ ] ¿Están los tipos TypeScript definidos en `/types/index.ts`?
- [ ] ¿Están los schemas Zod definidos?
- [ ] ¿Están los casos de test planeados?
- [ ] ¿La lógica de negocio está en el service, no en el componente?
