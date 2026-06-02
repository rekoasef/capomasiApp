# GUÍA OPERATIVA — Excel original del Estudio

Este documento es la **transcripción de la hoja "GUIA"** del Excel original que la clienta usa para operar el estudio. Es la fuente de verdad sobre cómo Paola **carga la información hoy**, y por lo tanto el espejo que tiene que replicar el sistema.

> Mantenerlo a mano cada vez que se diseñe un módulo. Si una pantalla no se entiende leyendo esto, algo está mal.

---

## 1. BASE DE CLIENTES

Es la **agenda** de clientes.

- Se ingresan datos a partir de la **fecha de alta** del cliente nuevo.
- La columna `N°` se autonumera.
- Para dar de alta: cargar la fecha en la columna B → se incorpora a la tabla.
- Pendiente de revisión: confirmar si las columnas actuales son todas las necesarias (faltan teléfono/email/claves para varios clientes).

---

## 2. FC Y COBRANZAS

Contiene **todos los servicios prestados a clientes**, con o sin comprobante, cobrados o pendientes de cobro.

### Columnas

| Columna | Descripción |
|---|---|
| **Fecha de liquidación** | Fecha en que se "liquida" el servicio. Para mensuales se cargan los **primeros días del mes**. |
| **Cliente** | Dropdown desde la Base de Clientes. |
| **Servicio prestado** | Dropdown desde `PARAMETROS / SERVICIOS PRESTADOS POR EL ESTUDIO`. Se ordenan alfabéticamente. |
| **Período liquidado** | El **mes anterior** al de la Fecha (trabaja a mes vencido). Ej: si el 2/8 se carga un servicio mensual, muestra JULIO. *Duda de la clienta: ¿solo para servicios mensuales?* |
| **Comprobante / Emisor** | Dropdown desde `PARAMETROS / EMISOR`. |

### Medios de cobro (cada liquidación puede combinar varios)

| Medio | Capacidad | Datos cargados |
|---|---|---|
| Transferencias bancarias | hasta **3** | fecha, importe, cuenta bancaria |
| Efectivo | hasta **3** | fecha, importe |
| Cheques | hasta **3** | fecha, importe, número de cheque |
| Dólares | **1** | fecha, importe, TC (tipo de cambio para homogeneizar) |
| Compensaciones | hasta **2** | fecha, importe |

- **Suma de cobranzas por todo medio**: acumula los anteriores.
- **Pendiente**: importe liquidado − total cobrado.
- Hay 3 columnas ocultas que extraen fecha y año para comparativos.

> ⚠️ **Gap detectado vs. el sistema actual**: el módulo `cobranzas` modela `tipo_pago` como `TRANSFERENCIA | EFECTIVO | CHEQUE`. **Faltan `DOLARES` (con TC) y `COMPENSACION` como medios de pago**. También falta vincular `cuenta_bancaria` a las transferencias.

---

## 3. CUENTA CLIENTE

- Se alimenta de **FC y Cobranzas** y resume por cliente el saldo pendiente.
- Se puede exportar a **PDF** para enviárselo al cliente.
- Tiene cuadros de segmentación para filtros.

> En el sistema corresponde a `v_cuenta_corriente` (view). Falta la exportación a PDF.

---

## 4. BASE DE PROVEEDORES

Es la **agenda de proveedores**.

- Se da de alta cargando el nombre en la columna A.
- ⚠️ **Importante**: contemplar un proveedor genérico **"SIN IDENTIFICAR"** o **"XX"** para tickets/comprobantes menores que no tienen proveedor formal.

---

## 5. COMPRAS A PROVEEDORES

Contiene **todas las compras de productos y servicios para el estudio**, con o sin comprobante, pagado o pendiente.

### Columnas

| Columna | Descripción |
|---|---|
| **Tipo** | Tipo de comprobante recibido — `PARAMETROS / COMPROBANTES DE PROV`. |
| **Fecha** | De la compra/pago/liquidación de sueldo. Importante: el gasto impacta en el mes que corresponde según esta fecha. |
| **Proveedor** | Desde `BASE DE PROVEEDORES`. |
| **Rubro** | `PARAMETROS / RUBROS`. Ordenar alfabéticamente. |
| **Detalle** | Texto libre para aclaraciones. |

### Medios de pago

| Medio | Capacidad | Datos |
|---|---|---|
| Transferencia / Débito | hasta **2** | fecha, importe, cuenta bancaria |
| Efectivo | hasta **3** | fecha, importe |
| Cheques emitidos | hasta **2** | fecha emisión, fecha de pago, número, banco, importe |
| Dólares | **1** | fecha, importe, TC |
| Compensaciones | hasta **2** | fecha, importe |

- **TOTAL DE PAGOS REALIZADOS**: suma de todos los medios.
- **ESTADO**: leyenda con saldo pendiente.

> ⚠️ **Gap detectado**: ídem cobranzas — `pagos_proveedores.tipo_pago` solo soporta `TRANSFERENCIA | EFECTIVO | CHEQUE`. Faltan `DOLARES` y `COMPENSACION`. Para cheques **emitidos** además se carga fecha de emisión y banco — verificar que el modelo `cheques` los maneje.

---

## 6. MOVIMIENTO DE FONDOS

Registro general de ingresos, egresos y movimientos internos del estudio.

### Columnas

| Columna | Descripción |
|---|---|
| **Tipo de movimiento** | `INGRESO`, `EGRESO`, `MOVIMIENTO` (interno). Configurables en `PARAMETROS / MOV DE FONDOS`. |
| **Fecha** | Día en que ocurre el movimiento. |
| **Concepto** | Listado en `PARAMETROS / CONCEPTOS PLANILLA DE FONDOS` (saldo inicial, cobranza a clientes, pago a proveedores, etc.). |
| **N° comprob.** | Para rastrear movimientos vinculados a clientes/proveedores. |
| **Bancos** | Columnas celestes, una por cuenta bancaria. **Salidas con signo negativo**. |
| **Efectivo** | Columna amarilla. **Salidas con signo negativo**. |
| **Cheques recibidos** | Al ingreso `+`, al cobrarse `−`. Alimenta cuadro de seguimiento de cheques a cobrar. *Pendiente clienta: ¿se emiten cheques también?* |
| **Dólares** | Billetes o cuenta bancaria en USD. |

### Movimientos internos (una sola fila, varios medios)

- **Depósito de efectivo en cuenta**: efectivo en `−`, banco en `+`.
- **Depositar billete dólar en cuenta dólar**: ídem.
- **Cobrar cheque**: cheque en `−` (sale de la existencia), banco en `+`.

> El sistema actual modela esto como `fondos_movimientos` con `importe_banco`, `importe_efectivo`, `importe_usd`. Para los movimientos internos hay que validar que la UI permita cargar **una sola fila con dos medios** (uno positivo y uno negativo) — no tengo confirmado si el form actual lo soporta.

---

## Gaps detectados (resumen)

| # | Módulo | Gap | Prioridad |
|---|---|---|---|
| 1 | Cobranzas | Faltan medios `DOLARES` (con TC) y `COMPENSACION` | Alta |
| 2 | Cobranzas | Vincular `cuenta_bancaria` al pago por transferencia | Alta |
| 3 | Proveedores | Mismos medios faltantes en `pagos_proveedores` | Alta |
| 4 | Proveedores | Crear proveedor genérico **"SIN IDENTIFICAR"** | Baja |
| 5 | Cuenta cliente | Exportación a PDF | Media |
| 6 | Fondos | Validar carga de movimiento interno (1 fila, 2 medios con signo) | Media |
| 7 | Cobranzas | Definir si `período_liquidado` aplica solo a servicios mensuales | Baja |
