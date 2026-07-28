# Cheques — Endoso a proveedores y carga manual

Documento funcional. Implementado el 2026-07-27, a partir de una pregunta directa de Renzo repasando la transcripción de la reunión del 16/07 con Paola, donde ella menciona pagarle a un proveedor "sacando de los cheques que tengo en cartera".

---

## 1. Contexto — dos formas distintas de "pagar con cheque"

Antes de esta sesión, la app solo soportaba **emitir un cheque propio** para pagarle a un proveedor (Proveedores → Pagar → tipo de pago "Cheque"). Eso crea una fila en `cheques` con `tipo='PROPIO'`, `origen='EMITIDO'`.

Lo que Paola describió en la reunión es otra cosa: **entregar (endosar) un cheque de un cliente** que ya tiene en cartera, en vez de emitir uno propio. Antes de este cambio, el único soporte para esto era marcar el cheque como estado `ENDOSADO` en Fondos → Cheques — pero ese cambio de estado era puramente cosmético: no pedía a qué proveedor se le entregó, no registraba el pago contra ninguna compra, y el importe seguía contando en `saldo_cheques_cartera` para siempre (a diferencia de `RECHAZADO`/`ANULADO`, que sí revierten el movimiento).

## 2. Endosar cheque a proveedor

**Migración:** `0054_endosar_cheque_a_proveedor.sql` — función `fn_endosar_cheque_a_proveedor(p_cheque_id, p_compra_id, p_importe, p_fecha_pago, p_notas)`.

Qué hace:

1. Valida que el cheque sea `TERCERO` y esté `EN_CARTERA` (si no, error).
2. Valida que el importe a aplicar no supere el importe del cheque.
3. Registra un pago real contra la compra reutilizando `fn_registrar_pago_proveedor` (actualiza el estado de la compra a PAGADA/PARCIAL, y dispara `fn_pago_proveedor_a_fondos`).
4. Marca el cheque como `ENDOSADO` y guarda `proveedor_id`.

**Por qué el saldo queda bien:** el pago genera un EGRESO en `fondos_movimientos` con el mismo `cheque_id` que el INGRESO original (el que se creó cuando se recibió el cheque del cliente). El neto en `saldo_cheques_cartera` para ese cheque queda en 0 — la plata entró y volvió a salir sin tocar nunca el banco, que es lo correcto.

**UI:** `ChequesTable.tsx` (módulo `fondos`). La opción "Endosado" en el selector de estado solo aparece para cheques `TERCERO` (no tiene sentido para uno propio ya emitido). Al elegirla, se abre un formulario: Proveedor → Compra pendiente de ese proveedor → importe a aplicar (tope: importe del cheque) → fecha → notas.

## 3. Carga manual de cheques

Pedido de seguimiento en la misma sesión: ¿puede Paola cargar un cheque que ya tiene en mano, sin pasar por un recibo o un pago? Antes, no — los únicos dos lugares donde se creaba una fila en `cheques` eran efectos secundarios (recibo de cliente → TERCERO, pago a proveedor → PROPIO). Casos de uso: saldos iniciales al migrar del Excel, o un cheque que le dieron por fuera de un recibo formal.

**Migración:** `0055_registrar_cheque_manual.sql` — función `fn_registrar_cheque_manual(p_tipo, p_numero, p_banco, p_importe, p_fecha_emision, p_fecha_cobro, p_cliente_id, p_proveedor_id, p_cuenta_bancaria, p_notas)`.

Crea el cheque **y** el movimiento en Fondos correspondiente (INGRESO a cartera si es de tercero, EGRESO si es propio), para que quede contabilizado igual que los cheques generados automáticamente — las transiciones de estado posteriores (depositar, endosar, rechazar, confirmar acreditación) funcionan igual.

**UI:** botón "Nuevo cheque" en Fondos → Cheques, al lado de los filtros. Formulario: Tipo (De tercero / Propio) → según eso pide Cliente o Proveedor, N° cheque, banco, importe, fecha de emisión, fecha de cobro opcional, notas.

## 4. Detalle técnico — por qué las RPC necesitan `is_admin()` simulado al testear por SQL

Ambas funciones (y `fn_ajustar_saldo_puntaje`, `fn_registrar_pago_proveedor`, etc.) llaman `is_admin()`, que lee `auth.uid()`. Fuera de una sesión autenticada por PostgREST (por ejemplo, corriendo SQL directo vía Supabase MCP `execute_sql`), `auth.uid()` da `NULL` y la función revienta con "Solo admin puede...". Para probar/seedear por SQL directo hay que simular el JWT primero:

```sql
SELECT set_config('request.jwt.claim.sub', '<uuid-del-admin>', false);
```

Ver `scripts/seed-demo-data.sql` para el patrón completo en uso.

## 5. Extra — notas en compras de proveedores

En la misma sesión se detectó que la columna `notas` de `compras_proveedores` existía en la base y en el schema Zod desde antes, pero no estaba expuesta en el formulario "Nueva compra" ni en la tabla. Se agregó el campo al form y un ícono indicador en la fila cuando una compra tiene notas cargadas — sin tocar schema ni service, era puramente un hueco de UI.

## 6. Tests

`src/modules/fondos/__tests__/fondosService.test.ts` (extendido) y `src/modules/fondos/__tests__/fondoSchema.test.ts` (nuevo) — cubren `chequesService.endosarAProveedor`, `chequesService.crearManual` y las validaciones de `chequeManualSchema`. Como es habitual en este proyecto, Jest testea la capa de service (que la RPC se llama con los parámetros correctos, manejo de `ok`/error) — la lógica de negocio real dentro de las funciones PL/pgSQL (validación de estado del cheque, tope de importe, etc.) no tiene cobertura automatizada; se verificó manualmente contra la base real al seedear datos demo (ver `docs/funcional/` — sección de datos demo, o memoria `datos-demo-2026-07-27`).
