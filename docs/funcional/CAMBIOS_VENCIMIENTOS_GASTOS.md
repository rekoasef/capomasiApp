# Rediseño del módulo Vencimientos + Gastos Personales

Documento de planificación. Define el rediseño del módulo Vencimientos para que se convierta en un gestor de **gastos de Paola** (recurrentes y únicos) organizados por **categorías que ella crea libremente**.

**Alcance:** módulo Vencimientos (rediseño total) + sustitución del prototipo `gastosPersonalesService` actual.

**No incluido (diferido):** integración con `fondos_movimientos` (descontar pagos de la caja). Vencimientos automáticos de clientes/AFIP/estudio se posponen.

---

## 1. Decisiones acordadas (Renzo + Paola, 2026-05-12)

| Tema | Decisión |
|---|---|
| Ámbitos `CLIENTE` / `ESTUDIO` / `PERSONAL` | **Se eliminan.** El módulo arranca solo con lo que Paola cree. Vencimientos automáticos de clientes/estudio se ven más adelante. |
| Categorías | Las crea **Paola libremente** (no hay lista cerrada). |
| Tipos de gasto | **Recurrente** (mensual, con día de vencimiento) o **único** (sin vencimiento, se carga directo como pago). |
| Importe | **No se carga al crear el gasto.** Se carga **al pagar**, porque el monto cambia mes a mes (luz, gas). |
| Materialización de vencimientos recurrentes | **Opción 1: solo existe el próximo vencimiento.** Cuando se paga, se calcula el del mes siguiente. No se materializan los futuros. |
| Historial | Cortes mensual y anual, por categoría y por gasto específico. |
| Integración con fondos | **Diferida.** No toca `fondos_movimientos` por ahora. |
| Acceso | **Solo admin.** Las empleadas no ven este módulo. |
| Pago anticipado | Si paga antes de la fecha de vencimiento, **el próximo vencimiento avanza igual al mes siguiente**. Pagar antes no acorta el ciclo. |
| Saltear vencimientos | **No se permite.** Cada mes corresponde su pago. No hay botón "marcar como omitido". |
| Comprobantes | **Sin adjuntar archivos.** Campo opcional `comprobante_url` para pegar un link (ej: a Google Drive). No obligatorio. |
| Editar pagos | **Permitido**, por si se carga mal. Queda registrado en `audit_log`. |
| Borrar categorías con gastos asociados | **Bloqueado.** Se ofrece la alternativa de "desactivar" la categoría para preservar el historial. |
| Medios de pago | **Lista cerrada**: `TRANSFERENCIA`, `EFECTIVO`, `CHEQUE`, `TARJETA`. Se saca `USD` (no aplica para gastos personales locales) y se suma `TARJETA` (cuotas, débitos automáticos). |

---

## 2. Estado actual del sistema (lo que hay que tirar)

### 2.1 Schema actual

**Migración `0012_vencimientos.sql`:**
- Tabla `vencimientos` con `ambito` (`CLIENTE`/`ESTUDIO`/`PERSONAL`), `tipo_vencimiento` (lista cerrada AFIP, IIBB, etc.), `completado` (boolean), referencias a `clientes` y `empleadas`.
- RLS: lo personal solo admin, el resto todos los autenticados.

**Servicio prototipo `gastosPersonalesService.ts`:**
- Tabla `gastos_personales` **que no existe en ninguna migración** (referencia muerta en código).
- Modelo simple: concepto, fecha_pago, medio_pago, importe, notas. Sin categorías, sin recurrencia.

### 2.2 Qué se elimina

- Tabla `vencimientos` (DROP completo).
- Tabla `gastos_personales` (no existía en DB, pero el código de service/schema/types va a basurero).
- Componentes `VencimientosOverview.tsx`, `GastosPersonalesPanel.tsx`.
- Tipos `TVencimiento`, `TAmbitoVencimiento`, `TIPOS_VENCIMIENTO`, `TGastoPersonal`.

**Justificación:** el modelo viejo no representa el flujo real de Paola. Reescribir desde cero es más barato que adaptar.

---

## 3. Modelo nuevo

### 3.1 Tablas

```sql
-- Categorías libres que Paola crea
CREATE TABLE categorias_gastos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL UNIQUE,
  color       TEXT,                     -- opcional, para UI (#FF5733 o tag de Tailwind)
  created_by  UUID REFERENCES usuarios(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Gastos recurrentes (luz, gas, tarjeta). NO tienen importe.
CREATE TABLE gastos_recurrentes (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id               UUID NOT NULL REFERENCES categorias_gastos(id),
  descripcion                TEXT NOT NULL,                -- "Luz", "Tarjeta Visa"
  dia_vencimiento            INT NOT NULL CHECK (dia_vencimiento BETWEEN 1 AND 31),
  proxima_fecha_vencimiento  DATE NOT NULL,                -- calculada al crear y al pagar
  activo                     BOOLEAN NOT NULL DEFAULT TRUE,
  notas                      TEXT,
  created_by                 UUID REFERENCES usuarios(id),
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pagos: una sola tabla para los dos flujos (recurrentes y únicos)
CREATE TABLE pagos_gastos (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id            UUID NOT NULL REFERENCES categorias_gastos(id),
  gasto_recurrente_id     UUID REFERENCES gastos_recurrentes(id),  -- NULL si es único
  concepto                TEXT NOT NULL,                            -- "Luz Mayo 2026" o "Service del auto"
  fecha_pago              DATE NOT NULL,
  medio_pago              TEXT NOT NULL CHECK (medio_pago IN ('TRANSFERENCIA','EFECTIVO','CHEQUE','TARJETA')),
  importe                 NUMERIC(14,2) NOT NULL CHECK (importe > 0),
  fecha_vencimiento_pagado DATE,                                    -- opcional: a qué vencimiento corresponde
  comprobante_url         TEXT,                                     -- opcional: link a Drive u otro
  notas                   TEXT,
  created_by              UUID REFERENCES usuarios(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**RLS:** todas las tablas son **solo admin** (lectura y escritura).

### 3.2 Lógica clave: avanzar el próximo vencimiento al pagar

Cuando se registra un pago de un gasto recurrente, se actualiza `proxima_fecha_vencimiento` al mes siguiente, respetando el `dia_vencimiento`.

```sql
CREATE OR REPLACE FUNCTION fn_avanzar_vencimiento(p_gasto_id UUID)
RETURNS DATE
LANGUAGE plpgsql
AS $$
DECLARE
  v_gasto      gastos_recurrentes;
  v_proximo    DATE;
BEGIN
  SELECT * INTO v_gasto FROM gastos_recurrentes WHERE id = p_gasto_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Gasto recurrente no encontrado';
  END IF;

  -- Próxima fecha: mismo día, mes siguiente. Si el día no existe (ej: 31 en febrero), tomar el último día del mes.
  v_proximo := make_date(
    EXTRACT(YEAR  FROM v_gasto.proxima_fecha_vencimiento + INTERVAL '1 month')::INT,
    EXTRACT(MONTH FROM v_gasto.proxima_fecha_vencimiento + INTERVAL '1 month')::INT,
    LEAST(
      v_gasto.dia_vencimiento,
      EXTRACT(DAY FROM (date_trunc('month', v_gasto.proxima_fecha_vencimiento + INTERVAL '2 month') - INTERVAL '1 day'))::INT
    )
  );

  UPDATE gastos_recurrentes
     SET proxima_fecha_vencimiento = v_proximo
   WHERE id = p_gasto_id;

  RETURN v_proximo;
END;
$$;
```

### 3.3 RPC: registrar pago

```sql
CREATE OR REPLACE FUNCTION fn_registrar_pago_gasto(
  p_categoria_id        UUID,
  p_concepto            TEXT,
  p_fecha_pago          DATE,
  p_medio_pago          TEXT,
  p_importe             NUMERIC,
  p_gasto_recurrente_id UUID DEFAULT NULL,
  p_notas               TEXT DEFAULT NULL
)
RETURNS pagos_gastos
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pago             pagos_gastos;
  v_fecha_venc       DATE;
BEGIN
  -- Si es pago de recurrente, capturar la fecha de vencimiento actual antes de avanzar
  IF p_gasto_recurrente_id IS NOT NULL THEN
    SELECT proxima_fecha_vencimiento INTO v_fecha_venc
      FROM gastos_recurrentes WHERE id = p_gasto_recurrente_id;
  END IF;

  INSERT INTO pagos_gastos (
    categoria_id, gasto_recurrente_id, concepto, fecha_pago, medio_pago,
    importe, fecha_vencimiento_pagado, notas, created_by
  ) VALUES (
    p_categoria_id, p_gasto_recurrente_id, p_concepto, p_fecha_pago, p_medio_pago,
    p_importe, v_fecha_venc, p_notas, auth.uid()
  )
  RETURNING * INTO v_pago;

  -- Si era recurrente, avanzar el próximo vencimiento
  IF p_gasto_recurrente_id IS NOT NULL THEN
    PERFORM fn_avanzar_vencimiento(p_gasto_recurrente_id);
  END IF;

  RETURN v_pago;
END;
$$;
```

### 3.4 Views auxiliares

```sql
-- Próximos vencimientos (todos los gastos recurrentes activos, con su próxima fecha)
CREATE OR REPLACE VIEW v_proximos_vencimientos AS
SELECT
  g.id                          AS gasto_id,
  g.descripcion,
  g.proxima_fecha_vencimiento,
  g.dia_vencimiento,
  c.id                          AS categoria_id,
  c.nombre                      AS categoria_nombre,
  c.color                       AS categoria_color,
  (g.proxima_fecha_vencimiento - CURRENT_DATE) AS dias_restantes
FROM gastos_recurrentes g
JOIN categorias_gastos c ON c.id = g.categoria_id
WHERE g.activo = TRUE
ORDER BY g.proxima_fecha_vencimiento;

-- Historial de pagos con info de categoría y gasto
CREATE OR REPLACE VIEW v_pagos_gastos_detalle AS
SELECT
  p.id,
  p.concepto,
  p.fecha_pago,
  p.medio_pago,
  p.importe,
  p.notas,
  p.fecha_vencimiento_pagado,
  c.id                AS categoria_id,
  c.nombre            AS categoria_nombre,
  c.color             AS categoria_color,
  g.id                AS gasto_recurrente_id,
  g.descripcion       AS gasto_descripcion,
  EXTRACT(YEAR  FROM p.fecha_pago) AS anio,
  EXTRACT(MONTH FROM p.fecha_pago) AS mes
FROM pagos_gastos p
JOIN categorias_gastos c ON c.id = p.categoria_id
LEFT JOIN gastos_recurrentes g ON g.id = p.gasto_recurrente_id;
```

---

## 4. Flujo de trabajo de Paola

### 4.1 Configuración inicial (una sola vez)

1. Entra a **Vencimientos → Categorías** y crea las que quiera: *Servicios*, *Tarjetas*, *Auto*, *Casa*, *Salud*, etc.
2. Cada categoría puede tener un color para distinguirla visualmente.

### 4.2 Crear un gasto recurrente

1. En **Vencimientos → Gastos recurrentes**, click **"Nuevo gasto"**.
2. Completa: categoría (*Servicios*), descripción (*Luz*), día de vencimiento (*25*).
3. **El sistema calcula la próxima fecha de vencimiento** (próximo día 25 que venga).
4. Guarda. A partir de ahí, *Luz* aparece en el panel de próximos vencimientos.

### 4.3 Pagar un gasto recurrente

1. En el panel principal de Vencimientos, Paola ve la lista de lo que vence pronto, agrupada/filtrable por categoría.
2. Click en *Luz - vence 25/05/2026* → botón **"Marcar pagado"**.
3. Se abre el form: fecha de pago, medio de pago, importe, notas.
4. Guarda. El sistema:
   - Crea el registro en `pagos_gastos`.
   - Actualiza `proxima_fecha_vencimiento` a 25/06/2026.
5. *Luz* desaparece del panel hasta que se acerque el 25/06.

### 4.4 Cargar un gasto único / suelto

1. Paola va a **Vencimientos → Añadir pago** (botón siempre visible).
2. Completa: concepto (*Service del auto*), categoría (*Auto*), fecha de pago, medio, importe, notas.
3. **No tilda nada de "recurrente".**
4. Guarda. Va directo a `pagos_gastos` con `gasto_recurrente_id = NULL`. Aparece en el historial.

### 4.5 Ver el historial / reportes

1. **Vencimientos → Historial.**
2. Filtros: rango de fechas, categoría, gasto específico.
3. Cortes:
   - **Total del año por categoría.** *"Servicios 2026: $1.250.000".*
   - **Total del año por gasto.** *"Luz 2026: $480.000".*
   - **Mensual por gasto.** *"Luz: Ene $35k, Feb $38k, Mar $42k…"*.
4. Lista detallada de pagos con concepto, fecha, importe, medio.

### 4.6 Editar el día de vencimiento

- Paola entra al gasto *Luz* y cambia el día de vencimiento de 25 a 28.
- El sistema recalcula `proxima_fecha_vencimiento` al próximo día 28 que venga.
- Los pagos ya hechos quedan intactos en el historial.

### 4.7 Pausar / desactivar un gasto

- Si Paola se cambia de proveedor y deja de pagar *Internet*, marca el gasto como **inactivo** (no lo borra, para no perder el historial).
- Deja de aparecer en próximos vencimientos. El historial sigue accesible.

---

## 5. Cambios en código (resumen)

### 5.1 Migraciones nuevas

| Archivo | Contenido |
|---|---|
| `0018_drop_vencimientos_viejos.sql` | DROP de `vencimientos` (la tabla actual) y limpieza. |
| `0019_gastos_categorias.sql` | Tablas `categorias_gastos`, `gastos_recurrentes`, `pagos_gastos`, funciones, views, RLS. |

### 5.2 Módulo `src/modules/vencimientos/`

**Se reescribe completo.**

- `types/index.ts` — `TCategoriaGasto`, `TGastoRecurrente`, `TPagoGasto`, `TPagoGastoDetalle`, `TProximoVencimiento`.
- `schemas/` — Zod schemas para los tres formularios (categoría, gasto recurrente, pago).
- `services/` — `categoriasGastosService`, `gastosRecurrentesService`, `pagosGastosService` (con `getHistorial`, `getResumenAnual`, `getResumenPorCategoria`).
- `hooks/` — hooks de React Query para cada service.
- `components/` — `CategoriasManager`, `GastosRecurrentesPanel`, `ProximosVencimientosPanel`, `RegistrarPagoForm`, `HistorialPagos`, `ResumenCategoria`.

### 5.3 Eliminar

- Service `gastosPersonalesService.ts` (modelo viejo).
- Schema `gastoPersonalSchema.ts`.
- Tipo `TGastoPersonal`, `TAmbitoVencimiento`, constantes `AMBITO_LABEL`, `TIPOS_VENCIMIENTO`.
- Componentes `VencimientosOverview.tsx`, `GastosPersonalesPanel.tsx` (se reemplazan).

### 5.4 Permisos

- Toda la sección del sidebar de Vencimientos solo se muestra a admin.
- RLS bloquea acceso de empleadas a nivel DB también.

---

## 6. Pendientes

Ninguno. Todas las decisiones cerradas en §1. Listo para implementar.

---

## 7. Plan de ejecución

1. **Confirmar pendientes** con Paola (sección 6).
2. **Migración `0018`**: drop de `vencimientos` actual.
3. **Migración `0019`**: tablas nuevas + funciones + views + RLS.
4. **Regenerar tipos** (`npm run supabase:types`).
5. **Reescribir módulo `vencimientos/`** completo desde el types/schemas hacia arriba.
6. **UI**: panel de próximos vencimientos, gestor de categorías, gestor de gastos recurrentes, form de pago, historial con filtros y resúmenes.
7. **Tests**:
   - `fn_avanzar_vencimiento` con edge cases (día 31 → febrero da 28/29).
   - Service de pagos: avanza vencimiento correctamente.
   - Resumen anual: suma por categoría y por gasto.
8. **Validación manual** del flujo §4 completo antes de marcar como ✅.

---

## 8. Referencias

- Conversación Renzo-Paola del 2026-05-12.
- Migración a reemplazar: `0012_vencimientos.sql`.
- Código a eliminar: `gastosPersonalesService.ts`, `gastoPersonalSchema.ts`, `VencimientosOverview.tsx`, `GastosPersonalesPanel.tsx`.
- Documentación complementaria: [`CAMBIOS_COBRANZAS.md`](./CAMBIOS_COBRANZAS.md) (mismo formato), [`DATABASE.md`](./DATABASE.md).
