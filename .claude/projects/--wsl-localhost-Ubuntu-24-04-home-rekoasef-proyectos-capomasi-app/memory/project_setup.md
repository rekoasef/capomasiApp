---
name: Capomasi App — Estado del Proyecto
description: Estado del scaffold y subfases completadas
type: project
---

**Why:** Sistema CRM/ERP para el estudio contable de Paola Capomasi. MVP reemplaza un Excel operativo.

**How to apply:** Pasar a subfase 1.3 (Clientes) una vez aplicadas las migraciones SQL y validada la auth.

## Supabase

- **Project ID:** `ldvvtltmxkpuqhtznbfh`
- El MCP de Supabase conectado NO tiene acceso a este proyecto. Las migraciones se aplican manualmente desde el SQL Editor del dashboard.
- URL: https://supabase.com/dashboard/project/ldvvtltmxkpuqhtznbfh

## Subfase 1.1 — Setup (✅ completo)

- shadcn/ui en `src/shared/components/ui/` (components.json actualizado)
- Root layout con Inter font, QueryClient, AuthProvider, Toaster (Sonner)
- Husky configurado manualmente (Git Bash/WSL impide `npx husky init`)
- Brand tokens en globals.css: `success`, `warning`, `danger`, `surface`

## Subfase 1.2 — Auth + Usuarios + Roles (⏳ pendiente aplicar migraciones)

### Migraciones creadas (aplicar en orden en SQL Editor):
1. `supabase/migrations/0001_setup_extensions.sql`
2. `supabase/migrations/0002_helpers.sql` — requires tabla `usuarios` para funcionar (aplicar DESPUÉS de 0003)
3. `supabase/migrations/0003_usuarios.sql` — tabla + RLS + trigger fn_handle_new_user
4. `supabase/migrations/0004_audit.sql`

**ORDEN CORRECTO:** 0001 → 0003 → 0002 → 0004

### Código implementado:
- `src/modules/auth/` — types, schemas, services, hooks, components
- `src/lib/auth/AuthProvider.tsx` — expone `rol`, `profile`, `isLoading`
- `src/lib/auth/useAuth.ts` — expone `isAdmin`, `rol`, `signOut`
- `src/middleware.ts` — protección de rutas, redirect a /login si no autenticado
- `src/app/(auth)/login/page.tsx` — formulario funcional con validación Zod
- `src/app/(dashboard)/configuracion/page.tsx` — perfil básico con badge de rol
- Tests en `src/modules/auth/__tests__/authService.test.ts`
