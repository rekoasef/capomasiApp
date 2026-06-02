# Sistema de Gestión Integral — Estudio Contable Capomasi
## Documentación de Proyecto — v1.0

---

## 1. Descripción General

Sistema web tipo CRM/ERP liviano para un estudio contable. Reemplaza un Excel operativo por una plataforma centralizada, multi-usuario, con control de acceso por roles.

**Cliente:** Paola Capomasi — Estudio Contable, Armstrong, Santa Fe  
**Desarrollador:** Renzo Asef — radevelopment02@gmail.com  
**Inicio estimado:** Abril 2026  
**Entrega MVP:** Mayo 2026 (≈ 1 mes de desarrollo)

---

## 2. Objetivo del MVP

- Centralizar toda la operatoria del estudio en una sola plataforma web
- Accesible desde cualquier dispositivo (computadora, tablet, celular)
- Control de acceso por roles (Administrador / Empleada)
- Sin lógica compleja en esta etapa — replicar y mejorar la lógica del Excel
- Preparado para escalar: AFIP, automatizaciones, reportes avanzados

**Lo que NO entra en el MVP:**
- Integración con AFIP / facturación electrónica (continúa con SOS)
- Automatizaciones de vencimientos por email o WhatsApp
- App mobile nativa
- Modo oscuro (preparado pero no implementado)

---

## 3. Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend / App | Next.js | **15.x** (App Router) |
| Runtime UI | React | **19.x** |
| Lenguaje | TypeScript | 5.x |
| Estilos | Tailwind CSS | **4.x** (config via CSS `@theme`) |
| Backend / DB | Supabase | Cloud |
| Base de datos | PostgreSQL | 15 (via Supabase) |
| Auth | Supabase Auth | — |
| Storage | Supabase Storage | — |
| Deploy Frontend | Vercel | — |
| Deploy Backend | Supabase Cloud | — |

---

## 4. Librerías Recomendadas

### 4.1 Producción

| Librería | Propósito | Por qué |
|---------|-----------|---------|
| `@supabase/supabase-js` | Cliente Supabase | Oficial, tipado completo |
| `@supabase/ssr` | Auth con SSR/SSG en Next.js 15 | Reemplaza el deprecado `auth-helpers-nextjs`; expone `createBrowserClient` y `createServerClient` con cookies async |
| `@tanstack/react-query` | Data fetching + caché | Evita re-fetches, manejo de estados async |
| `react-hook-form` | Formularios | Performante, integra con Zod |
| `zod` | Validación de schemas | Tipado en runtime + buildtime |
| `date-fns` | Manipulación de fechas | Liviana, modular, sin side effects |
| `lucide-react` | Iconos | Consistente con shadcn/ui |
| `@radix-ui/react-*` | Componentes accesibles base | Headless, accesible, personalizable |
| `shadcn/ui` | Sistema de componentes | Construido sobre Radix, soporta Tailwind v4 nativamente |
| `recharts` | Gráficos y dashboard | Simple, declarativo, responsive |
| `sonner` | Notificaciones toast | Minimalista, sin config |
| `nuqs` | Estado en URL | Filtros persistentes por URL |
| `@hookform/resolvers` | Resolver Zod ↔ RHF | Conecta Zod con react-hook-form |
| `clsx` + `tailwind-merge` | Clases CSS condicionales | Evita conflictos de Tailwind |

### 4.2 Desarrollo y Testing

| Librería | Propósito |
|---------|-----------|
| `jest` | Test runner |
| `@testing-library/react` | Testing de componentes |
| `@testing-library/jest-dom` | Matchers DOM |
| `@testing-library/user-event` | Simular interacciones |
| `msw` (Mock Service Worker) | Mockear llamadas a Supabase en tests |
| `playwright` | Tests E2E (fase 2 en adelante) |
| `eslint` + `@typescript-eslint` | Linting |
| `prettier` | Formateo |
| `husky` + `lint-staged` | Hooks de git (lint antes de commit) |

### 4.3 Notas de instalación importantes

```bash
# shadcn/ui — inicializar en el proyecto (nuevo CLI, soporta Tailwind v4)
npx shadcn@latest init

# react-query — envolver app en QueryClientProvider
# msw — requiere service worker en /public/mockServiceWorker.js
npx msw init public/

# IMPORTANTE — @supabase/ssr reemplaza al deprecado auth-helpers-nextjs
# No instalar @supabase/auth-helpers-nextjs — usar @supabase/ssr
npm install @supabase/supabase-js @supabase/ssr
```

---

## 5. Módulos del Sistema

| # | Módulo | Fase | Estado |
|---|--------|------|--------|
| 1 | Auth + Usuarios + Roles | 1.2 | ✅ |
| 2 | Gestión de Clientes | 1.3 | ✅ |
| 3 | Honorarios Mensuales | 1.4 | ✅ |
| 4 | Facturación + Cobranzas + Cuenta Corriente | 1.5 | ✅ |
| 5 | Trabajos Anuales | 1.6 | ✅ |
| 6 | Liquidación de Personal | 2.1 | ✅ |
| 7 | Control de Fondos y Cheques | 2.2 | ✅ |
| 8 | Proveedores y Gastos | 2.3 | ✅ |
| 9 | Vencimientos | 2.4 | ✅ |
| 10 | Dashboard y Estadísticas | 3.1 | 🔄 pendiente |
| 11 | Reportes y Exportaciones | 3.2 | 🔄 pendiente |

**Última actualización:** Abril 2026 — Fase 1 completa, Fase 2 completa.

---

## 6. Roles y Permisos

### Roles definidos

| Rol | Descripción |
|-----|-------------|
| `admin` | Paola — acceso total, incluyendo sueldos, claves de clientes y gastos personales |
| `empleada` | Victoria, Luciana, Paola Aresu — acceso restringido según módulo |

### Matriz de permisos (MVP)

| Módulo | Admin | Empleada |
|--------|-------|----------|
| Clientes — ver | ✅ | ✅ |
| Clientes — editar/crear | ✅ | ❌ |
| Claves fiscales de clientes | ✅ | ❌ |
| Honorarios mensuales — ver | ✅ | ✅ |
| Honorarios mensuales — editar | ✅ | ❌ |
| Cuenta corriente — ver | ✅ | ✅ |
| Cobranzas — registrar pago | ✅ | ✅ |
| Trabajos anuales — ver/cargar | ✅ | ✅ |
| Liquidación personal | ✅ | ❌ |
| Fondos y cheques | ✅ | ❌ |
| Proveedores — ver | ✅ | ✅ |
| Proveedores — editar | ✅ | ❌ |
| Vencimientos — ver/crear | ✅ | ✅ |
| Vencimientos personales (Paola) | ✅ | ❌ |
| Dashboard | ✅ | ✅ (vista reducida) |
| Usuarios y permisos | ✅ | ❌ |

> **Nota:** los permisos exactos del perfil Empleada se ajustarán en reunión con la clienta al inicio de cada fase. Esta matriz es la base mínima de partida.

---

## 7. Fases de Desarrollo

### FASE 1 — Core (MVP principal)
**Duración estimada:** 3-4 semanas  
**Objetivo:** Sistema funcional mínimo que reemplaza el Excel

#### Subfase 1.1 — Setup y fundaciones ✅
- [x] Inicializar proyecto Next.js **15.x** + React 19 + TypeScript + Tailwind **4.x**
- [x] Configurar Supabase (proyecto, keys, variables de entorno)
- [x] Estructura de carpetas según arquitectura modular
- [x] Configurar ESLint, Prettier, Husky
- [x] Layout base: sidebar, header, sistema de navegación
- [x] Sistema de temas/branding (colores, tipografía)
- [x] Configurar shadcn/ui
- [x] Setup Jest + Testing Library
- [x] Variables de entorno: `.env.local`, `.env.example`

#### Subfase 1.2 — Autenticación y usuarios ✅
- [x] Login con Supabase Auth (email + password)
- [x] Protección de rutas (middleware Next.js)
- [x] Tabla `usuarios` con campo `rol`
- [x] RLS habilitado en todas las tablas desde el inicio
- [x] Contexto de usuario global (useAuth hook)
- [x] Página de perfil básica
- [x] Gestión de sesión (logout, refresh token)

**Testing 1.2:**
- [x] Unit test: hook `useAuth` con MSW mockeando Supabase Auth
- [x] Manual: login con cada rol, verificar redirecciones

#### Subfase 1.3 — Módulo Clientes ✅
- [x] Tabla `clientes` con todos los campos (CUIT, domicilio, teléfono, mail)
- [x] Tabla `claves_clientes` separada (solo admin)
- [x] CRUD completo de clientes
- [x] Búsqueda por nombre, CUIT, localidad
- [x] Notas internas por cliente
- [x] Soft delete (`deleted_at`)
- [x] RLS: empleadas ven clientes pero no claves fiscales

**Testing 1.3:**
- [x] Unit test: service `clientesService` (getAll, getById, create, update, softDelete)
- [x] Unit test: validaciones Zod del schema de cliente
- [x] Manual: crear cliente, editar, buscar, ocultar claves a empleada

#### Subfase 1.4 — Honorarios Mensuales ✅
- [x] Tabla `honorarios_mensuales` con historial (no sobrescribir)
- [x] Configurar monto base por cliente
- [x] Aplicar % de inflación → generar nueva vigencia
- [x] Vista "clientes con ajuste pendiente"
- [x] Historial de honorarios por cliente
- [x] Tabla `parametros` para tipos de ajuste y otros valores configurables

**Testing 1.4:**
- [x] Unit test: `calcularNuevoHonorario(montoActual, porcentaje)` → resultado exacto
- [x] Manual: aplicar ajuste a un cliente, verificar historial

#### Subfase 1.5 — Facturación, Cobranzas y Cuenta Corriente ✅
- [x] Tabla `liquidaciones` (factura/presupuesto por cliente)
- [x] Tabla `pagos` (pagos parciales o totales)
- [x] Tabla `cheques` (con lifecycle: recibido → depositado/endosado)
- [x] Registrar distintos tipos de pago: transferencia, efectivo, cheque, USD
- [x] Vista "cuenta corriente" calculada dinámicamente (`v_cuenta_corriente`)
- [x] Saldo por cliente en tiempo real
- [x] Listado de clientes con saldo deudor
- [x] Soporte para `SALDO INICIAL` al migrar del Excel

**Testing 1.5:**
- [x] Unit test: service `liquidacionesService`, `pagosService`, `cuentaCorrienteService`
- [x] Manual: registrar una liquidación y varios pagos parciales, verificar saldo

#### Subfase 1.6 — Trabajos Anuales ✅
- [x] Tabla `honorarios_anuales` por tipo de trabajo (balance, ganancias, ISIB, bienes personales, etc.)
- [x] Estados: PENDIENTE → EN_PROCESO → FINALIZADO → COBRADO
- [x] Historial por cliente y por año
- [x] Tipos de trabajo configurables via `parametros`

**Testing 1.6:**
- [x] Unit test: service `trabajosAnualesService`
- [x] Manual: cargar trabajos de un cliente, cambiar estados, filtrar por año

---

### FASE 2 — Operativo ✅
**Completada:** Abril 2026

#### Subfase 2.1 — Liquidación de Personal ✅
- [x] Tabla `empleadas`
- [x] Tabla `liquidaciones_empleadas` por concepto y periodo
- [x] Conceptos: fijo, premio, aguinaldo, vacaciones, saldo técnico IVA, estados contables, ganancias y bienes personales
- [x] Descuentos: IIBB, monotributo
- [x] Tabla `pagos_empleadas` (transferencias, efectivo, cheques)
- [x] Solo visible para rol `admin`
- [x] Vista detalle por empleada con resumen del periodo

**Testing 2.1:**
- [x] Unit test: service `empleadasService` (12 tests)

#### Subfase 2.2 — Control de Fondos y Cheques ✅
- [x] Tabla `fondos_movimientos` (ingresos y egresos)
- [x] Vista `v_saldo_fondos` para saldo en tiempo real (banco + efectivo + USD)
- [x] Gestión de cheques: EN_CARTERA → DEPOSITADO / ENDOSADO / RECHAZADO / ANULADO
- [x] Saldo de caja en tiempo real
- [x] Integración automática: pago de cliente → movimiento de fondos (trigger `fn_pago_a_fondos`, SECURITY DEFINER)

**Testing 2.2:**
- [x] Unit test: service `fondosService` + `chequesService` (10 tests)

#### Subfase 2.3 — Proveedores y Gastos ✅
- [x] Tabla `proveedores`
- [x] Tabla `compras_proveedores` (estados: PENDIENTE / PARCIALMENTE_PAGADA / PAGADA / ANULADA)
- [x] Tabla `pagos_proveedores` via RPC `fn_registrar_pago_proveedor` (actualiza estado automáticamente)
- [x] Vista de compras con filtro por estado

**Testing 2.3:**
- [x] Unit test: service `proveedoresService` (11 tests)

#### Subfase 2.4 — Vencimientos ✅
- [x] Tabla `vencimientos` con `ambito` (CLIENTE / ESTUDIO / PERSONAL)
- [x] Tipos de vencimiento: AFIP, IIBB Provincial, IIBB Municipal, Ganancias, Bienes Personales, Otro
- [x] Alertas visuales por urgencia (vencido / hoy / próximos 7 días)
- [x] Filtros por ámbito y por estado (completado/pendiente)
- [x] Vencimientos personales de Paola solo visibles para admin (RLS)
- [x] Acciones: completar, reabrir, eliminar

**Testing 2.4:**
- [x] Unit test: service `vencimientosService` (11 tests)

---

### FASE 3 — BI y Reportes
**Estado:** pendiente

#### Subfase 3.1 — Dashboard
- [ ] Resumen: ingresos del mes, clientes con deuda, vencimientos próximos
- [ ] Gráfico de ingresos por mes
- [ ] Estado general de cobranzas
- [ ] KPIs principales por rol (vista reducida para empleadas)

#### Subfase 3.2 — Reportes
- [ ] Ingresos por mes/año
- [ ] Ingresos por tipo de trabajo
- [ ] Ingresos por empleada (generado por)
- [ ] Comparativo entre períodos
- [ ] Exportación a PDF/Excel (futuro)

---

## 8. Estrategia de Testing

### Principio general
> Cada subfase se entrega con sus tests correspondientes. No se avanza a la siguiente subfase con tests en rojo.

### Tipos de test

| Tipo | Herramienta | Qué cubre |
|------|------------|-----------|
| Unit | Jest + Testing Library | Services, cálculos, validaciones Zod, hooks |
| Integration | Jest + MSW | Service + Supabase mock |
| Manual / UAT | Checklist con cliente | Flujos completos, casos borde, UX |
| E2E | Playwright (Fase 2+) | Flujos críticos end-to-end |

### Convención de archivos

```
modules/
  clientes/
    services/
      clientesService.ts
      clientesService.test.ts    ← unit test del service
    schemas/
      clienteSchema.ts
      clienteSchema.test.ts      ← unit test de validaciones
    hooks/
      useClientes.ts
      useClientes.test.ts
```

### Casos de test prioritarios por módulo

| Módulo | Tests críticos |
|--------|---------------|
| Auth | Login correcto, login fallido, redirección por rol |
| Clientes | CRUD, búsqueda, soft delete, acceso a claves por rol |
| Honorarios | Cálculo de ajuste, detección de ajuste pendiente |
| Cuenta corriente | Saldo con múltiples pagos parciales, saldo negativo (crédito) |
| Pagos | Pago con cheque, pago en USD, pago parcial |
| Vencimientos | Filtro por fecha, por empleada, por tipo |

---

## 9. Convenciones de Código

### Naming
- Archivos y carpetas: `kebab-case`
- Componentes React: `PascalCase`
- Hooks: `useCamelCase`
- Services: `camelCase` (ej: `clientesService`)
- Types/Interfaces: `PascalCase` con prefijo `T` o `I` (ej: `TCliente`)
- Constantes: `UPPER_SNAKE_CASE`

### Estructura de un módulo

```
modules/clientes/
  components/       ← UI (ClienteCard, ClienteForm, ClienteTable)
  services/         ← lógica de negocio + llamadas a Supabase
  hooks/            ← React hooks (useClientes, useClienteById)
  schemas/          ← Zod schemas
  types/            ← TypeScript types
  utils/            ← helpers locales del módulo
  tests/            ← tests adicionales de integración
```

### Patrón de resultado en services

```typescript
type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: string }

// Uso:
const result = await clientesService.create(data)
if (!result.ok) {
  toast.error(result.error)
  return
}
// result.data está tipado
```

### Reglas obligatorias
- No lógica de negocio en componentes React
- No hardcodear valores que puedan cambiar (usar `parametros` o constantes)
- No usar `any` en TypeScript
- Todo campo sensible (claves fiscales, sueldos) validado por RLS en DB
- Cada service exporta funciones puras y testeables

---

## 10. Variables de Entorno

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Solo en API routes / server-side (nunca exponer al cliente)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## 11. Migración desde el Excel

### Datos a migrar
| Hoja Excel | Destino DB | Complejidad |
|-----------|-----------|-------------|
| BASE DE CLIENTES | `clientes` | Baja |
| HONORARIO MENSUAL | `honorarios_mensuales` | Media (frecuencias de ajuste) |
| HONORARIOS ANUALES | `honorarios_anuales` | Media |
| FC y COBRANZAS | `liquidaciones` + `pagos` | Alta (fórmulas rotas, múltiples pagos) |
| MOV DE FONDOS | `fondos_movimientos` | Media |
| COMPRAS PROV | `compras_proveedores` | Media |
| BASE DE PROV | `proveedores` | Baja |
| VICTORIA BOZ / LUCIANA FARAONI | `empleadas` + `liquidaciones_empleadas` | Media |
| PARAMETROS | `parametros` | Baja (carga manual) |

### Consideraciones críticas
1. **Fórmulas rotas en FC y COBRANZAS:** el 80% de las columnas de cobro tienen `#ERROR!`. Requiere reconstrucción manual o con script de limpieza.
2. **SALDO INICIAL:** hay filas tipo `SALDO INICIAL` que establecen el punto de partida de la cuenta corriente. Deben migrarse como liquidaciones de tipo `saldo_inicial`.
3. **Los Piuquenes S.A.:** honorario expresado en `qq` (quintales). Requiere campo `detalle_especial` en `liquidaciones`.
4. **CUIT como notación científica:** el Excel exporta CUITs en notación científica (ej: `2.7227257526E10`). Requiere conversión al importar.

---

## 12. Roadmap Futuro (Post-MVP)

| Feature | Fase estimada |
|---------|--------------|
| Integración AFIP (factura electrónica) | v2 |
| Alertas automáticas de vencimientos (email/WhatsApp) | v2 |
| Exportación a PDF/Excel | v2 |
| Historial completo de auditoría visible en UI | v2 |
| Sistema de puntos para empleadas | v3 |
| Módulo de comisiones | v3 |
| App mobile (PWA o React Native) | v3 |
| Multi-estudio (si Paola tiene socios) | v4 |

---

## 13. Contacto y Soporte

| | |
|--|--|
| Cliente | Paola Capomasi |
| Desarrollador | Renzo Asef — radevelopment02@gmail.com — 3471343991 |
| Repositorio | (pendiente) |
| Supabase project | (pendiente) |
| Vercel project | (pendiente) |
| Dominio | (a confirmar con cliente) |
