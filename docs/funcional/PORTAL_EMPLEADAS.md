# Portal de Acceso para Empleadas

Spec funcional del sistema de cuentas de empleadas, vista restringida y flujo de carga/aprobación de trabajos.  
**Estado:** planificado, pendiente implementación.  
**Fecha:** 2026-06-05

---

## 1. Contexto — qué ya existe

| Elemento                                                       | Estado | Archivo                                                           |
| -------------------------------------------------------------- | ------ | ----------------------------------------------------------------- |
| Tabla `empleadas` con campo `usuario_id` (nullable FK)         | ✅     | DB                                                                |
| Tabla `trabajos_realizados` con `aprobado_por` y `aprobado_at` | ✅     | DB                                                                |
| RPC `fn_aprobar_trabajo_realizado`                             | ✅     | DB                                                                |
| `CargarTrabajoForm` — carga de trabajos (hoy solo admin)       | ✅     | `src/modules/empleadas/components/CargarTrabajoForm.tsx`          |
| `TrabajosRealizadosOverview` — vista general de trabajos       | ✅     | `src/modules/empleadas/components/TrabajosRealizadosOverview.tsx` |
| `TrabajosDelMesTable` — tabla de trabajos del mes              | ✅     | `src/modules/empleadas/components/TrabajosDelMesTable.tsx`        |
| `authService` — login/logout                                   | ✅     | `src/modules/auth/services/authService.ts`                        |
| Sidebar con filtro `adminOnly`                                 | ✅     | `src/shared/components/layout/Sidebar.tsx`                        |
| Roles: `'admin' \| 'empleada'` en tabla `usuarios`             | ✅     | `src/modules/auth/types/index.ts`                                 |

**Lo que falta:** crear la cuenta de acceso para la empleada, su vista propia y que el flujo de carga se auto-asigne a ella.

---

## 2. Objetivo del sistema

Paola crea una cuenta (email + contraseña) para cada empleada. La empleada ingresa al sistema, ve sus propios trabajos, carga nuevos trabajos vinculados a clientes, y esos trabajos quedan pendientes hasta que Paola los aprueba desde su vista de admin.

---

## 3. Flujo completo

```
Paola crea cuenta para empleada (email + contraseña)
              ↓
Empleada ingresa al sistema con esas credenciales
              ↓
Ve solo su panel: "Mis Trabajos" + Perfil
              ↓
Selecciona un cliente → carga un trabajo → queda PENDIENTE
              ↓
Paola ve el trabajo pendiente en /trabajos (badge contador)
              ↓
Paola aprueba el trabajo
              ↓
fn_aprobar_trabajo_realizado → genera puntos automáticamente (si aplica)
              ↓
Empleada ve el trabajo como APROBADO en su historial
```

---

## 4. Fases de implementación

### Fase A — Creación de cuentas para empleadas (admin)

**Objetivo:** Paola puede generar un usuario de acceso para una empleada existente.

#### A.1 — API Route para crear usuario

Crear `src/app/api/admin/crear-usuario-empleada/route.ts`.

- Usa `SUPABASE_SERVICE_ROLE_KEY` (nunca en frontend)
- Verifica que quien llama es admin (lee la sesión del cookie)
- Llama a `supabase.auth.admin.createUser({ email, password, email_confirm: true })`
- Inserta en tabla `usuarios`: `{ id: authUser.id, nombre: empleada.nombre, email, rol: 'empleada' }`
- Actualiza `empleadas.usuario_id = authUser.id`

```ts
// Payload esperado
{ empleada_id: string; email: string; password: string }

// Respuesta
{ ok: true } | { ok: false; error: string }
```

**Consideraciones:**

- Si la empleada ya tiene `usuario_id`, rechazar con error claro
- La contraseña la elige Paola y se la comunica a la empleada por fuera del sistema
- No enviar email de bienvenida automático (el estudio es pequeño, comunicación directa)

#### A.2 — UI en EmpleadaDetalle

En `src/modules/empleadas/components/EmpleadaDetalle.tsx`:

- Si `empleada.usuario_id === null`: mostrar botón "Crear acceso al sistema"
- Al hacer click: abre modal con campos email y contraseña
- Submit llama a la API Route
- Al confirmar: mostrar badge "Acceso activo" con email vinculado
- Si ya tiene `usuario_id`: mostrar badge verde "Acceso activo — email@dominio.com"

**Pendiente decidir con Paola:**

- ¿Puede Paola resetear la contraseña de una empleada desde el sistema? (Para MVP: no, se hace desde Supabase)

---

### Fase B — Redirección y vista de empleada

**Objetivo:** cuando una empleada hace login, llega a su propia vista, no al dashboard de admin.

#### B.1 — Redirección post-login por rol

En `src/middleware.ts` o en `AuthProvider` después de cargar el perfil:

```ts
if (rol === 'empleada') redirect('/mis-trabajos')
if (rol === 'admin') redirect('/')
```

#### B.2 — Nueva ruta: `/mis-trabajos`

Crear `src/app/(dashboard)/mis-trabajos/page.tsx`.

Vista para la empleada. Muestra:

- Sus trabajos del mes actual (filtrados por su `empleada_id`)
- Selector de mes/año para ver historial
- Indicador de estado por trabajo: PENDIENTE / APROBADO
- Totales del mes: trabajos aprobados, puntos acumulados (si tiene tipo_comision = PUNTAJE)
- Botón "Cargar trabajo" → abre `CargarTrabajoForm` adaptado (ver B.3)

**No muestra:** trabajos de otras empleadas.

#### B.3 — Sidebar filtrado por rol

El sidebar ya tiene `adminOnly`. Agregar la lógica para empleadas.

Items que ve la empleada:

| Item                                    | Visible        |
| --------------------------------------- | -------------- |
| Mis Trabajos (`/mis-trabajos`)          | ✅ siempre     |
| Perfil (`/configuracion` o ruta nueva)  | ✅ siempre     |
| Dashboard (`/`)                         | ❌             |
| Clientes                                | ❌ (por ahora) |
| Honorarios                              | ❌             |
| Cobranzas                               | ❌             |
| Trabajos (`/trabajos` — vista de admin) | ❌             |
| Empleadas                               | ❌             |
| Fondos                                  | ❌             |
| Proveedores                             | ❌             |
| Vencimientos                            | ❌             |
| Configuración                           | ❌             |

> **Nota:** Esta restricción es solo de UI. La RLS en la DB es la verdadera barrera de seguridad.

**Cambio en Sidebar:** agregar propiedad `empleadaVisible: boolean` a los nav items. Items sin esa propiedad no se muestran si `rol === 'empleada'`.

#### B.4 — Obtener el empleada_id propio

Cuando la empleada logea, su `usuario_id` (= `auth.users.id`) está en `usuarios.id`. La tabla `empleadas` tiene `usuario_id` apuntando a ese mismo ID.

Agregar al `useAuth` / `AuthProvider` la resolución de `empleada_id`:

```ts
// AuthProvider: al cargar perfil
if (profile.rol === 'empleada') {
  const { data } = await supabase
    .from('empleadas')
    .select('id')
    .eq('usuario_id', profile.id)
    .single()
  setEmpleadaId(data?.id ?? null)
}
```

Exponer `empleadaId` desde `useAuth()` para usarlo en hooks y servicios.

---

### Fase C — Carga de trabajos por la empleada

**Objetivo:** la empleada carga un trabajo y se auto-asigna. No puede elegir otra empleada.

#### C.1 — Adaptar CargarTrabajoForm

El formulario actual permite seleccionar una o varias empleadas (`empleada_ids`).

Para la vista de empleada:

- El campo `empleada_ids` no se muestra
- Se fija automáticamente con el `empleadaId` del contexto
- El resto del formulario es igual: cliente, tipo de trabajo, descripción, fecha

Estrategia: pasar prop `empleadaForzada?: string` al componente. Si se pasa, se usa ese id y se oculta el selector.

#### C.2 — Estado visual del trabajo

`trabajos_realizados.aprobado_at === null` → PENDIENTE  
`trabajos_realizados.aprobado_at !== null` → APROBADO

En la tabla de la empleada mostrar un badge por fila:

- PENDIENTE: badge neutro/naranja — "Pendiente de aprobación"
- APROBADO: badge verde — "Aprobado" + fecha de aprobación

Si el trabajo tiene puntos asignados y está aprobado, mostrar la cantidad de puntos en la fila.

---

### Fase D — Vista de aprobación para Paola

**Objetivo:** Paola ve todos los trabajos pendientes de sus empleadas y los aprueba desde `/trabajos`.

#### D.1 — Indicador de pendientes

En `TrabajosRealizadosOverview` o en el sidebar junto al item "Trabajos": badge con contador de trabajos pendientes (`aprobado_at IS NULL`).

#### D.2 — Filtro rápido "Pendientes"

En `/trabajos`, agregar filtro/tab "Pendientes de aprobación" que filtre por `aprobado_at IS NULL`.

#### D.3 — Aprobar trabajo

Ya existe el botón de aprobación que llama a `fn_aprobar_trabajo_realizado`. Verificar que el flow completo funcione:

1. Paola hace click en "Aprobar"
2. Se llama `trabajosRealizadosService.aprobar({ trabajo_id, genera_comision, importe_comision })`
3. La RPC actualiza `aprobado_por` y `aprobado_at`
4. Si `genera_comision = true` y la empleada tiene `tipo_comision = 'PUNTAJE'`: el trigger/RPC inserta en `registros_puntaje_empleadas`
5. La tabla de la empleada se actualiza automáticamente (React Query invalida la query)

**Nota sobre puntos:** La spec de `PUNTOS_EMPLEADAS.md` prevé que en el futuro `fn_aprobar_trabajo_realizado` auto-busque los puntos en `puntos_trabajo_config` sin que Paola los ingrese manualmente. Por ahora seguir el flujo existente (Paola ingresa el importe manualmente).

---

## 5. Consideraciones de seguridad

| Punto                                        | Cómo se maneja                                                    |
| -------------------------------------------- | ----------------------------------------------------------------- |
| Empleada no puede ver trabajos de otras      | RLS en `trabajos_realizados`: empleada solo lee sus propias filas |
| Empleada no puede aprobar trabajos           | RLS: `UPDATE` en `trabajos_realizados` solo para admin            |
| `SUPABASE_SERVICE_ROLE_KEY` solo en servidor | API Route en `src/app/api/admin/` — nunca en cliente              |
| API Route protegida                          | Verificar sesión + rol admin antes de ejecutar                    |
| Empleada no puede asignarse a otra empleada  | `empleada_id` fijo en el formulario, no editable                  |

**RLS que hay que revisar/agregar:**

- `trabajos_realizados`: la empleada solo puede leer sus propias filas (`empleada_id = auth.uid()` usando la relación `empleadas.usuario_id`)
- `trabajos_realizados`: la empleada puede insertar solo con `empleada_id` igual al suyo
- `trabajos_realizados`: la empleada NO puede hacer UPDATE (solo admin puede aprobar)

---

## 6. Cambios en DB

| Cambio                                     | Tabla/Función         | Necesario                   |
| ------------------------------------------ | --------------------- | --------------------------- |
| RLS para empleada en `trabajos_realizados` | `trabajos_realizados` | Verificar si ya existe      |
| Helper `get_empleada_id_for_user()`        | función SQL           | Útil para las políticas RLS |
| Nada más — el schema ya soporta todo       | —                     | —                           |

### Helper SQL sugerido

```sql
create or replace function get_empleada_id_for_user()
returns uuid
language sql
security definer
stable
as $$
  select id from empleadas where usuario_id = auth.uid() limit 1;
$$;
```

### Políticas RLS para `trabajos_realizados`

```sql
-- Empleada lee sus propios trabajos
create policy "empleada lee sus trabajos"
on trabajos_realizados for select
using (
  is_admin()
  or empleada_id = get_empleada_id_for_user()
);

-- Empleada inserta solo con su propio empleada_id
create policy "empleada inserta sus trabajos"
on trabajos_realizados for insert
with check (
  is_admin()
  or empleada_id = get_empleada_id_for_user()
);

-- Solo admin puede aprobar (UPDATE)
create policy "solo admin actualiza trabajos"
on trabajos_realizados for update
using (is_admin());
```

---

## 7. Orden de implementación recomendado

```
A.1 → API Route crear usuario
A.2 → UI botón "Crear acceso" en EmpleadaDetalle
B.4 → Resolver empleada_id en AuthProvider
B.1 → Redirección post-login por rol
B.2 → Nueva ruta /mis-trabajos
B.3 → Sidebar filtrado para empleada
C.1 → Adaptar CargarTrabajoForm (prop empleadaForzada)
C.2 → Badge de estado PENDIENTE/APROBADO
D.1 → Badge contador de pendientes en sidebar
D.2 → Filtro "Pendientes" en /trabajos
      ↓
Migración RLS (Fase 6) — aplicar y testear con usuario empleada real
```

---

## 8. Pendientes de confirmar con Paola

- [ ] ¿La empleada puede ver el listado de clientes para seleccionar al cargar un trabajo? (Asumir que sí — necesita ver clientes para trabajar)
- [ ] ¿La empleada ve sus puntos acumulados en tiempo real, o solo Paola los gestiona?
- [ ] ¿Puede la empleada editar o eliminar un trabajo que cargó pero todavía no fue aprobado?
- [ ] ¿Qué información de su perfil puede editar la empleada (teléfono, email)?
- [ ] ¿Paola puede desactivar el acceso de una empleada sin eliminarla?

---

## 9. Archivos a crear / modificar

| Archivo                                                  | Acción                              |
| -------------------------------------------------------- | ----------------------------------- |
| `src/app/api/admin/crear-usuario-empleada/route.ts`      | Crear                               |
| `src/app/(dashboard)/mis-trabajos/page.tsx`              | Crear                               |
| `src/modules/empleadas/components/MisTrabajosList.tsx`   | Crear                               |
| `src/modules/empleadas/components/EmpleadaDetalle.tsx`   | Modificar — agregar UI de cuenta    |
| `src/modules/empleadas/components/CargarTrabajoForm.tsx` | Modificar — prop `empleadaForzada`  |
| `src/lib/auth/AuthProvider.tsx`                          | Modificar — resolver `empleadaId`   |
| `src/lib/auth/useAuth.ts`                                | Modificar — exponer `empleadaId`    |
| `src/shared/components/layout/Sidebar.tsx`               | Modificar — filtro por rol empleada |
| `src/middleware.ts`                                      | Modificar — redirección por rol     |
| `supabase/migrations/0013_rls_portal_empleadas.sql`      | Crear — helper + políticas RLS      |
