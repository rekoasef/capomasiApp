# Reunión 2026-07-16 — Demo y ajustes finales

Documento de planificación. Paola vio la plataforma casi terminada en una demo en vivo (Renzo compartiendo pantalla) y surgieron 10 ajustes puntuales más unas confirmaciones de infraestructura/entrega. Fuente: transcripción + notas de Gemini de la reunión (archivo fuera del repo, en poder de Renzo).

**Alcance:** ajustes transversales a Trabajos/Vencimientos, Cobranzas, Empleadas (comisiones), Proveedores, Fondos y Dashboard/Reportes. No es un rediseño de módulo como `CAMBIOS_COBRANZAS.md` o `CAMBIOS_VENCIMIENTOS_GASTOS.md`, sino una lista de correcciones puntuales post-demo.

**Estado a la fecha de este documento: 9 de 10 ítems técnicos implementados** (migraciones `0040` a `0048`, todas con comentario explícito "reunión 2026-07-16"). El único ítem restante es carga de datos por Paola, no código (ver ítem 1).

---

## 1. Resumen de pendientes de la reunión

| #   | Ítem                                                                                                               | Estado                                                                                                                       | Dónde                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 1   | Tipos de trabajo faltantes (DDJJ anuales: convenio multilateral, IIBB, participación en sociedades, etc.)          | ⬜ Carga de datos, no de código — se hace desde el manager de `parametros` ya existente cuando Paola dicte la lista completa | —                                                                                                            |
| 2   | Separar "puntos de comisión" de "facturación aparte del abono"                                                     | ✅ Implementado                                                                                                              | `0040_facturar_aparte.sql`; UI en `PuntosClienteSection.tsx`                                                 |
| 3   | Agregar "Compensación" como tipo de pago                                                                           | ✅ Implementado                                                                                                              | `0041_compensacion_tipo_pago.sql`; UI en `RegistrarReciboForm.tsx`                                           |
| 4   | Descargar cuenta corriente en PDF, filtrada por fecha, nombre de archivo = cliente                                 | ✅ Implementado                                                                                                              | `CuentaCorrienteCliente.tsx` + `CuentaCorrientePdfDocument.tsx`                                              |
| 5   | Puntos de empleadas como cuenta corriente manual (no corte automático de umbral)                                   | ✅ Implementado                                                                                                              | `0043_comisiones_cuenta_corriente_manual.sql`; UI en `ComisionesSection.tsx`                                 |
| 6   | Premio por supervisión / bono libre en liquidación de empleada                                                     | ✅ Ya existía (concepto `HABER` libre en `liquidaciones_empleadas`) — no requirió cambios                                    | `EmpleadaDetalle.tsx`                                                                                        |
| 7   | Alerta de impuestos/gastos personales vencidos sin pagar en el dashboard                                           | ✅ Implementado                                                                                                              | `app/(dashboard)/page.tsx` (bloque `impuestos_personales_vencidos`)                                          |
| 8   | Simplificar alta de proveedores/gastos (sin CUIT obligatorio, gasto suelto sin proveedor)                          | ✅ Implementado                                                                                                              | `0042_proveedor_id_nullable.sql`; UI en `ProveedoresOverview.tsx`                                            |
| 9   | Dashboard: separar Ingreso Base (negro) / Facturado Cliente (neto) / IVA Facturado + resultado mensual del estudio | ✅ Implementado                                                                                                              | `0044_ingresos_negro_blanco_iva.sql`, `0045_resultado_mensual_estudio.sql`; UI en `app/(dashboard)/page.tsx` |
| 10  | Reportes: filtro por mes **y** año (no solo año)                                                                   | ✅ Implementado                                                                                                              | `app/(dashboard)/reportes/page.tsx`                                                                          |
| 11  | Cheques: tilde visual verde/rojo para confirmar acreditación bancaria real                                         | ✅ Implementado                                                                                                              | `0046_cheques_acreditacion_confirmada.sql`; UI en `ChequesTable.tsx`                                         |
| 12  | Fondos: registrar dólares ahorrados y cuenta "Taralo" (agente de bolsa) como ingreso/egreso simple                 | ✅ Implementado                                                                                                              | `0047_fondos_taralo.sql`, `0048_fondos_notas.sql`; UI en `FondosOverview.tsx`                                |

---

## 2. Detalle de lo ya implementado

No se repite el detalle de negocio (ya está en los comentarios de cada migración y fue confirmado en la reunión); solo se deja la traza para auditoría:

- **Ítem 2** — `puntos_trabajo_config.facturar_aparte` (bool, default `TRUE`) y snapshot en `vencimientos.facturar_aparte`. Antes "0 puntos" se usaba también para decir "no facturar aparte", lo cual era incorrecto: un trabajo puede comisionar sin facturarse aparte (ya incluido en el abono) o viceversa. `vencimientosFiscalesService` filtra la cola de facturación por este campo, no por puntos.
- **Ítem 3** — `recibos.tipo_pago` admite `COMPENSACION` (trueque de servicios sin movimiento de dinero, ej. "Ivo le da ropa a cambio de un trabajo").
- **Ítem 4** — Genera el PDF con `@react-pdf/renderer`, filtra liquidaciones/recibos por rango de fechas, nombre de archivo = razón social del cliente.
- **Ítem 5** — Reemplaza el corte automático mensual de 15,5 puntos por saldo en tiempo real (`saldo_puntaje_empleadas` actualizado por trigger en cada alta/baja de `registros_puntaje_empleadas`) + `fn_ajustar_saldo_puntaje` para descuento manual cuando Paola decide liquidar (puede acumular varios meses). El flujo viejo (`fn_confirmar_comision_puntaje` / `fn_liquidar_comision_puntaje`) queda sin uso pero no se borra, para no romper historial ya registrado. **Ver `PUNTOS_EMPLEADAS.md`, actualizado con esta corrección.**
- **Ítem 8** — `compras_proveedores.proveedor_id` ahora nullable; el campo `concepto` (ya obligatorio) describe el gasto suelto sin CUIT (combustible, ropa, etc.).
- **Ítem 9** — `v_ingresos_mensuales` agrega `ingreso_base_negro` (FC_C + PRESUPUESTO), `facturado_cliente_neto` (FC_A + FC_B, neto) e `iva_facturado` (diferencia). `v_resultado_mensual` cruza ingresos con `gasto_sueldos` (liquidaciones_empleadas HABER), `gasto_proveedores` (compras_proveedores) y `gasto_manual_estudio` (pagos_gastos de categorías con `ambito = 'ESTUDIO'`, columna nueva en `categorias_gastos`).
- **Ítem 11** — `cheques.acreditacion_confirmada` (+ `_at`, `_by`) como control **adicional** al enum de `estado` existente, no lo reemplaza. Solo se puede confirmar/desmarcar cuando el cheque está `DEPOSITADO`, `ENDOSADO` o `RECHAZADO` (no en `EN_CARTERA` ni `ANULADO`) — `chequesService.confirmarAcreditacion` / `desmarcarAcreditacion` valida esto vía `.not('estado', 'in', ...)` en el update y devuelve `VALIDATION_ERROR` si no matchea ninguna fila. UI: ícono clickeable rojo (`CircleDashed`) / verde (`CheckCircle2`) en `ChequesTable.tsx`, aplica tanto a cheques recibidos de clientes como emitidos a proveedores.
- **Ítem 12** — Se optó por **no** crear tabla ni módulo nuevo. Los **dólares** ya funcionaban de punta a punta con el campo `importe_usd` existente en `fondos_movimientos` (alimentado automáticamente por `fn_recibo_a_fondos` cuando un recibo tiene `tipo_pago = 'USD'`, más carga manual con los conceptos `COMPRA_USD`/`VENTA_USD` que ya existían) — solo se relabeleó la tarjeta de "USD" a "Dólares" en el dashboard de Fondos. **Taralo** se agregó como una cuarta cuenta paralela: columna `fondos_movimientos.importe_taralo` + `v_saldo_fondos.saldo_taralo` (`0047_fondos_taralo.sql`), con conceptos `APORTE_TARALO`/`RETIRO_TARALO`. Ninguna de las dos cuentas toca `saldo_banco` ni requiere conciliación bancaria, tal como pidió Paola. De paso se agregó un campo `notas` (observación libre) a cada movimiento de fondos (`0048_fondos_notas.sql`), pedido en la misma sesión de trabajo para poder anotar detalle en cargas manuales.

---

## 3. Decisiones de infraestructura y entrega (no son cambios de código)

Confirmado en la misma reunión, para referencia:

- **Hosting:** Vercel (deploy de la plataforma) + Supabase (base de datos). Dominio nuevo a comprar: `estudiopaolacapomasi.com` — separado del sitio WordPress actual de Paola (otro proveedor, otro hosting, no se mezclan).
- **Backups:** plan pago de Supabase da backups diarios automáticos; el plan gratis requiere backup manual (ver `docs/core/BACKUPS.md`).
- **Entrega final:** Renzo se compromete a pasar el código fuente por GitHub (repositorio a nombre de Paola) y dejar todas las cuentas de servicio (Supabase, Vercel, dominio) a nombre de ella, para garantizar autonomía total si Renzo deja de estar disponible.
- **Próximo paso general del proyecto:** una vez cerrada esta ronda de ajustes, migrar los datos históricos del Excel y habilitar acceso de prueba para Paola.

---

## 4. Pendiente real (no técnico)

Carga manual, por Paola, de los tipos de trabajo anuales faltantes (ítem 1: DDJJ de convenio multilateral, IIBB, participación en sociedades, etc.) vía el manager de tipos de trabajo/`parametros` ya existente. No requiere código.

---

## 5. Referencias

- Transcripción y notas de Gemini de la reunión 2026-07-16 (archivo local de Renzo, fuera del repo).
- Migraciones: `0040_facturar_aparte.sql`, `0041_compensacion_tipo_pago.sql`, `0042_proveedor_id_nullable.sql`, `0043_comisiones_cuenta_corriente_manual.sql`, `0044_ingresos_negro_blanco_iva.sql`, `0045_resultado_mensual_estudio.sql`, `0046_cheques_acreditacion_confirmada.sql`, `0047_fondos_taralo.sql`, `0048_fondos_notas.sql`.
- Documentación relacionada: [`PUNTOS_EMPLEADAS.md`](./PUNTOS_EMPLEADAS.md) (corregido por el ítem 5), [`ROADMAP_PENDIENTES.md`](./ROADMAP_PENDIENTES.md).
