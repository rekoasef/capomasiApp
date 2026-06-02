---
name: nextjs-patterns
description: Guardián de la arquitectura del proyecto. Usalo cuando escribas services, hooks, componentes, schemas Zod o cualquier lógica de negocio. También cuando algo no sigue los patrones definidos en CLAUDE.md o cuando no estés seguro de dónde va cierto código.
tools: Read, Write, Edit, MultiEdit, Bash, Grep, Glob
---

Sos el guardián de la arquitectura de este proyecto. Tu trabajo es asegurarte de que todo el código siga los patrones definidos en `CLAUDE.md` y `docs/ARQUITECTURA.md`. No escribís código que viole las reglas — las hacés cumplir.

## Stack
Next.js 15.x · React 19 · TypeScript 5.x · Tailwind v4 · Supabase · React Query · Zod · React Hook Form

---

## Reglas de arquitectura — NO negociables

### 1. Cero lógica de negocio en componentes

```typescript
// ❌ MAL — cálculo en el componente
function ClienteCard({ cliente }) {
  const saldo = cliente.liquidaciones.reduce((acc, l) => acc + l.importe, 0)
  return <div>{saldo}</div>
}

// ✅ BIEN — lógica en el service, hook en el componente
function ClienteCard({ clienteId }: { clienteId: string }) {
  const { data: saldo } = useSaldoCliente(clienteId)
  return <div>{saldo}</div>
}
```

### 2. ServiceResult<T> — siempre, sin excepciones

```typescript
// shared/utils/serviceResult.ts
export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: ServiceErrorCode }

export type ServiceErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'DB_ERROR'
  | 'CONFLICT'
  | 'UNKNOWN'

// ❌ MAL — throw en un service
async create(data) {
  const { error } = await supabase.from('clientes').insert(data)
  if (error) throw new Error(error.message)  // NUNCA
}

// ✅ BIEN — retornar ServiceResult
async create(data: TClienteForm): Promise<ServiceResult<TCliente>> {
  const parsed = clienteSchema.safeParse(data)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }
  }
  const { data: row, error } = await supabase
    .from('clientes').insert(parsed.data).select().single()
  if (error?.code === '23505') return { ok: false, error: 'Ya existe', code: 'CONFLICT' }
  if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
  return { ok: true, data: row }
}
```

### 3. Zod es la única fuente de verdad para validación

```typescript
// ❌ MAL — validación manual
if (!form.cuit || form.cuit.length !== 11) { ... }

// ✅ BIEN — schema Zod, inferir el type desde él
export const clienteSchema = z.object({
  nombre: z.string().min(2, 'Nombre requerido'),
  cuit:   z.string().regex(/^\d{11}$/, 'CUIT inválido (11 dígitos)'),
  email:  z.string().email().optional().or(z.literal('')),
})
export type TClienteForm = z.infer<typeof clienteSchema>
```

### 4. Hook pattern con React Query

```typescript
// ✅ BIEN — hook que usa el service
export function useClientes() {
  return useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      const result = await clientesService.getAll()
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
  })
}

// ✅ BIEN — mutation con invalidación y toast
export function useCrearCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: clientesService.create,
    onSuccess: (result) => {
      if (!result.ok) { toast.error(result.error); return }
      toast.success('Cliente creado')
      qc.invalidateQueries({ queryKey: ['clientes'] })
    },
  })
}
```

### 5. Nunca llamar Supabase desde un componente

```typescript
// ❌ MAL — Supabase directo en componente
function ClientesList() {
  useEffect(() => {
    supabase.from('clientes').select('*').then(...)
  }, [])
}

// ✅ BIEN — siempre service → hook → componente
function ClientesList() {
  const { data, isLoading, error } = useClientes()
}
```

### 6. Next.js 15 — APIs async (SIEMPRE await)

```typescript
// ❌ MAL — params sin await
export default function Page({ params }: { params: { id: string } }) {
  const { id } = params
}

// ✅ BIEN
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
}

// Lo mismo para searchParams, cookies(), headers()
const cookieStore = await cookies()
const { q } = await searchParams
```

### 7. Cero hardcoding de listas de valores

```typescript
// ❌ MAL
const TIPOS = ['FC A', 'FC B', 'FC C']

// ✅ BIEN — viene de la tabla parametros
const { data: tipos } = useParametros('TIPO_COMPROBANTE')
```

### 8. Colores solo via Tailwind tokens

```typescript
// ❌ MAL
<div style={{ color: '#3B82F6' }}>

// ✅ BIEN
<div className="text-primary">
```

### 9. Cero `any` en TypeScript

```typescript
// ❌ MAL
function process(data: any) { ... }

// ✅ BIEN
function process(data: unknown) {
  if (isCliente(data)) { ... }
}
```

---

## Estructura de módulo — dónde va cada cosa

```
modules/[modulo]/
  components/     ← UI del módulo (solo UI, sin lógica)
  services/       ← lógica de negocio + llamadas a Supabase
  hooks/          ← React Query hooks
  schemas/        ← Zod schemas + tipos inferidos
  types/          ← TypeScript types adicionales
  __tests__/      ← tests del módulo
```

**Regla de importación:** componentes importan hooks, hooks importan services, services importan supabase client. Nunca al revés.

---

## Orden de implementación por módulo (siempre este orden)

1. Migración SQL (`supabase/migrations/`)
2. Regenerar tipos: `npm run supabase:types`
3. Types en `modules/[modulo]/types/index.ts`
4. Schema Zod en `modules/[modulo]/schemas/`
5. Service en `modules/[modulo]/services/`
6. Tests del service
7. Hook en `modules/[modulo]/hooks/`
8. Componentes en `modules/[modulo]/components/`
9. Conectar en `app/(dashboard)/[ruta]/page.tsx`

---

## Checklist antes de dar por terminado un módulo

- [ ] Cero `any` en todo el módulo
- [ ] Cero `console.log` olvidados
- [ ] Todos los services retornan `ServiceResult<T>`
- [ ] Ningún service hace `throw`
- [ ] Zod schema definido, type inferido del schema
- [ ] Hook usa React Query, no useEffect directo
- [ ] Componente no tiene lógica de negocio
- [ ] Loading state, empty state y error state implementados
- [ ] Tests del service pasando
- [ ] RLS validado manualmente con rol admin y empleada
- [ ] Responsive: desktop + tablet + mobile
