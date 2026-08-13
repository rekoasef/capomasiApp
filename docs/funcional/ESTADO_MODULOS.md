# Estado Funcional de los Módulos

Documento vivo. Describe **qué hace hoy el sistema**, módulo por módulo — no la historia de reuniones ni las decisiones de diseño que llevaron hasta acá (esos documentos se consolidaron en este único archivo y se dieron de baja).

Para otros aspectos del proyecto:

- **Alcance comercial y presupuesto:** `docs/referencia/Propuesta Paola.docx.md`
- **Auditoría de cobertura vs. lo cotizado:** `docs/referencia/ESTADO_VS_PROPUESTA.md`
- **Arquitectura, patrones de código, schema de DB:** `docs/core/`
- **Cómo carga Paola la info hoy en el Excel (para la futura migración):** `docs/referencia/GUIA_EXCEL.md`

Última actualización: 2026-07-28.

---

## 1. Clientes

ABM completo con baja lógica (`deleted_at`). Datos: CUIT, domicilio (campo único de texto libre), teléfono, mail, localidad, notas internas. Búsqueda rápida por nombre, CUIT o localidad.

Claves de acceso (AFIP, ANSES, Sindicato, ARBA) en tabla separada `claves_clientes`, visibles solo para admin (RLS). Cada cliente tiene un responsable del estudio asignado, visible en el formulario y el detalle.

## 2. Honorarios Mensuales

Honorario vigente por cliente, versionado en el tiempo (`vigente_desde`/`vigente_hasta`, sin pisar historial). Frecuencia de ajuste configurable por cliente. Aplicar un % de inflación recalcula el nuevo monto (`calcularNuevoHonorario`, testeado con redondeo y edge cases). Vista de clientes con ajuste pendiente según su frecuencia.

Al cargar una liquidación nueva, el sistema pre-carga los datos del último registro del cliente (importe, tipo de comprobante, empleada, período siguiente calculado automáticamente) — el usuario solo confirma o ajusta el importe si cambió.

## 3. Trabajos

Cubre tanto los trabajos anuales clásicos (balances, ganancias, bienes personales, ISIB, etc.) como los que se generan automáticamente desde la configuración de vencimientos fiscales de cada cliente (ver módulo 7).

- **Estados y aprobación:** cada trabajo pasa por un flujo con aprobación de Paola. Los "saldos técnicos" (Victoria) admiten estados de avance intermedios en vez de un simple pendiente/terminado.
- **Puntos de comisión:** cada (cliente, tipo de trabajo) puede tener puntos configurados; se acreditan automáticamente a la empleada al aprobar el trabajo.
- **Facturación independiente del punto:** un flag `facturar_aparte` (separado de si comisiona o no) determina si el trabajo genera un cargo aparte en la cuenta corriente del cliente o si ya está incluido en el abono mensual.
- **Cola de facturación:** los trabajos aprobados con `facturar_aparte = true` caen automáticamente en una cola "pendiente de facturar". Paola completa número de comprobante, fecha e importe, y el sistema genera el cargo en la cuenta corriente del cliente sin que ella tenga que ir a buscar al cliente manualmente.
- **Portal de empleadas:** cada empleada tiene su propio login (creado por Paola desde la ficha de la empleada). Ve solo "Mis Trabajos" — los propios, filtrados por RLS a nivel de base de datos, no solo por UI. Carga un trabajo, queda PENDIENTE, y aparece en la bandeja de aprobación de Paola.

## 4. Cobranzas / Cuenta Corriente

Saldo por cliente en tiempo real (`v_cuenta_corriente`), con antigüedad de deuda por tramos (0-30/31-60/61-90/90+) y listado de deudores.

- **Liquidado vs. facturado:** cada liquidación separa `importe_liquidado` (honorario neto, para estadísticas internas) de `importe_facturado` (lo que paga el cliente, base de la cuenta corriente). Factura A suma 21% de IVA automáticamente; Factura C y Presupuesto no. El total a facturar se muestra en vivo mientras se carga.
- **Numeración automática:** los presupuestos se numeran solos (`P-0100` en adelante, secuencia interna). Factura A y C llevan número manual porque vienen de AFIP.
- **Recibos con dos series independientes:** serie `A-0100...` para pagos de Factura A, serie `C-0100...` para pagos de Factura C o Presupuesto. El sistema determina la serie según lo que se impute; si un mismo cobro cubre ambos tipos a la vez, genera dos recibos separados.
- **Medios de cobro:** transferencia (con cuenta bancaria), efectivo, cheque, USD (con tipo de cambio) y compensación (trueque sin movimiento de dinero).
- **Exportación:** cuenta corriente a PDF, filtrable por rango de fechas, nombre de archivo = cliente.

## 5. Control de Fondos

Caja con cuatro columnas paralelas — cuentas bancarias, efectivo, USD y "Taralo" (agente de bolsa) — con saldo en tiempo real (`v_saldo_fondos`). Ninguna requiere conciliación bancaria excepto el/los bancos.

- **Cheques recibidos de clientes:** quedan "en cartera" y **no suman al saldo de Banco** hasta que se confirma la acreditación real (un tilde independiente del estado del cheque). Si se marca rechazado o anulado, se revierte el movimiento — la plata nunca contó.
- **Cheques emitidos a proveedores:** se generan al pagarle a un proveedor eligiendo "cheque" como medio.
- **Endoso de cheque de cartera:** en vez de emitir un cheque propio, Paola puede endosar un cheque de cliente que ya tiene en cartera directamente a un proveedor. Descuenta contra una compra real y el saldo en cartera de ese cheque queda en cero sin tocar nunca el banco.
- **Carga manual de cheques:** para saldos iniciales (migración del Excel) o cheques recibidos fuera de un recibo formal.
- Movimientos con campo de notas libre.

## 6. Empleadas (Liquidación del personal)

Legajo por empleada: relación de dependencia o por hora, tipo de comisión (producción / puntaje / hora).

- **Liquidación mensual:** conceptos de haber y descuento configurables desde parámetros (incluye Aguinaldo, Vacaciones, IIBB, Monotributo como conceptos dedicados — no texto libre) más un premio libre por porcentaje sobre un monto (ej. comisión de Victoria por supervisar a otra empleada).
- **Comisión por puntaje:** puntos configurables por (cliente, tipo de trabajo), acreditados automáticamente al aprobar un trabajo. Funciona como una cuenta corriente en tiempo real — los puntos no se resetean mes a mes; Paola decide cuándo descontar el umbral acumulado (puede juntar varios meses).
- **Comisión por producción/hora:** cálculo sobre el total facturado en el mes o sobre horas registradas, según el tipo asignado a la empleada.
- **Portal de acceso:** Paola crea usuario y contraseña para cada empleada desde su ficha. La empleada entra directo a su vista restringida — reforzado tanto por redirección de rutas por rol como por RLS en la base.

## 7. Vencimientos

Módulo solo-admin que agrupa dos funciones distintas:

**a) Vencimientos fiscales de clientes** — calendario configurable por cliente (mensual o anual, con día/fecha de vencimiento y empleada responsable). Genera automáticamente instancias de Trabajo para la empleada asignada (idempotente, no duplica). Vista de lista y vista de calendario, con alertas visuales (vencido / hoy / próximos 7 días). Las empleadas no entran a este módulo — ven el trabajo resultante en "Mis Trabajos".

**b) Gastos de Paola (personales y del estudio)** — categorías libres que ella misma crea. Gastos recurrentes (luz, tarjetas, etc.) sin importe fijo: se carga al pagar cada mes y el sistema calcula solo el próximo vencimiento. Gastos únicos sin recurrencia. Historial con cortes por categoría, por gasto específico, mensual y anual, más un gráfico de torta de distribución. El dashboard alerta si hay un gasto vencido sin pagar.

## 8. Proveedores y Gastos

ABM de proveedores — CUIT opcional, admite un gasto suelto sin proveedor formal (concepto libre, para tickets menores). Compras con múltiples medios de pago (transferencia, efectivo, cheque). Cuenta corriente por proveedor (`v_cuenta_corriente_proveedores`, mismo patrón que la de clientes) e historial de pagos expandible por cada compra.

## 9. Reportes y Dashboard

**Dashboard** con vista diferenciada por rol:

- **Admin:** ingresos desagregados en negro (Factura C + Presupuesto), facturado a cliente neto y IVA facturado; resultado mensual del estudio (ingresos cruzados contra sueldos, pagos a proveedores y gastos del estudio); deuda total y clientes deudores; cola de facturación pendiente; alerta de gastos personales/del estudio vencidos sin pagar.
- **Empleada:** resumen personal — sus trabajos pendientes, sus puntos del mes, sus próximos vencimientos asignados.

**`/reportes`** (solo admin): ingresos por tipo de trabajo y por empleada, selector de año, comparativo entre dos períodos elegidos, filtro combinado por mes y año.

## 10. Usuarios y Accesos

Roles `admin` / `empleada` con seguridad real en RLS (no solo ocultamiento de UI), reforzada por redirección de rutas (`src/proxy.ts`) para que una empleada que navegue directo a una URL admin-only no vea una pantalla rota.

Audit log aplicado a las tablas sensibles (clientes, honorarios, cobranzas, empleadas, liquidaciones, pagos, proveedores, vencimientos) a nivel de base de datos (triggers + tabla `audit_log`), como red de seguridad silenciosa. La pantalla de consulta en Configuración se sacó el 2026-08-13 — Paola no la necesitaba — pero el registro sigue corriendo por si algún día hace falta reconstruir qué pasó.

Sistema de parámetros configurables (`parametros`) para no hardcodear listas de valores: tipos de servicio, comprobante, gasto, conceptos de liquidación de empleadas, etc.

---

## Scope adicional no cotizado en la propuesta original

Estas funcionalidades están en producción pero no figuraban en los 10 módulos de `Propuesta Paola.docx.md` — Paola no las pagó explícitamente, surgieron durante el desarrollo:

- Portal de acceso propio para empleadas (login independiente + autogestión de sus trabajos)
- Sistema completo de puntos y comisiones (config por cliente/tipo de trabajo, cuenta corriente de puntaje, premio por supervisión, comisión por producción y por hora)
- Motor de flujo de trabajo con estados y aprobaciones (vencimiento → trabajo → aprobación → cola de facturación → cuenta corriente), más allá del calendario simple originalmente previsto
- Calendario visual de vencimientos (además de la vista de lista)
- Gestión de gastos recurrentes y categorías propias de Paola, separada del módulo de Proveedores
- Sistema de parámetros configurables como capa de arquitectura
- Dashboard con vista diferenciada por rol (la propuesta hablaba de un dashboard único)
