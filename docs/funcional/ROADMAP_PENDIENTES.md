# Roadmap — Pendientes para cerrar la propuesta

Guía simple de lo que falta para cubrir el 100% de los 10 módulos prometidos en `docs/referencia/Propuesta Paola.docx.md`. Detalle completo de cada gap en `docs/referencia/ESTADO_VS_PROPUESTA.md`.

**Regla:** esta lista es el límite del alcance. Nada fuera de acá se agrega salvo que Paola lo pida explícitamente y se cotice aparte.

---

## Fase 1 — Reportes ✅ (2026-07-08)

El único módulo de los 10 que directamente no existía. Implementado completo.

- [x] Ingresos desagregados por tipo de trabajo y por empleada
- [x] Selector de año/rango (nueva página `/reportes`, no en el dashboard — ingresos mensuales del año completo, no solo 6 meses)
- [x] Comparativo entre dos períodos elegidos por el usuario

**Qué se hizo:** migración `0034_reportes_ingresos.sql` (vistas `v_ingresos_por_tipo_mes` y `v_ingresos_por_empleada_mes`), módulo `src/modules/reportes/` completo (service, hooks, tests de la función pura `sumarIngresos`), página `/reportes` (admin only) con ítem nuevo en el Sidebar. Aplicado y verificado contra la DB real de `SistemaEstudio`.

**Limitación conocida:** cuando una liquidación mensual se carga a mano con `generado_por` combinado (ej. "Paola + Luciana"), el reporte por empleada la cuenta como un solo grupo — no se puede partir el importe entre ambas. Los trabajos anuales (Balances, Ganancias, etc.) se muestran en una card aparte porque viven en `honorarios_anuales`, no en `liquidaciones`, y mezclarlos en el total mensual sería engañoso.

## Fase 2 — Fondos y Proveedores ✅ (2026-07-12)

- [x] Formulario de alta de cheques emitidos a proveedores (el schema ya lo soporta)
- [x] Vista de cuenta corriente por proveedor (saldo acumulado, hoy solo hay estado por compra)
- [x] Pantalla de historial de pagos a proveedores (el hook `usePagosProveedor` ya existe, no se usa en ningún componente)

**Qué se hizo:** `pagoProveedorSchema` extendido con campos condicionales de cheque (número, banco, fecha de emisión); `proveedoresService.registrarPago` ahora crea el cheque (`origen: 'EMITIDO'`, `tipo: 'PROPIO'`) antes de llamar al RPC `fn_registrar_pago_proveedor`, en vez de hardcodear `cheque_id: undefined`. Migración `0035_cc_proveedores.sql` con vista `v_cuenta_corriente_proveedores` (mismo patrón que `v_cuenta_corriente` de clientes), aplicada a la DB real de `SistemaEstudio` y tipos regenerados. Nueva tab "Cuenta Corriente" en `ProveedoresOverview.tsx`. Historial de pagos resuelto con una fila expandible por compra que reutiliza el hook `usePagosProveedor` ya existente (no hizo falta query nueva).

## Fase 3 — Liquidación de Empleadas ✅ (2026-07-12)

- [x] Definir con Paola: ¿aguinaldo y vacaciones necesitan cálculo automático o alcanza con mejorar la carga manual actual? → **Decisión de Renzo: mejorar solo la carga manual**, sin cálculo automático (la fórmula legal de SAC/vacaciones puede variar y no vale la pena automatizarla para este alcance)
- [x] Concepto dedicado para retenciones (IIBB, monotributo, etc.) en vez del campo de texto libre genérico

**Qué se hizo:** el formulario de "Agregar concepto" en `EmpleadaDetalle.tsx` **ya tenía** un select con Aguinaldo/Vacaciones (Haber) e IIBB/Monotributo (Descuento) — no era texto libre. Lo que faltaba era que esa lista viviera en la tabla `parametros` en vez de solo el fallback hardcodeado del frontend (regla #7 de CLAUDE.md). Migración `0036_seed_conceptos_empleada.sql` siembra `CONCEPTO_HABER_EMPLEADA` y `CONCEPTO_DESCUENTO_EMPLEADA` con los mismos valores que ya usaba el fallback, aplicada a la DB real de `SistemaEstudio`. Cero cambios de UI/UX — cierra la deuda de arquitectura sin tocar el flujo que Paola ya usa. No se agregó manager de administración (decisión: alcance mínimo).

## Fase 4 — Seguridad y trazabilidad ✅ (2026-07-12)

Bajo impacto visual para Paola, pero cierra deuda técnica real.

- [x] Redirección por rol (hoy la seguridad real la da RLS; falta que la empleada no vea pantallas rotas si entra a una URL admin)
- [x] Aplicar el trigger de `audit_log` a las tablas que faltan: `empleadas`, `liquidaciones_empleadas`, `pagos_empleadas`, `proveedores`, `vencimientos`
- [x] Pantalla simple para que el admin consulte el audit log (hoy la tabla existe pero nadie la lee desde la UI)

**Qué se hizo:** `src/proxy.ts` (Next.js 16 renombró `middleware.ts` a `proxy.ts`) ahora redirige a `/` a cualquier usuario no-admin que intente entrar por URL directa a `/empleadas`, `/fondos`, `/proveedores`, `/vencimientos` o `/reportes` — la lista debe coincidir con `adminOnly` en `Sidebar.tsx`. Migración `0037_audit_faltantes.sql` aplica `fn_audit_trigger()` (ya existente) a las 5 tablas listadas, aplicada a la DB real. Nuevo módulo `src/modules/auditoria/` (types, service, hook) + componente `AuditLogViewer` (admin-only, filtro por tabla, fila expandible con el diff JSON) agregado como sección nueva en `/configuracion`.

## Fase 5 — Detalle menor ✅ (2026-07-12)

- [x] Exponer "responsable de cliente" en el formulario de clientes (la columna `responsable_id` ya existe en la DB, solo falta el campo en el form)

**Qué se hizo:** select de "Responsable" en `ClienteForm.tsx` (lista de `usuarios` activos) y fila en `ClienteDetalle.tsx` mostrando el nombre. De paso se encontró y corrigió un bug de RLS preexistente: la tabla `usuarios` tenía una policy de lectura restringida a `auth.uid() = id` (residuo de antes de las migraciones versionadas) que contradecía lo documentado en CLAUDE.md ("todos autenticados leen") — sin el fix, una empleada no podía ver el nombre del responsable salvo que fuera ella misma. Migración `0038_fix_usuarios_read_all.sql` agrega una policy adicional con `is_authenticated_user()`, aplicada a la DB real.

---

**Las 5 fases del roadmap están cerradas (2026-07-12).** Deuda de lint no urgente pendiente (ver memoria del proyecto) para una sesión de mantenimiento aparte.

## Fase 6 — Ajustes post-demo (2026-07-16) ✅

Demo en vivo con Paola sobre la plataforma casi terminada. Surgieron 10 ajustes puntuales, detallados en [`REUNION_2026-07-16_DEMO.md`](./REUNION_2026-07-16_DEMO.md). **Los 9 ítems técnicos están implementados** (migraciones `0040` a `0048`, aplicadas a la DB real de `SistemaEstudio`).

Único pendiente, de **carga de datos** (no de código): que Paola dicte la lista completa de tipos de trabajo anuales faltantes (DDJJ de convenio multilateral, IIBB, participación en sociedades, etc.) para cargarlos en `parametros`.
