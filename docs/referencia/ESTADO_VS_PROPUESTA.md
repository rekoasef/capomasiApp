# Estado del sistema vs. Propuesta comercial (Abril 2026)

Auditoría de código realizada el 2026-07-08, comparando la implementación real (services, migraciones SQL, componentes) contra los 10 módulos prometidos en `Propuesta Paola.docx.md`. **No se tomó como fuente de verdad el checklist de `CLAUDE.md`** porque está desactualizado (ej: figuraba "Dashboard: no empezado" cuando ya estaba implementado).

Convención: ✅ implementado y usable · ⚠️ parcial (funciona pero incompleto) · ❌ no implementado (aunque el schema de DB lo contemple).

---

## Resumen ejecutivo

| #   | Módulo                   | Ítems ✅ | Ítems ⚠️ | Ítems ❌ | Estado general                                     |
| --- | ------------------------ | :------: | :------: | :------: | -------------------------------------------------- |
| 1   | Gestión de Clientes      |   4/6    |   2/6    |   0/6    | Sólido, con 2 detalles menores                     |
| 2   | Honorarios Mensuales     |   5/5    |    —     |    —     | **Completo**                                       |
| 3   | Trabajos Anuales         |   4/4    |    —     |    —     | **Completo**                                       |
| 4   | Cuentas Corrientes       |   5/5    |    —     |    —     | **Completo**                                       |
| 5   | Control de Fondos        |   4/5    |    —     |   1/5    | Falta alta de cheques emitidos                     |
| 6   | Liquidación del Personal |   3/5    |   1/5    |   1/5    | Falta aguinaldo/vacaciones y retenciones           |
| 7   | Vencimientos             |   5/5    |    —     |    —     | **Completo**                                       |
| 8   | Proveedores y Gastos     |   2/4    |   2/4    |    —     | Falta CC de proveedores e historial de pagos en UI |
| 9   | Estadísticas y Reportes  |   1/4    |   2/4    |   1/4    | El más atrasado — "Reportes" no existe como módulo |
| 10  | Usuarios y Accesos       |   2/4    |   2/4    |    —     | Falta guard de rutas y audit log completo          |

**Total: 35/47 ítems ✅ completos, 9 parciales, 3 no implementados → ~84% de cobertura funcional de lo prometido**, más una cantidad considerable de trabajo construido que no estaba en el alcance original (ver sección final).

---

## Detalle por módulo

### Módulo 1 — Gestión de Clientes

- ✅ Ver, agregar, editar, dar de baja — `clientesService.ts` (soft delete con `deleted_at`)
- ⚠️ Datos completos (CUIT, domicilio, teléfono, mail) — todos presentes pero domicilio es un solo campo de texto libre, no desagregado
- ✅ Claves de acceso (AFIP/ANSES/Sindicato/ARBA), solo admin — tabla `claves_clientes`, `clavesService.ts`, RLS `is_admin()`
- ⚠️ Responsable asignado del estudio por cliente — columna `responsable_id` **existe en la DB** (FK a `usuarios`) pero no está expuesta en ningún formulario ni tabla de la UI
- ✅ Notas y observaciones internas — campo `notas`
- ✅ Búsqueda rápida por nombre/CUIT/localidad — `clientesService.search()`

### Módulo 2 — Honorarios Mensuales ✅ Completo

- ✅ Configurar honorario mensual por cliente
- ✅ Periodicidad de actualización (`frecuencia_ajuste_meses`)
- ✅ Aplicar % de inflación (`fn_aplicar_ajuste_honorario`, `calcularNuevoHonorario.ts`)
- ✅ Historial mes a mes (versionado con `vigente_desde`/`vigente_hasta`)
- ✅ Vista de clientes con ajuste pendiente

### Módulo 3 — Trabajos Anuales ✅ Completo

- ✅ Balances, ganancias, bienes personales, ISIB y otros tipos
- ✅ Honorario cobrado por trabajo
- ✅ Estados PENDIENTE → EN_PROCESO → FINALIZADO → COBRADO con máquina de estados
- ✅ Historial por cliente y por año

### Módulo 4 — Cuentas Corrientes ✅ Completo

- ✅ Saldo en tiempo real (`v_cuenta_corriente`)
- ✅ Débitos (liquidaciones) y créditos (recibos/imputaciones)
- ✅ Antigüedad de deuda (0-30/31-60/61-90/90+)
- ✅ Listado de clientes deudores
- ✅ Historial completo de movimientos por cliente

### Módulo 5 — Control de Fondos

- ✅ Ingresos y egresos de caja — `fondos_movimientos`
- ✅ Cheques recibidos: disponibles/depositados/endosados/rechazados — flujo completo de alta y cambio de estado
- ❌ **Cheques emitidos (a proveedores)** — el schema los soporta (`tipo: 'PROPIO'`, `origen: 'EMITIDO'`, FK a `proveedores`) pero **no existe ningún flujo de código que los genere**: `proveedoresService.registrarPago()` llama al RPC con `cheque_id: undefined` hardcodeado, y no hay ningún formulario de alta
- ✅ Transferencias bancarias — campo `cuenta_bancaria` en movimientos/pagos
- ✅ Saldo de caja en tiempo real — `v_saldo_fondos`

### Módulo 6 — Liquidación del Personal

- ✅ Liquidación mensual por empleada — `liquidaciones_empleadas`
- ⚠️ **Premios, aguinaldo y vacaciones** — hay un sistema real de premios/comisiones (puntaje, % sobre monto, valor hora), pero **aguinaldo (SAC) y vacaciones no tienen cálculo automático ni campo propio**; solo se pueden cargar como texto libre en un concepto genérico
- ✅ Empleadas en relación de dependencia y por hora — `tipo_relacion`, tabla `registros_horas`
- ✅ Historial de pagos por empleada — `pagos_empleadas`
- ❌ **Retenciones específicas (IIBB, monotributo, etc.)** — no existe como concepto dedicado, solo el campo genérico `concepto: string`

### Módulo 7 — Vencimientos ✅ Completo

- ✅ Calendario de vencimientos impositivos por cliente (vista lista y calendario)
- ✅ Ver trabajos pendientes por cliente en el mes, con filtros
- ✅ Ver pendientes de cualquier empleada (no solo la propia)
- ✅ Vencimientos personales de la contadora (`ambito: 'PERSONAL'`, protegido por RLS)
- ✅ Alertas visuales (vencido / hoy / próximos 7 días)

### Módulo 8 — Proveedores y Gastos

- ✅ Base de datos de proveedores — CRUD completo
- ✅ Compras/gastos con múltiples formas de pago (transferencia/efectivo/cheque)
- ⚠️ **Cuenta corriente con proveedores** — solo hay estado por compra individual, no existe una vista de saldo acumulado por proveedor (a diferencia de `v_cuenta_corriente` de clientes, que sí existe)
- ⚠️ **Historial de pagos** — el service y el hook existen (`getPagos`, `usePagosProveedor`) pero **no se usan en ningún componente**: no hay UI para verlo

### Módulo 9 — Estadísticas y Reportes (el módulo más atrasado)

- ⚠️ Resumen de ingresos por mes y año — existe `v_ingresos_mensuales` pero el dashboard solo muestra los últimos 6 meses, sin vista anual acumulada ni selector de año
- ❌ **Ingresos desagregados por tipo de trabajo y por empleada** — no implementado, no existe ninguna query que cruce ingresos con `tipo_trabajo` o `empleada_id`
- ⚠️ Comparativo entre períodos — el array de 6 meses permite ver tendencia, pero no hay una funcionalidad explícita para comparar dos rangos elegidos por el usuario
- ✅ Estado general de cobranzas del estudio — deuda total y cantidad de deudores en el dashboard

**Nota:** en la propuesta este es un solo módulo, pero en `CLAUDE.md` se dividió en "Dashboard" (3.1) y "Reportes" (3.2). El Dashboard (3.1) está construido; **"Reportes" (3.2) directamente no existe como sección separada** — no hay comparativos ni desagregación por tipo/empleada en ningún lado del sistema.

### Módulo 10 — Usuarios y Accesos

- ✅ Perfil Administrador con acceso total — RLS `is_admin()` protege sueldos, gastos personales y claves de clientes
- ⚠️ **Perfil Empleada con acceso restringido** — el filtrado es solo a nivel de **UI** (sidebar) y RLS de datos; **no existe `middleware.ts`** ni guard de ruta, así que una empleada que navegue directo a una URL admin-only no es redirigida (aunque no puede ver datos por RLS, sí vería la pantalla vacía/con error)
- ✅ Cada usuario con su propia clave — Supabase Auth + trigger de creación de perfil
- ⚠️ **Audit log** — la tabla `audit_log` y el trigger genérico existen y están aplicados en `cobranzas`, `honorarios`, `recibos_imputaciones`, `trabajos_realizados`, `gastos_categorias`, pero **no en** `empleadas`, `liquidaciones_empleadas`, `pagos_empleadas`, `proveedores`, `vencimientos`. Tampoco hay ninguna pantalla para que el admin consulte el historial de acciones

---

## Trabajo construido que NO estaba en la propuesta original

Esto es alcance adicional — funcionalidad real, en producción, que Paola no pagó explícitamente porque no figuraba en ninguno de los 10 módulos cotizados:

1. **Portal de acceso propio para empleadas** — login independiente, vista "Mis Trabajos" filtrada por rol, creación de cuentas desde `EmpleadaDetalle` vía API route con `service_role` (`src/app/api/admin/crear-usuario-empleada/`). La propuesta solo hablaba de "perfil Empleada: acceso a módulos habilitados", no de un portal de autogestión completo.

2. **Sistema de puntos y comisiones para empleadas** — configuración de puntos por tipo de trabajo y por cliente (`puntos_trabajo_config`), cuenta corriente de puntaje con umbral de cobro (15.5 pts/mes), premios por porcentaje sobre sueldo de otra empleada (caso supervisión), comisión por producción y por hora, importación masiva e individual de comisiones. Esto no aparece en ningún lado de la propuesta.

3. **Flujo completo de aprobación de trabajos → facturación** — ciclo PENDIENTE → INICIADO → EN_PROCESO → TERMINADO → APROBADO, con generación automática de instancias de vencimiento desde la configuración del cliente (`generarDesdeConfig`, idempotente), cola de facturación que agrupa por cliente y genera la liquidación en la cuenta corriente. La propuesta preveía un módulo de vencimientos simple tipo calendario; esto es un motor de flujo de trabajo con estados y aprobaciones.

4. **Calendario visual de vencimientos** (react-big-calendar) además de la vista de lista — no estaba especificado el formato.

5. **Gestión de gastos recurrentes y categorías propias de Paola** (`GastosPaolaOverview`, `CategoriasManager`, `gastos_categorias`) — un sistema de gastos personales/del estudio con recurrencia, separado del módulo de Proveedores.

6. **Sistema de parámetros configurables** (`TiposServicioManager`, tabla `parametros`) que evita hardcodear listas de valores — mencionado como regla interna de arquitectura, no como feature visible para la clienta, pero le da flexibilidad para agregar tipos de trabajo/comprobante sin pedir un cambio de código.

7. **Dashboard con vista diferenciada por rol** — admin ve métricas globales (ingresos, deuda, cola de facturación, vencimientos), empleada ve un resumen personal (sus pendientes, sus puntos del mes, sus próximos vencimientos). La propuesta hablaba de un dashboard único.

---

## Gaps a cerrar antes de dar el sistema por "aprobado" (prioridad sugerida)

1. **Alta) Reportes / desagregación de ingresos por tipo y empleada** — es el único módulo completo de la propuesta que falta construir de cero (Módulo 9).
2. **Media) Cheques emitidos a proveedores** — el schema está listo, falta el formulario y conectar el service (Módulo 5).
3. **Media) Cuenta corriente e historial de pagos de proveedores en UI** — el backend ya existe, falta exponerlo (Módulo 8).
4. **Media) Aguinaldo/vacaciones y retenciones de empleadas** — definir con Paola si hace falta cálculo automático o alcanza con carga manual mejorada (Módulo 6).
5. **Baja) Guard de rutas por rol (`middleware.ts`)** — hoy la seguridad real la da RLS, pero conviene agregar la redirección para que una empleada no vea pantallas rotas.
6. **Baja) Audit log completo + UI de consulta** — aplicar el trigger a las tablas que faltan y armar una vista simple para el admin (Módulo 10).
7. **Baja) Responsable de cliente en la UI** — la columna ya existe en la DB, solo falta exponerla en el formulario (Módulo 1).
