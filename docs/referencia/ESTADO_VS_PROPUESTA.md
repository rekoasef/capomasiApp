# Estado del sistema vs. Propuesta comercial

Auditoría original realizada el 2026-07-08, comparando la implementación real (services, migraciones SQL, componentes) contra los 10 módulos prometidos en `Propuesta Paola.docx.md`. **Re-auditada y actualizada el 2026-08-06** contra el estado actual del código — todos los gaps detectados en julio fueron cerrados en el desarrollo posterior.

Convención: ✅ implementado y usable · ⚠️ parcial (funciona pero incompleto) · ❌ no implementado.

---

## Resumen ejecutivo

| #   | Módulo                   |          Estado 2026-07-08          | Estado 2026-08-06                                                                                                                      |
| --- | ------------------------ | :---------------------------------: | -------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Gestión de Clientes      |           4/6 ✅, 2/6 ⚠️            | **✅ Completo** — responsable de cliente ya expuesto en UI                                                                             |
| 2   | Honorarios Mensuales     |             ✅ Completo             | ✅ Completo                                                                                                                            |
| 3   | Trabajos Anuales         |             ✅ Completo             | ✅ Completo — unificado con el resto de los trabajos vía `tipo_vencimiento: 'ANUAL'` (ver `docs/funcional/ESTADO_MODULOS.md` módulo 3) |
| 4   | Cuentas Corrientes       |             ✅ Completo             | ✅ Completo                                                                                                                            |
| 5   | Control de Fondos        |   4/5 ✅, falta cheques emitidos    | **✅ Completo** — cheques emitidos a proveedores conectado (`proveedoresService.registrarPago` con `p_cheque_id`)                      |
| 6   | Liquidación del Personal | 3/5 ✅, falta aguinaldo/retenciones | **✅ Completo** — Aguinaldo, Vacaciones, IIBB, Monotributo como conceptos dedicados de parámetros                                      |
| 7   | Vencimientos             |             ✅ Completo             | ✅ Completo                                                                                                                            |
| 8   | Proveedores y Gastos     |    2/4 ✅, falta CC e historial     | **✅ Completo** — `v_cuenta_corriente_proveedores` + historial de pagos expandible por compra                                          |
| 9   | Estadísticas y Reportes  |           El más atrasado           | **✅ Completo** — `/reportes`: ingresos por tipo/empleada, selector de año, comparativo entre períodos                                 |
| 10  | Usuarios y Accesos       |   2/4 ✅, falta guard + audit log   | **✅ Completo** — `src/proxy.ts` (guard de rutas por rol) + audit log ampliado a las tablas sensibles que faltaban                     |

**Total: 10/10 módulos de la propuesta comercial completos.** Verificado contra el código real (no solo contra documentación) el 2026-08-06.

---

## Pendientes de puesta en marcha (no son gaps de la propuesta)

Estos ítems no forman parte de los 10 módulos cotizados — son pasos operativos de entrega, cubiertos por "carga inicial de datos" y "mes de prueba" del contrato:

1. **Personalizar el PDF de liquidación/recibo** según el modelo que Paola tiene que pasar — cambio simple, se puede hacer con el sistema ya en producción.
2. **Publicar en subdominio de prueba** para el mes de validación con Paola.

**Descartado:** migración masiva de saldo inicial real de cuenta corriente para clientes con deuda pendiente — decisión final (2026-08-06) es que todas las cuentas arrancan en $0; la deuda histórica queda solo en la tabla informativa `facturacion_historica`. No es una funcionalidad faltante: si hace falta reflejar la deuda real de un cliente puntual, Paola ya puede cargarla como una liquidación manual en la cuenta corriente de ese cliente con el flujo normal existente.

---

## Trabajo construido que NO estaba en la propuesta original

Alcance adicional — funcionalidad real, en producción, que Paola no pagó explícitamente porque no figuraba en ninguno de los 10 módulos cotizados. Detalle completo en `docs/funcional/ESTADO_MODULOS.md` (sección "Scope adicional no cotizado"):

1. Portal de acceso propio para empleadas (login independiente + "Mis Trabajos")
2. Sistema de puntos y comisiones para empleadas (config por cliente/tipo de trabajo, cuenta corriente de puntaje, premio por supervisión, comisión por producción y por hora)
3. Motor de flujo de trabajo con estados y aprobaciones (vencimiento → trabajo → aprobación → cola de facturación → cuenta corriente)
4. Calendario visual de vencimientos (react-big-calendar)
5. Gestión de gastos recurrentes y categorías propias de Paola, separada de Proveedores
6. Sistema de parámetros configurables como capa de arquitectura
7. Dashboard con vista diferenciada por rol
8. Facturación histórica del Excel como tabla informativa filtrable (325 filas migradas)
