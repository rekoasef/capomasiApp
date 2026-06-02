# Cambios en Cobranzas — Reunión con Paola (2026-05-12)

Documento de planificación. Define los cuatro cambios que surgieron de la reunión con la clienta (transcripción + WhatsApp del 12/5) y el flujo de trabajo resultante.

**Alcance:** módulo de Liquidaciones, Cobranzas y Cuenta Corriente. No toca otros módulos.

---

## 1. Contexto y decisiones acordadas

### 1.1 Lo que pidió Paola

1. **Distinguir importe liquidado e importe facturado.**
2. **Numeración automática de presupuestos** (último número + 1).
3. **Conteo automático de recibos** con **dos series separadas**: una para facturas A, otra para presupuestos + facturas C.
4. **Pre-cargado del mes anterior** al crear un honorario mensual nuevo.

### 1.2 Decisiones tomadas (Renzo, 12/5)

| Tema | Decisión |
|---|---|
| Liquidaciones existentes en DB | Son ficticias. **Se borran**, no se migran. |
| Número inicial de presupuestos | Empieza en **100**. |
| Número inicial de recibos (cada serie) | Empieza en **100**. |
| Pago mixto (un recibo que paga Factura A + Presupuesto al mismo tiempo) | **Pendiente de confirmar con Paola.** |
| Factura B | No la usa. Solo Factura A, Factura C y Presupuesto. |

---

## 2. Estado actual del sistema

### 2.1 Schema (migración `0008_cobranzas.sql` + `0015_recibos_imputaciones.sql`)

**Tabla `liquidaciones`** — ya tiene las columnas necesarias:
- `importe_liquidado NUMERIC(14,2) NOT NULL`
- `importe_facturado NUMERIC(14,2)` (opcional hoy)
- `tipo_comprobante TEXT` (libre)
- `nro_comprobante TEXT` (libre)

**Tabla `recibos`** — numeración manual opcional:
- `numero_recibo TEXT` (sin serie, sin auto-generación)

### 2.2 Bugs latentes detectados

| Lugar | Problema |
|---|---|
| `v_cuenta_corriente` | Usa `SUM(l.importe_liquidado)` para `total_devengado`. Debe usar `importe_facturado`, que es lo que el cliente debe pagar. |
| `fn_recalcular_estado_liquidacion` | Compara imputado contra `importe_liquidado`. Debe comparar contra `importe_facturado`. |
| `fn_imputar_recibo` | Mismo problema al calcular `v_pendiente_liq`. |
| `liquidacionSchema` (Zod) | `importe_facturado` es opcional. Debe ser obligatorio (o derivado). |
| Form de liquidación | No distingue UX entre liquidado y facturado. |

---

## 3. Cambios a implementar

Ordenados por dependencia.

### Cambio 1 — Separar importe liquidado del facturado

**Regla de negocio:**
- `importe_liquidado` = honorario sin IVA. Sirve para estadísticas y reportes internos.
- `importe_facturado` = lo que el cliente paga. Es la base de la cuenta corriente.
- Relación según `tipo_comprobante`:
  - `FACTURA_A` → `facturado = liquidado × 1.21`
  - `FACTURA_C` → `facturado = liquidado`
  - `PRESUPUESTO` → `facturado = liquidado`

**DB (migración nueva `0018_cobranzas_facturado.sql`):**
- Hacer `importe_facturado NOT NULL` (después de borrar las liquidaciones ficticias).
- Modificar view `v_cuenta_corriente`: cambiar `SUM(l.importe_liquidado)` por `SUM(l.importe_facturado)` en `total_devengado`.
- Modificar `fn_recalcular_estado_liquidacion`: usar `importe_facturado` para comparar contra el total imputado.
- Modificar `fn_imputar_recibo`: idem.
- **No hace falta agregar columnas nuevas, ya existen.**

**Service (`liquidacionesService.create`):**
- Recibe `importe_liquidado` y `tipo_comprobante` del formulario.
- Calcula `importe_facturado` antes de insertar según la regla de arriba.
- (Opcional) exponer función pura `calcularImporteFacturado(liquidado, tipoComprobante)` y testearla.

**Zod (`liquidacionSchema`):**
- `importe_facturado` deja de venir del form (se calcula en el service).
- `tipo_comprobante` pasa a obligatorio y se restringe con `z.enum(['FACTURA_A', 'FACTURA_C', 'PRESUPUESTO'])`.

**UI (`TrabajoForm` / form de liquidación):**
- Input único: "Importe (sin IVA)" → `importe_liquidado`.
- Selector `tipo_comprobante`: Factura A, Factura C, Presupuesto.
- **Vista previa** debajo: "Total a facturar al cliente: $X" (calculado en vivo con el mismo helper).

**Tests críticos:**
- `calcularImporteFacturado(100000, 'FACTURA_A')` → `121000`.
- `calcularImporteFacturado(100000, 'FACTURA_C')` → `100000`.
- `calcularImporteFacturado(100000, 'PRESUPUESTO')` → `100000`.
- Redondeo a 2 decimales.
- Cuenta corriente: dos liquidaciones (una FA $100 y un Presupuesto $50) → `total_devengado = 121 + 50 = 171`.

---

### Cambio 2 — Numeración automática de presupuestos

**Aplica solo cuando `tipo_comprobante = 'PRESUPUESTO'`.** Facturas A y C llevan número manual (vienen de AFIP).

**DB (mismo `0018_cobranzas_facturado.sql` o nueva `0019_secuencias.sql`):**

Tabla genérica de secuencias:

```sql
CREATE TABLE secuencias (
  codigo         TEXT PRIMARY KEY,
  ultimo_numero  INT NOT NULL,
  descripcion    TEXT,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO secuencias (codigo, ultimo_numero, descripcion) VALUES
  ('PRESUPUESTO', 99, 'Presupuestos (negro). Próximo = 100.'),
  ('RECIBO_A',    99, 'Recibos de facturas A. Próximo = 100.'),
  ('RECIBO_X',    99, 'Recibos de presupuestos y facturas C. Próximo = 100.');
```

Función con `FOR UPDATE` para evitar race conditions:

```sql
CREATE OR REPLACE FUNCTION fn_siguiente_numero(p_codigo TEXT)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE v_proximo INT;
BEGIN
  UPDATE secuencias
     SET ultimo_numero = ultimo_numero + 1,
         updated_at = NOW()
   WHERE codigo = p_codigo
  RETURNING ultimo_numero INTO v_proximo;

  IF v_proximo IS NULL THEN
    RAISE EXCEPTION 'Secuencia % no existe', p_codigo;
  END IF;
  RETURN v_proximo;
END;
$$;
```

**RLS:** solo admin escribe directo en `secuencias`. La función es `SECURITY DEFINER` para que cualquier autenticado pueda pedir un número vía RPC.

**Service (`liquidacionesService.create`):**
- Si `tipo_comprobante = 'PRESUPUESTO'` y `nro_comprobante` viene vacío:
  - Llamar `supabase.rpc('fn_siguiente_numero', { p_codigo: 'PRESUPUESTO' })`.
  - Formatear como `'X-' + número.padStart(4, '0')` (ej: `X-0100`). El prefijo `X-` es convención; si Paola usa otro formato lo definimos antes de implementar.

**UI:**
- Cuando el usuario selecciona `Presupuesto`, el campo "Número" se deshabilita y muestra "Se genera automáticamente al guardar".
- Cuando selecciona `Factura A` o `Factura C`, el campo "Número" es libre y requerido (lo trae de AFIP).

**Tests:**
- Llamadas concurrentes a `fn_siguiente_numero('PRESUPUESTO')` devuelven números distintos (test de concurrencia con DB real, no mock).
- Service: crear presupuesto sin número → guarda con `X-0100`.
- Service: crear Factura A sin número → falla con `VALIDATION_ERROR`.

---

### Cambio 3 — Dos series de numeración de recibos

**Mismo mecanismo que presupuestos pero en `recibos`.** Las series ya quedan creadas en la migración del Cambio 2 (`RECIBO_A` y `RECIBO_X`).

**DB (misma migración `0019_secuencias.sql`):**
- Agregar columna `serie_recibo TEXT CHECK (serie_recibo IN ('A','X'))` a `recibos`.
- Modificar `fn_registrar_recibo` para:
  1. Determinar la serie a partir de las imputaciones recibidas:
     - Si todas las imputaciones son a liquidaciones `FACTURA_A` → serie `A`.
     - Si todas son a `FACTURA_C` o `PRESUPUESTO` → serie `X`.
     - Si **mezcla** ambos tipos → **error** (hasta confirmar con Paola, ver §5).
  2. Llamar `fn_siguiente_numero('RECIBO_' || serie)` y asignar a `numero_recibo`.
  3. Si no hay imputaciones (recibo a saldo de cliente sin imputar) → exigir que el usuario elija serie manualmente.

**Service (`recibosService.create`):**
- El front no decide la serie. Paga las imputaciones y el RPC determina la serie y el número.

**UI:**
- En el form de "Registrar pago", el campo "Número de recibo" se quita o queda en modo "se asigna al guardar".
- Una vez guardado, el toast muestra el número generado: "Recibo A-0100 creado".

**Tests:**
- Imputaciones solo a FA → genera serie `A`, número 100.
- Imputaciones solo a Presupuesto → genera serie `X`, número 100.
- Imputaciones mixtas → error (mientras no se aclare).
- Serie `A` y serie `X` mantienen numeradores independientes.

---

### Cambio 4 — Pre-cargado del último honorario mensual

**UX puro, sin schema.**

**Service:**
- Agregar `liquidacionesService.getUltimoHonorarioMensual(clienteId)`:
  - `SELECT * FROM liquidaciones WHERE cliente_id = X AND tipo_servicio = 'HONORARIO_MENSUAL' AND estado <> 'ANULADA' ORDER BY fecha_liquidacion DESC LIMIT 1`.
- Devuelve `null` si no hay (cliente nuevo).

**Hook:**
- `useUltimoHonorarioMensual(clienteId)` (React Query, `enabled` cuando hay cliente y tipo).

**UI (form de liquidación):**
- Cuando se elige `tipo_servicio = HONORARIO_MENSUAL` y un cliente, se dispara la consulta.
- Si hay último, pre-cargar:
  - `importe_liquidado` ← mismo monto.
  - `tipo_comprobante` ← mismo tipo.
  - `generado_por` ← misma empleada.
  - `periodo_mes` ← mes siguiente al último (con rollover de año).
  - `periodo_anio` ← idem.
  - `fecha_liquidacion` ← hoy.
- Todos los campos quedan editables. Mostrar un banner sutil: "Datos sugeridos desde el último honorario mensual de este cliente — editá si cambió algo".

**Tests:**
- Función pura `siguientePeriodo({ mes: 'DICIEMBRE', anio: 2025 })` → `{ mes: 'ENERO', anio: 2026 }`.
- Hook: si no hay último, no rompe el form.

---

## 4. Flujo de trabajo de Paola (nuevo)

### 4.1 Cargar el honorario mensual de un cliente (escenario más frecuente)

1. Paola entra al detalle del cliente "El Almacén SRL", pestaña **Liquidaciones**.
2. Click en **Nueva liquidación**. Elige `Tipo de servicio: HONORARIO_MENSUAL`.
3. El sistema detecta que hay un honorario mensual previo (mayo 2026, $50.000, Factura A, generado por María) y **pre-carga**:
   - Período: Junio 2026
   - Importe: $50.000
   - Tipo: Factura A
   - Generado por: María
4. Paola revisa. Como subió el honorario, **edita el importe a $52.000**. Lo demás queda igual.
5. La UI muestra **abajo en vivo**: *"Total a facturar al cliente: $62.920"* (52.000 × 1.21).
6. Como es Factura A, el campo **Número** está habilitado: Paola lo copia del AFIP (`0001-00012345`).
7. Click **Guardar**. Se crea la liquidación con `liquidado=52.000`, `facturado=62.920`, `tipo=FACTURA_A`, `nro=0001-00012345`.
8. La cuenta corriente del cliente sube en **$62.920** (no en $52.000).

### 4.2 Cargar un presupuesto (negro)

1. Mismo flujo, pero elige `Tipo comprobante: PRESUPUESTO`.
2. El campo **Número** se deshabilita y muestra "Se asigna al guardar".
3. Paola pone importe $30.000. Vista previa: *"Total a facturar: $30.000"* (sin IVA).
4. Click **Guardar**. Sistema asigna `nro_comprobante = X-0100`.
5. La cuenta corriente sube en $30.000.

### 4.3 Cobrar un servicio (con recibo automático)

1. Cliente paga $62.920 por transferencia (correspondiente a la Factura A del paso 4.1).
2. Paola entra a **Cobranzas → Registrar pago**, elige el cliente, importe $62.920, tipo Transferencia.
3. En la sección "Imputaciones" elige la liquidación de Factura A.
4. Click **Guardar**.
5. El sistema detecta que la imputación es 100% a Factura A → asigna serie `A`, número `A-0100`.
6. Toast: *"Recibo A-0100 creado"*.
7. La liquidación pasa a `COBRADA`. La cuenta corriente baja en $62.920.

### 4.4 Cobrar un presupuesto

- Igual al 4.3, pero al imputar al presupuesto el sistema asigna `X-0100` (serie independiente).

### 4.5 Cobrar mezcla (pendiente confirmar — ver §5)

- Si Paola cobra de una vez una Factura A + un Presupuesto, el sistema hoy daría error.
- Posibles soluciones (a decidir con ella):
  - **A)** Forzar a registrar dos recibos separados.
  - **B)** Generar un recibo con doble numeración (A-0100 + X-0100 a la vez).
  - **C)** La serie la elige Paola manualmente y queda como recibo "informal".

---

## 5. Pendiente de confirmar con Paola

| # | Tema | Pregunta |
|---|---|---|
| 1 | Pago mixto | ¿Puede un mismo pago cubrir una Factura A y un Presupuesto a la vez? Si sí, ¿qué número de recibo le pone? |
| 2 | Formato de número de presupuesto | ¿`X-0100`, `P-0100`, `0100`, `000100`? |
| 3 | Formato de número de recibo | ¿`A-0100` / `X-0100` o algo distinto? |
| 4 | Recibo "a cuenta" (sin imputación) | Si entra plata sin saber a qué imputarla, ¿qué serie le pone? |
| 5 | Período "Honorario Mensual" | El sistema hoy guarda `periodo_mes` como texto libre. ¿Estandarizamos a `ENERO..DICIEMBRE` o usamos número? |

---

## 6. Plan de ejecución

1. **Limpieza:** borrar las liquidaciones, recibos e imputaciones ficticias (decisión Renzo).
2. **Migración `0018_cobranzas_facturado.sql`:**
   - `importe_facturado NOT NULL`.
   - Fix `v_cuenta_corriente`, `fn_recalcular_estado_liquidacion`, `fn_imputar_recibo`.
3. **Migración `0019_secuencias.sql`:**
   - Tabla `secuencias` + `fn_siguiente_numero`.
   - Seed `PRESUPUESTO=99`, `RECIBO_A=99`, `RECIBO_X=99`.
   - Columna `serie_recibo` en `recibos`.
   - Update de `fn_registrar_recibo`.
4. **Service + Zod:**
   - `calcularImporteFacturado` (función pura + tests).
   - `liquidacionesService.create` calcula facturado y pide número automático si es presupuesto.
   - `liquidacionesService.getUltimoHonorarioMensual`.
5. **Hooks:**
   - `useUltimoHonorarioMensual`.
6. **UI:**
   - Form de liquidación: input liquidado, selector comprobante, preview facturado, número condicional.
   - Form de recibo: quitar número manual, mostrar el generado en el toast.
   - Banner de "sugerido del mes anterior".
7. **Regenerar tipos** (`npm run supabase:types`) tras cada migración.
8. **Validación manual** del flujo §4 completo antes de marcar como ✅.

---

## 7. Referencias

- Transcripción de reunión: 12/5/2026, 00:19-00:24.
- WhatsApp Paola: 12/5/2026 16:54-16:55.
- Migraciones tocadas: `0008_cobranzas.sql`, `0015_recibos_imputaciones.sql`.
- Documentación complementaria: [`GUIA_EXCEL.md`](./GUIA_EXCEL.md), [`DATABASE.md`](./DATABASE.md).
