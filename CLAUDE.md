# CLAUDE.md — Sistema de Gestión Integral

## Estudio Contable Capomasi

Contexto operativo raíz para Claude Code. Este archivo se lee en cada sesión. Si necesitás más detalle, los documentos completos están en `/docs/`.

---

## 📌 1\. Proyecto

Sistema web tipo CRM/ERP liviano para un estudio contable. **Reemplaza un Excel operativo** por una plataforma web centralizada, multi-usuario, con control de acceso por roles.

- **Cliente:** Paola Capomasi — Estudio Contable, Armstrong, Santa Fe
- **Desarrollador:** Renzo Asef — [radevelopment02@gmail.com](mailto:radevelopment02@gmail.com)
- **Objetivo MVP:** reemplazar Excel, mantener la lógica existente, preparar arquitectura para escalar

### Documentación complementaria

- `docs/core/PROYECTO.md` — fases, subfases detalladas, checklists, migración del Excel
- `docs/core/DATABASE.md` — DDL completo, RLS, triggers, views
- `docs/core/ARQUITECTURA.md` — estructura, patrones con ejemplos extendidos
- `docs/core/BACKUPS.md` — estrategia de backups, script, procedimientos de restore
- `docs/referencia/GUIA_EXCEL.md` — transcripción hoja GUIA del Excel operativo
- `docs/funcional/` — specs y decisiones por módulo/feature

---

## 🧰 2\. Stack

| Capa       | Tecnología               | Versión               |
| :--------- | :----------------------- | :-------------------- |
| Frontend   | Next.js                  | **15.x** (App Router) |
| Runtime UI | React                    | **19.x**              |
| Lenguaje   | TypeScript               | 5.x                   |
| Estilos    | Tailwind CSS             | 4.x                   |
| Backend/DB | Supabase (PostgreSQL)    | Cloud free tier       |
| Auth       | Supabase Auth            | —                     |
| Deploy     | Vercel \+ Supabase Cloud | —                     |

**\- Usar Next.js 15.x (App Router)**  
**\- Usar React 19**  
**\- Usar Tailwind CSS v4 — config via CSS (`@theme`), NO `tailwind.config.js`**  
**\- No usar Tailwind v3 ni configuraciones antiguas**

---

## ⚡ 3\. Comandos del proyecto

\# Desarrollo

npm run dev \# servidor local en :3000 (Turbopack — default en Next.js 15)

npm run build \# build de producción

npm run start \# servir build local

\# Calidad de código

npm run lint \# ESLint

npm run format \# Prettier

npm run type-check \# tsc \--noEmit

\# Testing

npm run test \# todos los tests

npm run test:watch \# modo watch

npm run test:coverage \# cobertura

npm run test \-- clientes \# solo tests que matchean "clientes"

\# Supabase (requiere Supabase CLI instalada)

npx supabase gen types typescript \--project-id xxx \> src/lib/supabase/types.ts

---

## 🔧 4\. Setup inicial (primera vez)

\# 1\. Instalar dependencias

npm install

\# 2\. Copiar .env.example → .env.local y completar

cp .env.example .env.local

\# 3\. Ejecutar migraciones en Supabase (ver sección 14\)

\# 4\. Generar tipos TypeScript desde la DB

npm run supabase:types

\# 5\. Levantar dev

npm run dev

### Variables de entorno (`.env.local`)

NEXT\_PUBLIC\_SUPABASE\_URL=https://xxxx.supabase.co

NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY=eyJ...

\# Solo en server-side (API routes). Nunca en frontend.

SUPABASE\_SERVICE\_ROLE\_KEY=eyJ...

---

## 🗂️ 5\. Estado del proyecto

### Fase actual: **los 10 módulos de la propuesta están completos.** Próximo hito: migración de datos del Excel (no es una fase numerada, ver sección 19)

### Mapa de módulos

| \#  | Módulo                         | Fase | Subfase | Estado |
| :-- | :----------------------------- | :--- | :------ | :----- |
| 1   | Setup \+ fundaciones           | 1    | 1.1     | ✅     |
| 2   | Auth \+ Usuarios \+ Roles      | 1    | 1.2     | ✅     |
| 3   | Clientes                       | 1    | 1.3     | ✅     |
| 4   | Honorarios Mensuales           | 1    | 1.4     | ✅     |
| 5   | Facturación \+ Cobranzas \+ CC | 1    | 1.5     | ✅     |
| 6   | Liquidación Personal           | 2    | 2.1     | ✅     |
| 7   | Fondos y Cheques               | 2    | 2.2     | ✅     |
| 8   | Proveedores y Gastos           | 2    | 2.3     | ✅     |
| 9   | Vencimientos                   | 2    | 2.4     | ✅     |
| 10  | Dashboard                      | 3    | 3.1     | ✅     |
| 11  | Reportes                       | 3    | 3.2     | ✅     |

**Trabajos Anuales (`honorarios_anuales`) se eliminó el 2026-08-03** — quedó desconectado del flujo real de facturación/cobranza y confundía a la clienta. Ver `supabase/migrations/0058_eliminar_trabajos_anuales.sql`.

**Regla de fase:** no se pasa a la siguiente subfase hasta que la actual esté ✅ completa (tests \+ validación manual \+ aprobación de clienta).

**Detalle funcional actualizado de cada módulo:** `docs/funcional/ESTADO_MODULOS.md` (reemplaza el checklist estático de abajo, que quedó como referencia histórica de scope — no de estado).

**Los 10 módulos de la propuesta comercial (`docs/referencia/Propuesta Paola.docx.md`) están funcionalmente completos y verificados contra el código el 2026-08-06** — incluye los gaps que marcaba la auditoría vieja de julio (Reportes, cheques emitidos, CC de proveedores, aguinaldo/vacaciones/retenciones, guard de rutas, audit log), todos resueltos. `docs/referencia/ESTADO_VS_PROPUESTA.md` está desactualizado (auditoría del 2026-07-08); la referencia vigente es `docs/funcional/ESTADO_MODULOS.md`.

**Pendientes reales (no de código) antes de la entrega final:** personalizar el PDF de liquidación/recibo según modelo de Paola (cambio simple, se puede hacer ya en producción) y publicar en subdominio de prueba. El saldo inicial de cuenta corriente real quedó descartado — ver sección 19. Ver memoria de sesión "reunion_2026-08-04_revision_y_cierre" para el detalle completo.

---

## 📋 6\. Fases y subfases

### Fase 1 — Core (3-4 semanas)

#### Subfase 1.1 — Setup y fundaciones

- [ ] Next.js **15.x** \+ React 19 \+ TypeScript \+ Tailwind 4 inicializado
- [ ] Supabase proyecto creado, env vars configuradas
- [ ] Estructura de carpetas según sección 8
- [ ] ESLint \+ Prettier \+ Husky \+ lint-staged configurados
- [ ] Layout base: Sidebar \+ Header
- [ ] Sistema de branding (tailwind.config con colores — ver sección 10\)
- [ ] shadcn/ui inicializado
- [ ] Jest \+ Testing Library configurados
- [ ] React Query Provider envolviendo la app
- [ ] Sonner configurado para toasts
- [ ] Script de backup creado (ver `docs/BACKUPS.md`)

#### Subfase 1.2 — Auth \+ Usuarios \+ Roles

- [ ] Migración SQL: tabla `usuarios` \+ RLS \+ helpers `is_admin()` / `is_authenticated_user()`
- [ ] Login con Supabase Auth
- [ ] Middleware de protección de rutas
- [ ] Contexto `AuthProvider` \+ hook `useAuth()`
- [ ] Redirección por rol tras login
- [ ] Logout
- [ ] Página de perfil básica
- [ ] **Tests:** `useAuth` con MSW mockeando Supabase Auth

#### Subfase 1.3 — Clientes

- [ ] Migraciones SQL: `clientes`, `claves_clientes`, triggers audit
- [ ] RLS: empleadas leen clientes, solo admin edita y ve claves
- [ ] Types \+ Zod schema
- [ ] Service `clientesService` completo (getAll, getById, create, update, softDelete, search)
- [ ] Hook `useClientes` \+ `useClienteById`
- [ ] UI: tabla de clientes, búsqueda, formulario crear/editar, detalle
- [ ] Componente `ClavesCliente` (solo visible a admin)
- [ ] **Tests:** service completo, validaciones CUIT, acceso a claves por rol

#### Subfase 1.4 — Honorarios Mensuales

- [ ] Migración SQL: `honorarios_mensuales`
- [ ] Service `honorariosService` (`getActivoByCliente`, `aplicarAjuste`, `getHistorial`)
- [ ] Función pura `calcularNuevoHonorario(monto, porcentaje)` — **testeada**
- [ ] Vista: historial por cliente, clientes con ajuste pendiente
- [ ] Formulario de aplicar ajuste
- [ ] **Tests:** cálculo de ajuste (incluyendo redondeo), detección de ajuste pendiente

#### Subfase 1.5 — Facturación, Cobranzas y Cuenta Corriente

- [ ] Migraciones SQL: `liquidaciones`, `pagos`, `cheques`, view `v_cuenta_corriente`
- [ ] Service `liquidacionesService`, `pagosService`, `cuentaCorrienteService`
- [ ] Soporte `tipo_liquidacion = 'SALDO_INICIAL'` para migración del Excel
- [ ] UI: listado de liquidaciones, registrar pago (con soporte parcial), cuenta corriente por cliente
- [ ] Listado de clientes con saldo deudor
- [ ] Antigüedad de deuda
- [ ] **Tests:** cálculo de saldo con múltiples pagos parciales, liquidación en USD

#### Subfase 1.6 — Trabajos Anuales

- [ ] Migración SQL: `honorarios_anuales`
- [ ] Service \+ hooks \+ UI
- [ ] Estados: PENDIENTE → EN\_PROCESO → FINALIZADO → COBRADO
- [ ] **Tests:** service \+ transiciones de estado

### Fase 2 — Operativo (2-3 semanas)

- **2.1** Liquidación Personal (solo admin)
- **2.2** Fondos y Cheques (con lifecycle de cheques)
- **2.3** Proveedores y Gastos
- **2.4** Vencimientos (con `ambito` personal/estudio/cliente)

### Fase 3 — BI y Reportes (1-2 semanas)

- **3.1** Dashboard (ingresos, cobranzas, vencimientos próximos)
- **3.2** Reportes (comparativos, ingresos por empleada/tipo)

Detalle completo en `docs/PROYECTO.md`.

---

## 🧱 7\. Reglas de desarrollo (NO negociables)

1. **Cero lógica de negocio en componentes React.** Toda la lógica vive en `modules/[modulo]/services/`.
2. **RLS habilitado en todas las tablas desde el momento que se crean.** Sin excepciones.
3. **Nunca usar `any` en TypeScript.** Si no conocés el tipo, usá `unknown` y estrechá.
4. **Una regla de negocio, un lugar.** Si la regla vive en el service, no la repetís en la DB. Si vive en la DB (constraint/view), no la repetís en el service.
5. **`ServiceResult<T>` tipado** para TODOS los returns de services. Nunca `throw` en services — devolver `{ ok: false, error, code }`.
6. **Zod es la única fuente de verdad** para validación de formularios y payloads. No validar manualmente en componentes.
7. **No hardcodear** listas de valores (tipos de servicio, estados, cuentas bancarias). Viven en la tabla `parametros`.
8. **Cada subfase tiene tests** antes de pasar a la siguiente. No se pasa con tests en rojo.
9. **Colores y tipografía solo via Tailwind tokens.** Jamás `style={{ color: '#3B82F6' }}`.
10. **Commits en inglés, descriptivos, con prefijo** (ver sección 17).

---

## 📁 8\. Estructura de carpetas

src/

├── app/ \# Next.js App Router

│ ├── (auth)/login/page.tsx

│ ├── (dashboard)/

│ │ ├── layout.tsx \# Sidebar \+ Header \+ AuthGuard

│ │ ├── page.tsx \# Dashboard home

│ │ ├── clientes/

│ │ ├── honorarios/

│ │ ├── cobranzas/

│ │ ├── fondos/

│ │ ├── empleadas/

│ │ ├── proveedores/

│ │ ├── vencimientos/

│ │ └── configuracion/

│ ├── api/ \# API routes (server-side only)

│ └── layout.tsx \# Root layout (QueryClient, Toaster, AuthProvider)

│

├── modules/ \# Módulos de negocio

│ └── \[modulo\]/

│ ├── components/ \# UI específica del módulo

│ ├── services/ \# Lógica de negocio \+ llamadas DB

│ ├── hooks/ \# React Query hooks

│ ├── schemas/ \# Zod schemas

│ ├── types/ \# TypeScript types

│ └── \_\_tests\_\_/ \# Tests del módulo

│

├── lib/

│ ├── supabase/

│ │ ├── client.ts \# Browser client (singleton)

│ │ ├── server.ts \# Server-side client — función async (Next.js 15)

│ │ └── types.ts \# Generado por Supabase CLI

│ ├── auth/

│ │ ├── AuthProvider.tsx

│ │ └── useAuth.ts

│ └── constants/

│

├── shared/

│ ├── components/

│ │ ├── ui/ \# shadcn/ui components

│ │ ├── layout/ \# Sidebar, Header, PageHeader

│ │ ├── DataTable.tsx

│ │ ├── ConfirmDialog.tsx

│ │ └── FormField.tsx

│ ├── utils/

│ │ ├── formatters.ts \# formatMoney, formatDate, formatCuit

│ │ ├── validators.ts \# validarCuit, etc.

│ │ └── serviceResult.ts \# Tipo ServiceResult\<T\>

│ └── types/

│

├── middleware.ts \# Protección de rutas Next.js

└── scripts/

    └── backup-capomasi.sh        \# Script de backup (ver docs/BACKUPS.md)

---

## 🔑 9\. Patrones de código

### 9.1 ServiceResult (obligatorio)

// shared/utils/serviceResult.ts

export type ServiceResult\<T\> \=

| { ok: true; data: T }

| { ok: false; error: string; code: ServiceErrorCode }

export type ServiceErrorCode \=

| 'VALIDATION\_ERROR'

| 'NOT\_FOUND'

| 'UNAUTHORIZED'

| 'DB\_ERROR'

| 'CONFLICT'

| 'UNKNOWN'

### 9.2 Service típico

// modules/clientes/services/clientesService.ts

import { supabase } from '@/lib/supabase/client'

import { clienteSchema } from '../schemas/clienteSchema'

import type { ServiceResult } from '@/shared/utils/serviceResult'

import type { TCliente, TClienteForm } from '../types'

export const clientesService \= {

async getAll(): Promise\<ServiceResult\<TCliente\[\]\>\> {

    const { data, error } \= await supabase

      .from('clientes')

      .select('\*')

      .is('deleted\_at', null)

      .order('nombre')

    if (error) return { ok: false, error: error.message, code: 'DB\_ERROR' }

    return { ok: true, data: data ?? \[\] }

},

async create(form: TClienteForm): Promise\<ServiceResult\<TCliente\>\> {

    const parsed \= clienteSchema.safeParse(form)

    if (\!parsed.success) {

      return { ok: false, error: parsed.error.issues\[0\].message, code: 'VALIDATION\_ERROR' }

    }

    const { data, error } \= await supabase

      .from('clientes')

      .insert(parsed.data)

      .select()

      .single()

    if (error) {

      if (error.code \=== '23505') {

        return { ok: false, error: 'Ya existe un cliente con ese CUIT', code: 'CONFLICT' }

      }

      return { ok: false, error: error.message, code: 'DB\_ERROR' }

    }

    return { ok: true, data }

},

}

### 9.3 Hook con React Query

// modules/clientes/hooks/useClientes.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { clientesService } from '../services/clientesService'

import { toast } from 'sonner'

export function useClientes() {

return useQuery({

    queryKey: \['clientes'\],

    queryFn: async () \=\> {

      const result \= await clientesService.getAll()

      if (\!result.ok) throw new Error(result.error)

      return result.data

    },

})

}

export function useCrearCliente() {

const qc \= useQueryClient()

return useMutation({

    mutationFn: clientesService.create,

    onSuccess: (result) \=\> {

      if (\!result.ok) {

        toast.error(result.error)

        return

      }

      toast.success('Cliente creado')

      qc.invalidateQueries({ queryKey: \['clientes'\] })

    },

})

}

### 9.4 Formulario con RHF \+ Zod

// modules/clientes/components/ClienteForm.tsx

'use client'

import { useForm } from 'react-hook-form'

import { zodResolver } from '@hookform/resolvers/zod'

import { clienteSchema, type TClienteForm } from '../schemas/clienteSchema'

import { useCrearCliente } from '../hooks/useClientes'

export function ClienteForm() {

const { mutate, isPending } \= useCrearCliente()

const form \= useForm\<TClienteForm\>({

    resolver: zodResolver(clienteSchema),

    defaultValues: { nombre: '', cuit: '' },

})

return (

    \<form onSubmit={form.handleSubmit((data) \=\> mutate(data))}\>

      {/\* inputs \*/}

      \<button type="submit" disabled={isPending}\>

        {isPending ? 'Guardando...' : 'Guardar'}

      \</button\>

    \</form\>

)

}

### 9.5 Zod schema (una sola fuente de verdad)

// modules/clientes/schemas/clienteSchema.ts

import { z } from 'zod'

export const clienteSchema \= z.object({

nombre: z.string().min(2, 'Nombre requerido'),

cuit: z.string().regex(/^\\d{11}$/, 'CUIT inválido (11 dígitos)'),

domicilio: z.string().optional(),

telefono: z.string().optional(),

email: z.string().email('Email inválido').optional().or(z.literal('')),

localidad: z.string().optional(),

notas: z.string().optional(),

})

export type TClienteForm \= z.infer\<typeof clienteSchema\>

### 9.6 Componente que consume data

'use client'

import { useClientes } from '../hooks/useClientes'

export function ClientesTable() {

const { data, isLoading, error } \= useClientes()

if (isLoading) return \<Skeleton /\>

if (error) return \<ErrorState message={error.message} /\>

if (\!data?.length) return \<EmptyState /\>

return \<DataTable columns={...} data={data} /\>

}

---

## 🎨 10\. Branding y diseño

### globals.css (Tailwind v4 — config vía CSS, NO `tailwind.config.js`)

En Tailwind v4 **no existe** `tailwind.config.js`. Los tokens se definen con `@theme` en el CSS:

@import "tailwindcss";

@theme {

\-\-color-primary: \#3B82F6;

\-\-color-secondary: \#64748B;

\-\-color-background: \#F8FAFC;

\-\-color-surface: \#FFFFFF;

\-\-color-success: \#22C55E;

\-\-color-warning: \#EAB308;

\-\-color-danger: \#EF4444;

\-\-color-muted: \#94A3B8;

\-\-font-family-sans: 'Inter', system-ui, sans-serif;

}

**Reglas:**

- Jamás `style={{ color: '...' }}`
- Jamás colores hardcoded en componentes
- Siempre `className="text-primary bg-surface"`
- shadcn/ui: inicializar con `npx shadcn@latest init` — soporta Tailwind v4 nativamente
- Modo oscuro: NO implementar en MVP, pero diseñar sin asumir `bg-white` fijo

---

## 🗄️ 11\. Base de datos — tablas principales

| Tabla                     | Descripción                      | RLS crítica                                       |
| :------------------------ | :------------------------------- | :------------------------------------------------ |
| `usuarios`                | Perfil \+ rol. FK → `auth.users` | Todos autenticados leen                           |
| `clientes`                | Base de clientes                 | Todos leen / admin edita                          |
| `claves_clientes`         | Claves AFIP/ANSES                | Todos autenticados leen/editan (desde 2026-08-14) |
| `parametros`              | Listas configurables             | Todos leen / admin edita                          |
| `honorarios_mensuales`    | Historial de honorarios          | Todos leen / admin edita                          |
| `honorarios_anuales`      | Trabajos anuales                 | Todos leen/editan                                 |
| `liquidaciones`           | Servicios devengados             | Todos leen/crean / admin edita                    |
| `pagos`                   | Pagos recibidos                  | Todos leen/crean                                  |
| `cheques`                 | Cheques (con lifecycle)          | Todos leen / admin edita                          |
| `fondos_movimientos`      | Caja                             | **Solo admin**                                    |
| `empleadas`               | Personal                         | Todos leen / admin edita                          |
| `liquidaciones_empleadas` | Sueldos — componentes            | **Solo admin**                                    |
| `pagos_empleadas`         | Sueldos — pagos                  | **Solo admin**                                    |
| `proveedores`             | Proveedores                      | Todos leen / admin edita                          |
| `compras_proveedores`     | Gastos                           | Todos leen / admin edita                          |
| `pagos_proveedores`       | Pagos a proveedores              | **Solo admin**                                    |
| `vencimientos`            | Vencimientos (con `ambito`)      | Personal: solo admin                              |
| `audit_log`               | Auditoría automática             | **Solo admin** lee                                |

### Views

- `v_cuenta_corriente` — saldo por cliente (calculado, no almacenado)
- `v_saldo_fondos` — saldo de caja en tiempo real

**DDL completo y políticas RLS en `docs/DATABASE.md`.**

---

## 🔒 12\. Seguridad y permisos

### Matriz de permisos (MVP)

| Acción                                    | Admin |    Empleada    |
| :---------------------------------------- | :---: | :------------: |
| Login                                     |  ✅   |       ✅       |
| Ver clientes                              |  ✅   |       ✅       |
| Crear/editar clientes                     |  ✅   |       ❌       |
| Ver/editar claves fiscales                |  ✅   |       ✅       |
| Ver honorarios mensuales                  |  ✅   |       ✅       |
| Editar honorarios                         |  ✅   |       ❌       |
| Ver cuenta corriente                      |  ✅   |       ✅       |
| Registrar pago                            |  ✅   |       ✅       |
| Anular liquidación                        |  ✅   |       ❌       |
| Ver/cargar trabajos anuales               |  ✅   |       ✅       |
| Liquidación de sueldos                    |  ✅   |       ❌       |
| Ver fondos/cheques                        |  ✅   |       ❌       |
| Ver proveedores                           |  ✅   |       ✅       |
| Editar proveedores/pagar                  |  ✅   |       ❌       |
| Ver/crear vencimientos clientes y estudio |  ✅   |       ✅       |
| Vencimientos personales (Paola)           |  ✅   |       ❌       |
| Dashboard completo                        |  ✅   | Vista reducida |
| Administrar usuarios                      |  ✅   |       ❌       |
| Ver audit log                             |  ✅   |       ❌       |

### Principios de seguridad

- RLS habilitado en **todas** las tablas desde el momento de crearlas
- `SUPABASE_SERVICE_ROLE_KEY` **jamás** en el frontend
- `claves_clientes` hoy en texto plano, migrar a Supabase Vault en v2
- Auth via Supabase Auth, JWT refresh automático
- Sesión se invalida al cambiar de rol

---

## 💾 13\. Backups

Supabase free **no incluye backups automáticos descargables**. Se implementa backup manual automatizado.

**Estrategia resumida (detalle completo en `docs/BACKUPS.md`):**

- Script `scripts/backup-capomasi.sh` corre diariamente vía cron (03:00 AM)
- Formato: `backup-YYYY-MM-DD-HHMMSS.sql.gz`
- Almacenamiento 3-2-1: local \+ Google Drive \+ pendrive
- Retención: últimos 30 días diarios, último año mensual
- Test de restore mensual a DB de staging
- Alerta por email si falla

**Riesgos residuales aceptados por la clienta:**

- Hasta 24 hs de pérdida entre backups
- Sin PITR
- Sin SLA de uptime

---

## 📦 14\. Migraciones SQL

### Organización

supabase/

└── migrations/

    ├── 0001\_setup\_extensions.sql       \# uuid-ossp, etc.

    ├── 0002\_helpers.sql                \# is\_admin(), is\_authenticated\_user()

    ├── 0003\_usuarios.sql               \# tabla usuarios \+ RLS

    ├── 0004\_audit.sql                  \# audit\_log \+ trigger genérico

    ├── 0005\_parametros.sql             \# tabla parametros \+ seed data

    ├── 0006\_clientes.sql               \# clientes \+ claves\_clientes

    ├── 0007\_honorarios.sql             \# honorarios\_mensuales \+ anuales

    ├── 0008\_cobranzas.sql               \# liquidaciones \+ pagos \+ cheques \+ view

    ├── 0009\_empleadas.sql               \# fase 2

    ├── 0010\_fondos.sql                  \# fase 2

    ├── 0011\_proveedores.sql             \# fase 2

    └── 0012\_vencimientos.sql            \# fase 2

### Reglas

- Cada cambio de DB es una nueva migración, nunca editar migraciones ya aplicadas
- Cada migración incluye: crear tabla \+ índices \+ RLS \+ triggers (todo junto)
- Las migraciones se aplican en orden a Supabase (via SQL Editor o CLI)
- Después de cada migración, regenerar tipos: `npm run supabase:types`

### Seed data obligatoria (migración 0005\)

La tabla `parametros` debe cargarse con valores iniciales. Ver listado completo en `docs/DATABASE.md` sección 3.4.

Categorías mínimas:

- `TIPO_SERVICIO` (11 valores)
- `GENERADO_POR` (7 valores)
- `TIPO_COMPROBANTE` (6 valores)
- `TIPO_PAGO` (4 valores)
- `ESTADO_TRABAJO` (4 valores)
- `ESTADO_LIQUIDACION` (4 valores)
- `TIPO_CHEQUE` (2 valores)
- `ESTADO_CHEQUE` (5 valores)
- `CUENTA_BANCARIA` (2 valores)
- `RUBRO_PROVEEDOR` (13 valores)
- `TIPO_MOV_FONDOS` (3 valores)
- `TIPO_VENCIMIENTO` (6 valores)

---

## 🧪 15\. Testing

### Estrategia por capa

| Capa                           | Qué se testea                  | Herramientas           |
| :----------------------------- | :----------------------------- | :--------------------- |
| **Funciones puras** (cálculos) | Inputs → outputs exactos       | Jest                   |
| **Services**                   | Lógica \+ mocks de Supabase    | Jest \+ MSW            |
| **Hooks**                      | Comportamiento con React Query | Testing Library \+ MSW |
| **Componentes**                | Renderizado \+ interacciones   | Testing Library        |
| **E2E** (fase 2+)              | Flujos críticos end-to-end     | Playwright             |

### Ejemplo de test de función pura

// modules/honorarios/services/calcularNuevoHonorario.test.ts

import { calcularNuevoHonorario } from './calcularNuevoHonorario'

describe('calcularNuevoHonorario', () \=\> {

it('aplica el porcentaje correctamente', () \=\> {

    expect(calcularNuevoHonorario(100000, 5)).toBe(105000)

    expect(calcularNuevoHonorario(82307.24, 5.968)).toBe(87219.34)

})

it('redondea a 2 decimales', () \=\> {

    expect(calcularNuevoHonorario(100000, 3.33)).toBe(103330)

})

it('maneja porcentaje cero', () \=\> {

    expect(calcularNuevoHonorario(50000, 0)).toBe(50000)

})

it('rechaza montos negativos', () \=\> {

    expect(() \=\> calcularNuevoHonorario(-100, 5)).toThrow()

})

})

### Ejemplo de test de service con MSW

// modules/clientes/services/clientesService.test.ts

import { clientesService } from './clientesService'

import { server } from '@/tests/msw-setup'

import { http, HttpResponse } from 'msw'

describe('clientesService.getAll', () \=\> {

it('devuelve lista de clientes', async () \=\> {

    const result \= await clientesService.getAll()

    expect(result.ok).toBe(true)

    if (result.ok) expect(Array.isArray(result.data)).toBe(true)

})

it('devuelve error si la DB falla', async () \=\> {

    server.use(

      http.get('\*/rest/v1/clientes\*', () \=\>

        HttpResponse.json({ message: 'DB down' }, { status: 500 })

      )

    )

    const result \= await clientesService.getAll()

    expect(result.ok).toBe(false)

    if (\!result.ok) expect(result.code).toBe('DB\_ERROR')

})

})

### Casos críticos que siempre se testean

- `calcularNuevoHonorario` — con redondeo y edge cases
- `calcularSaldoCliente` — sumatorias con pagos parciales
- Validación de CUIT (Zod)
- Cambios de estado de `honorarios_anuales`
- Conversión USD → ARS con tipo de cambio

### Definition of Done (DoD) por módulo

Un módulo está ✅ solo si:

- [ ] Todos los services tienen tests pasando
- [ ] Funciones puras críticas tienen tests con edge cases
- [ ] Validaciones Zod cubren los casos del schema
- [ ] RLS testeado manualmente con usuarios admin y empleada
- [ ] UI responsive (desktop \+ tablet \+ mobile)
- [ ] Loading states \+ empty states \+ error states implementados
- [ ] Cero `any` en el código
- [ ] Cero `console.log` olvidados
- [ ] Validado manualmente con la clienta

---

## ⚠️ 16\. Antipatrones (qué NO hacer)

### ❌ Lógica de negocio en componentes

// MAL

function CardCliente({ cliente }) {

const saldo \= cliente.liquidaciones

    .reduce((acc, l) \=\> acc \+ l.importe, 0\) \- cliente.pagos.reduce(...)

// ↑ esto va en un service, no en el componente

}

// BIEN

function CardCliente({ clienteId }) {

const { data: saldo } \= useSaldoCliente(clienteId)

}

### ❌ Throw en services

// MAL

async create(data) {

const { error } \= await supabase.from('clientes').insert(data)

if (error) throw new Error(error.message)

}

// BIEN

async create(data): Promise\<ServiceResult\<TCliente\>\> {

const { data: row, error } \= await supabase.from('clientes').insert(data).select().single()

if (error) return { ok: false, error: error.message, code: 'DB\_ERROR' }

return { ok: true, data: row }

}

### ❌ Validar manualmente en lugar de Zod

// MAL

if (\!form.cuit || form.cuit.length \!== 11\) { ... }

// BIEN — validación vive solo en el schema Zod

### ❌ Hardcodear listas de valores

// MAL

const TIPOS\_COMPROBANTE \= \['FC A', 'FC B', 'FC C', 'PRESUPUESTO'\]

// BIEN — viene de parametros

const { data: tipos } \= useParametros('TIPO\_COMPROBANTE')

### ❌ Colores hardcoded

// MAL

\<div style={{ color: '\#3B82F6' }}\>

// BIEN

\<div className="text-primary"\>

### ❌ any en TypeScript

// MAL

function process(data: any) { ... }

// BIEN — si no sabés el tipo, estrechá

function process(data: unknown) {

if (isCliente(data)) { ... }

}

### ❌ Llamar a Supabase desde componentes

// MAL

function ClientesList() {

useEffect(() \=\> {

    supabase.from('clientes').select('\*').then(...)

}, \[\])

}

// BIEN — siempre via service \+ hook

function ClientesList() {

const { data } \= useClientes()

}

---

## 📝 17\. Convenciones de Git

### Branches

- `main` — producción (deploy automático a Vercel)
- `develop` — integración (opcional en esta etapa)
- `feat/subfase-1.3-clientes` — feature branch por subfase
- `fix/clientes-cuit-validation` — bugfix
- `chore/update-deps` — tareas de mantenimiento

### Commits (en inglés, con prefijo)

feat(clientes): add soft delete to clientesService

fix(honorarios): correct rounding in calcularNuevoHonorario

test(cobranzas): add tests for partial payments

docs(database): update RLS policies for vencimientos

chore: update .env.example

refactor(auth): simplify useAuth hook

### Pull Request (incluso si trabajás solo)

- Descripción breve de qué hace
- Checklist de DoD cumplido
- Screenshot si es UI

---

## 🚀 18\. Cómo trabajar en una feature nueva

1. Revisar `docs/PROYECTO.md` → subfase correspondiente
2. Revisar `docs/DATABASE.md` → tablas involucradas
3. Crear migración SQL si se necesita tabla nueva (`supabase/migrations/00XX_*.sql`)
4. Aplicar migración y regenerar tipos: `npm run supabase:types`
5. Crear tipos en `modules/[modulo]/types/index.ts`
6. Crear schema Zod en `modules/[modulo]/schemas/`
7. Implementar service en `modules/[modulo]/services/`
8. Escribir **tests del service** (primero los casos importantes)
9. Crear hook en `modules/[modulo]/hooks/`
10. Crear componentes en `modules/[modulo]/components/`
11. Conectar en `app/(dashboard)/[ruta]/page.tsx`
12. Test manual con checklist de la subfase
13. Commit con prefijo adecuado
14. Marcar subfase como ✅ en la sección 5 de este documento

---

## ⚠️ 19\. Casos especiales y deuda técnica

| Caso                                       | Descripción                                                                                                                                                                                                                                                                                                                                                                                                                                        | Estado                              |
| :----------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------- |
| **Los Piuquenes S.A.**                     | Honorario en quintales (qq), no en pesos                                                                                                                                                                                                                                                                                                                                                                                                           | Usar campo `notas` en liquidaciones |
| **Facturación histórica del Excel**        | ~~Migrar como `liquidaciones` con `SALDO_INICIAL`~~ — descartado: Paola pidió que sea puramente informativo, sin tocar cuenta corriente ni facturación real. Se migró a tabla aparte `facturacion_historica` (solo columnas A-L de "FC y COBRANZAS", solo admin, sin FKs), con pestaña propia `/facturacion-historica` y filtros por cliente/servicio/generado por/año.                                                                            | ✅ Hecho 2026-08-05 (325 filas)     |
| **Saldo inicial de cuenta corriente real** | ~~Migración masiva de saldos reales para clientes con deuda pendiente hoy~~ — descartado: **todas** las cuentas corrientes arrancan en $0. La deuda histórica queda visible solo en la tabla informativa `facturacion_historica`. No falta funcionalidad: si Paola necesita reflejar la deuda real de un cliente puntual, ya puede cargarla ella misma como una liquidación manual en la cuenta corriente de ese cliente (flujo normal existente). | ✅ Confirmado 2026-08-06            |
| **CUITs en notación científica**           | Excel exporta `2.7227257526E10` → convertir a string 11 dígitos                                                                                                                                                                                                                                                                                                                                                                                    | Script de migración pendiente       |
| **Fórmulas rotas en FC y COBRANZAS**       | 80% de cobros con `#ERROR!` en Excel                                                                                                                                                                                                                                                                                                                                                                                                               | Reconstrucción con clienta          |
| **`claves_clientes` en texto plano**       | Migrar a Supabase Vault                                                                                                                                                                                                                                                                                                                                                                                                                            | Deuda v2                            |
| **Sin maintenance mensual**                | Clienta no contrató                                                                                                                                                                                                                                                                                                                                                                                                                                | Riesgo documentado y aceptado       |

---

## ⚡ 19b\. Next.js 15 — cambios que afectan este proyecto

### APIs asíncronas (breaking change vs v13/v14)

En Next.js 15, `cookies()`, `headers()`, `params` y `searchParams` son **Promises**. Siempre usar `await`:

// lib/supabase/server.ts

import { createServerClient } from '@supabase/ssr'

import { cookies } from 'next/headers'

export async function createSupabaseServerClient() {

const cookieStore \= await cookies() // \← await obligatorio

return createServerClient(

    process.env.NEXT\_PUBLIC\_SUPABASE\_URL\!,

    process.env.NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY\!,

    { cookies: { getAll() { return cookieStore.getAll() } } }

)

}

// app/(dashboard)/clientes/\[id\]/page.tsx — params ahora es Promise

export default async function Page({ params }: { params: Promise\<{ id: string }\> }) {

const { id } \= await params // \← await obligatorio

}

// Lo mismo para searchParams en pages:

export default async function Page({ searchParams }: { searchParams: Promise\<{ q?: string }\> }) {

const { q } \= await searchParams

}

### Fetch sin caché por defecto

En Next.js 15 el `fetch` **no cachea por defecto** (cambio respecto a v13). Para cachear:

fetch(url, { cache: 'force-cache' }) // cachea permanente

fetch(url, { next: { revalidate: 60 } }) // revalida cada 60s

fetch(url) // no cachea (nuevo default)

**Impacto en este proyecto: mínimo.** Todo el fetching va por Supabase client \+ React Query, no por `fetch` directo. Solo aplicar si se agregan API routes con fetch nativo.

### `use cache` (nueva directiva — opcional)

Next.js 15 introduce `'use cache'` como primitiva de caché más explícita. No usar en el MVP; documentado para referencia futura.

### React 19

- `use(promise)` — consume promesas y contextos directo en render
- Server Actions estables (formularios, mutations del servidor)
- **En este proyecto:** los Server Actions **no se usan**. Toda la lógica va por `service + React Query`. No cambiar este patrón salvo decisión explícita.

---

## 🔮 20\. Roadmap futuro (fuera de scope)

- Integración AFIP (facturación electrónica, certificados digitales)
- Alertas automáticas de vencimientos (email/WhatsApp via Edge Functions)
- Exportación PDF/Excel
- Sistema de puntos y comisiones para empleadas
- Dashboard avanzado con comparativos
- App mobile (PWA)
- Modo oscuro
- Multi-estudio

---

## 📞 21\. Contacto

- **Cliente:** Paola Capomasi
- **Desarrollador:** Renzo Asef — [radevelopment02@gmail.com](mailto:radevelopment02@gmail.com) — 3471343991
- **Repositorio:** (pendiente)
- **Supabase project:** (pendiente)
- **Vercel project:** (pendiente)

---

## 🎯 22\. Primer prompt para Claude Code

Cuando arranques la primera sesión con Claude Code, usá algo así:

Leé `CLAUDE.md` y `docs/PROYECTO.md`. Estamos en **Subfase 1.1 — Setup y fundaciones**. Inicializá el proyecto Next.js **15.x** con React 19, TypeScript y Tailwind v4 (config via `@theme` en CSS, sin `tailwind.config.js`), configurá la estructura de carpetas según la sección 8, y dejá listo el setup de ESLint, Prettier, Husky, Jest, React Query y shadcn/ui. Tené en cuenta que en Next.js 15 `cookies()`, `headers()`, `params` y `searchParams` son async — usá siempre `await`. No implementes features todavía — solo el scaffold.

Después de cada subfase completada, actualizá el estado en la **sección 5** de este archivo marcando ✅ y pasando a la siguiente.
