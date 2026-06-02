# Documentación de Base de Datos
## Sistema de Gestión Integral — Estudio Contable Capomasi

---

## 1. Stack y Configuración

- **Motor:** PostgreSQL 15 (Supabase Cloud)
- **Auth:** Supabase Auth (tabla `auth.users` gestionada por Supabase)
- **Seguridad:** Row Level Security (RLS) habilitado en **todas** las tablas
- **Auditoría:** Tabla `audit_log` + triggers en tablas sensibles
- **PKs:** UUID v4 en todas las tablas
- **Soft delete:** Columna `deleted_at TIMESTAMPTZ` en entidades críticas

---

## 2. Esquema General

```
auth.users (Supabase managed)
    │
    └── usuarios (perfil + rol)
         │
         ├── clientes ──────────────────── claves_clientes
         │    │
         │    ├── honorarios_mensuales
         │    ├── honorarios_anuales
         │    ├── liquidaciones ──────────── pagos ── cheques
         │    └── vencimientos
         │
         ├── empleadas
         │    ├── liquidaciones_empleadas ── pagos_empleadas
         │    └── vencimientos
         │
         ├── proveedores
         │    └── compras_proveedores ────── pagos_proveedores ── cheques
         │
         ├── fondos_movimientos ─────────── cheques
         │
         ├── parametros
         │
         └── audit_log
```

---

## 3. Tablas

### 3.1 `usuarios`
Perfil de usuario del sistema. Vinculado 1:1 con `auth.users`.

```sql
CREATE TABLE usuarios (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  rol         TEXT NOT NULL CHECK (rol IN ('admin', 'empleada')),
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | FK → `auth.users.id` |
| `nombre` | TEXT | Nombre completo del usuario |
| `email` | TEXT | Email de login |
| `rol` | TEXT | `admin` o `empleada` |
| `activo` | BOOLEAN | Para deshabilitar sin borrar |

---

### 3.2 `clientes`
Base de datos de clientes del estudio.

```sql
CREATE TABLE clientes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre            TEXT NOT NULL,
  cuit              TEXT NOT NULL UNIQUE,
  domicilio         TEXT,
  telefono          TEXT,
  email             TEXT,
  localidad         TEXT,
  responsable_id    UUID REFERENCES usuarios(id),
  notas             TEXT,
  activo            BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clientes_nombre ON clientes(nombre);
CREATE INDEX idx_clientes_cuit ON clientes(cuit);
CREATE INDEX idx_clientes_localidad ON clientes(localidad);
CREATE INDEX idx_clientes_deleted_at ON clientes(deleted_at) WHERE deleted_at IS NULL;
```

**Nota sobre CUITs:** Los CUITs del Excel vienen en notación científica (ej: `2.7227257526E10`). Al migrar, convertir a string de 11 dígitos.

**Caso especial — Los Piuquenes S.A.:** cliente que paga en quintales (qq). El sistema no modela honorarios en especie. Documentar como deuda técnica y usar campo `notas` para el detalle.

---

### 3.3 `claves_clientes`
Credenciales fiscales de clientes. **Solo accesible por rol `admin`.**

```sql
CREATE TABLE claves_clientes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id  UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL,  -- 'AFIP', 'ANSES', 'ARBA', 'SINDICATO', etc.
  usuario     TEXT,
  clave       TEXT NOT NULL,  -- TODO: migrar a Supabase Vault
  notas       TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES usuarios(id)
);

-- Constraint: un solo registro por tipo por cliente
CREATE UNIQUE INDEX idx_claves_cliente_tipo ON claves_clientes(cliente_id, tipo);
```

> ⚠️ **Seguridad:** En una iteración futura, migrar el campo `clave` a Supabase Vault (`vault.create_secret()`). Por ahora, proteger con RLS estricto.

---

### 3.4 `parametros`
Tabla de configuración central. Reemplaza todos los valores hardcodeados.

```sql
CREATE TABLE parametros (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria   TEXT NOT NULL,
  codigo      TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  orden       INT DEFAULT 0,
  UNIQUE (categoria, codigo)
);

CREATE INDEX idx_parametros_categoria ON parametros(categoria);
```

**Categorías predefinidas y sus valores:**

| Categoría | Códigos |
|-----------|---------|
| `TIPO_SERVICIO` | HONORARIO_MENSUAL, HONORARIO_ANUAL, BALANCE, GANANCIAS_PF, ISIB, BIENES_PERSONALES, CONSULTORÍA_COSTOS, INSCRIPCIONES, OTROS |
| `GENERADO_POR` | PAOLA, LUCIANA, VICTORIA, PABLO, PAOLA_LUCIANA, PAOLA_VICTORIA, LUCIANA_VICTORIA, TODOS |
| `TIPO_COMPROBANTE` | FC_A, FC_B, FC_C, PRESUPUESTO, ND, NC |
| `TIPO_PAGO` | TRANSFERENCIA, EFECTIVO, CHEQUE, USD |
| `ESTADO_TRABAJO` | PENDIENTE, EN_PROCESO, FINALIZADO, COBRADO |
| `ESTADO_LIQUIDACION` | PENDIENTE, PARCIALMENTE_COBRADA, COBRADA, ANULADA |
| `TIPO_CHEQUE` | PROPIO, TERCERO |
| `ESTADO_CHEQUE` | EN_CARTERA, DEPOSITADO, ENDOSADO, RECHAZADO, ANULADO |
| `CUENTA_BANCARIA` | BANCO_NACION_CA_PESOS, BANCO_NACION_USD |
| `RUBRO_PROVEEDOR` | COMBUSTIBLE, COMPUTACION, ENERGIA, GASTOS_GENERALES, HONORARIOS, IMPUESTOS, LIBRERIA, LIMPIEZA, MANTENIMIENTO, MATRICULA, SISTEMA, SUELDOS, TELEFONO |
| `TIPO_MOV_FONDOS` | INGRESO, EGRESO, MOVIMIENTO |
| `TIPO_VENCIMIENTO` | AFIP, IIBB_PROVINCIAL, IIBB_MUNICIPAL, GANANCIAS, BIENES_PERSONALES, OTRO |

---

### 3.5 `honorarios_mensuales`
Historial de honorarios mensuales por cliente. **Nunca se sobreescribe — se crea un nuevo registro.**

```sql
CREATE TABLE honorarios_mensuales (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id               UUID NOT NULL REFERENCES clientes(id),
  monto                    NUMERIC(14,2) NOT NULL CHECK (monto > 0),
  frecuencia_ajuste_meses  INT NOT NULL DEFAULT 2 CHECK (frecuencia_ajuste_meses > 0),
  vigente_desde            DATE NOT NULL,
  vigente_hasta            DATE,  -- NULL = vigente actualmente
  porcentaje_ajuste        NUMERIC(8,4),  -- El % que generó este monto
  notas                    TEXT,
  creado_por               UUID REFERENCES usuarios(id),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Constraint: solo un honorario activo (vigente_hasta IS NULL) por cliente
CREATE UNIQUE INDEX idx_honorarios_activo 
  ON honorarios_mensuales(cliente_id) 
  WHERE vigente_hasta IS NULL;

CREATE INDEX idx_honorarios_cliente ON honorarios_mensuales(cliente_id);
CREATE INDEX idx_honorarios_vigencia ON honorarios_mensuales(vigente_desde, vigente_hasta);
```

**Lógica de ajuste:**
1. Al aplicar un ajuste: se cierra el registro actual (`vigente_hasta = hoy`)
2. Se crea un registro nuevo con el monto actualizado y `vigente_desde = hoy`
3. El service calcula `monto_nuevo = monto_actual * (1 + porcentaje/100)`

---

### 3.6 `honorarios_anuales`
Trabajos anuales por cliente (balances, ganancias, bienes personales, etc.).

```sql
CREATE TABLE honorarios_anuales (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id    UUID NOT NULL REFERENCES clientes(id),
  tipo_trabajo  TEXT NOT NULL REFERENCES parametros(codigo),  -- FK vía código
  anio          INT NOT NULL CHECK (anio >= 2020 AND anio <= 2100),
  honorario     NUMERIC(14,2) CHECK (honorario >= 0),
  estado        TEXT NOT NULL DEFAULT 'PENDIENTE' 
                  CHECK (estado IN ('PENDIENTE','EN_PROCESO','FINALIZADO','COBRADO')),
  asignado_a    UUID REFERENCES usuarios(id),
  notas         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hon_anuales_cliente ON honorarios_anuales(cliente_id);
CREATE INDEX idx_hon_anuales_anio ON honorarios_anuales(anio);
CREATE INDEX idx_hon_anuales_estado ON honorarios_anuales(estado);
```

---

### 3.7 `liquidaciones`
Registro de servicios devengados (lo que se le cobra al cliente). Equivale a la hoja `FC y COBRANZAS`.

```sql
CREATE TABLE liquidaciones (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id          UUID NOT NULL REFERENCES clientes(id),
  tipo_servicio       TEXT NOT NULL,  -- FK vía código en parametros
  generado_por        TEXT,           -- FK vía código en parametros
  fecha_liquidacion   DATE NOT NULL,
  periodo_mes         TEXT,           -- 'Enero', 'Febrero', etc.
  periodo_anio        INT,
  detalle             TEXT,
  importe_liquidado   NUMERIC(14,2) NOT NULL,  -- Lo que devenga
  tipo_comprobante    TEXT,                     -- FC_A, FC_B, PRESUPUESTO
  nro_comprobante     TEXT,
  importe_facturado   NUMERIC(14,2),            -- Lo que se factura (con IVA si aplica)
  estado              TEXT NOT NULL DEFAULT 'PENDIENTE'
                        CHECK (estado IN ('PENDIENTE','PARCIALMENTE_COBRADA','COBRADA','ANULADA')),
  tipo_liquidacion    TEXT NOT NULL DEFAULT 'NORMAL'
                        CHECK (tipo_liquidacion IN ('NORMAL','SALDO_INICIAL')),
  notas               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_liquidaciones_cliente ON liquidaciones(cliente_id);
CREATE INDEX idx_liquidaciones_fecha ON liquidaciones(fecha_liquidacion);
CREATE INDEX idx_liquidaciones_estado ON liquidaciones(estado);
CREATE INDEX idx_liquidaciones_periodo ON liquidaciones(periodo_anio, periodo_mes);
```

---

### 3.8 `pagos`
Pagos recibidos contra una liquidación. Un pago puede ser parcial.

```sql
CREATE TABLE pagos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liquidacion_id  UUID NOT NULL REFERENCES liquidaciones(id),
  tipo_pago       TEXT NOT NULL CHECK (tipo_pago IN ('TRANSFERENCIA','EFECTIVO','CHEQUE','USD')),
  importe         NUMERIC(14,2) NOT NULL CHECK (importe > 0),
  importe_usd     NUMERIC(14,2),    -- Solo si tipo_pago = 'USD'
  tipo_cambio     NUMERIC(10,4),    -- TC del día si tipo_pago = 'USD'
  fecha_pago      DATE NOT NULL,
  cuenta_bancaria TEXT,             -- Si es transferencia
  cheque_id       UUID REFERENCES cheques(id),  -- Si es cheque
  notas           TEXT,
  created_by      UUID REFERENCES usuarios(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pagos_liquidacion ON pagos(liquidacion_id);
CREATE INDEX idx_pagos_fecha ON pagos(fecha_pago);
```

---

### 3.9 `cheques`
Cheques recibidos de clientes o emitidos a proveedores. Entidad con lifecycle propio.

```sql
CREATE TABLE cheques (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo            TEXT NOT NULL CHECK (tipo IN ('PROPIO','TERCERO')),
  numero          TEXT NOT NULL,
  banco           TEXT NOT NULL,
  importe         NUMERIC(14,2) NOT NULL CHECK (importe > 0),
  fecha_emision   DATE NOT NULL,
  fecha_cobro     DATE,   -- Para cheques a fecha
  estado          TEXT NOT NULL DEFAULT 'EN_CARTERA'
                    CHECK (estado IN ('EN_CARTERA','DEPOSITADO','ENDOSADO','RECHAZADO','ANULADO')),
  origen          TEXT NOT NULL CHECK (origen IN ('CLIENTE','EMITIDO')),
  cliente_id      UUID REFERENCES clientes(id),     -- Si viene de un cliente
  proveedor_id    UUID REFERENCES proveedores(id),  -- Si fue emitido a un proveedor
  cuenta_bancaria TEXT,
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cheques_estado ON cheques(estado);
CREATE INDEX idx_cheques_fecha ON cheques(fecha_cobro);
```

---

### 3.10 `fondos_movimientos`
Registro de movimientos de caja (ingresos, egresos, transferencias, USD).

```sql
CREATE TABLE fondos_movimientos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_movimiento  TEXT NOT NULL CHECK (tipo_movimiento IN ('INGRESO','EGRESO','MOVIMIENTO')),
  fecha            DATE NOT NULL,
  concepto         TEXT NOT NULL,
  nro_comprobante  TEXT,
  cuenta_bancaria  TEXT,
  importe_banco    NUMERIC(14,2) DEFAULT 0,
  importe_efectivo NUMERIC(14,2) DEFAULT 0,
  importe_usd      NUMERIC(14,2) DEFAULT 0,
  cheque_id        UUID REFERENCES cheques(id),
  referencia_tipo  TEXT,  -- 'PAGO_CLIENTE', 'PAGO_PROVEEDOR', 'SUELDO', etc.
  referencia_id    UUID,  -- ID del registro origen (pago, compra, etc.)
  created_by       UUID REFERENCES usuarios(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fondos_fecha ON fondos_movimientos(fecha);
CREATE INDEX idx_fondos_tipo ON fondos_movimientos(tipo_movimiento);
```

---

### 3.11 `empleadas`
Empleadas del estudio.

```sql
CREATE TABLE empleadas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID REFERENCES usuarios(id),  -- Si tiene acceso al sistema
  nombre          TEXT NOT NULL,
  tipo_relacion   TEXT NOT NULL CHECK (tipo_relacion IN ('DEPENDENCIA','POR_HORA')),
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Empleadas actuales:**
- Victoria Boz (relación de dependencia)
- Luciana Faraoni (relación de dependencia)
- Paola Aresu (por hora)

---

### 3.12 `liquidaciones_empleadas`
Componentes del sueldo de cada empleada por periodo.

```sql
CREATE TABLE liquidaciones_empleadas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleada_id   UUID NOT NULL REFERENCES empleadas(id),
  concepto      TEXT NOT NULL,  -- FIJO, PREMIO, AGUINALDO, VACACIONES, SALDO_IVA, ESTADOS_CONTABLES, GANANCIAS_BS_PS
  tipo_concepto TEXT NOT NULL CHECK (tipo_concepto IN ('HABER','DESCUENTO')),
  periodo_mes   INT NOT NULL CHECK (periodo_mes BETWEEN 1 AND 12),
  periodo_anio  INT NOT NULL,
  importe       NUMERIC(14,2) NOT NULL,
  observaciones TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_liq_emp_empleada ON liquidaciones_empleadas(empleada_id);
CREATE INDEX idx_liq_emp_periodo ON liquidaciones_empleadas(periodo_anio, periodo_mes);
```

---

### 3.13 `pagos_empleadas`
Pagos efectuados a empleadas.

```sql
CREATE TABLE pagos_empleadas (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleada_id           UUID NOT NULL REFERENCES empleadas(id),
  periodo_mes           INT NOT NULL CHECK (periodo_mes BETWEEN 1 AND 12),
  periodo_anio          INT NOT NULL,
  tipo_pago             TEXT NOT NULL CHECK (tipo_pago IN ('TRANSFERENCIA','EFECTIVO','CHEQUE')),
  importe               NUMERIC(14,2) NOT NULL CHECK (importe > 0),
  fecha_pago            DATE NOT NULL,
  cuenta_bancaria       TEXT,
  cheque_id             UUID REFERENCES cheques(id),
  notas                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 3.14 `proveedores`
Proveedores del estudio.

```sql
CREATE TABLE proveedores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL,
  cuit        TEXT,
  rubro       TEXT,  -- FK vía código en parametros categoria RUBRO_PROVEEDOR
  telefono    TEXT,
  email       TEXT,
  notas       TEXT,
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 3.15 `compras_proveedores`
Compras y gastos con proveedores.

```sql
CREATE TABLE compras_proveedores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id  UUID NOT NULL REFERENCES proveedores(id),
  fecha         DATE NOT NULL,
  concepto      TEXT NOT NULL,
  nro_comprobante TEXT,
  tipo_comprobante TEXT,  -- FC_B, FC_C, X, etc.
  importe_total NUMERIC(14,2) NOT NULL CHECK (importe_total > 0),
  estado        TEXT NOT NULL DEFAULT 'PENDIENTE'
                  CHECK (estado IN ('PENDIENTE','PAGADA','PARCIALMENTE_PAGADA','ANULADA')),
  notas         TEXT,
  created_by    UUID REFERENCES usuarios(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_compras_proveedor ON compras_proveedores(proveedor_id);
CREATE INDEX idx_compras_fecha ON compras_proveedores(fecha);
```

---

### 3.16 `pagos_proveedores`
Pagos realizados a proveedores.

```sql
CREATE TABLE pagos_proveedores (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id    UUID NOT NULL REFERENCES compras_proveedores(id),
  tipo_pago    TEXT NOT NULL CHECK (tipo_pago IN ('TRANSFERENCIA','EFECTIVO','CHEQUE')),
  importe      NUMERIC(14,2) NOT NULL CHECK (importe > 0),
  fecha_pago   DATE NOT NULL,
  cuenta_bancaria TEXT,
  cheque_id    UUID REFERENCES cheques(id),
  notas        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 3.17 `vencimientos`
Vencimientos impositivos, personales y operativos.

```sql
CREATE TABLE vencimientos (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id         UUID REFERENCES clientes(id),    -- NULL si es vencimiento del estudio/personal
  empleada_id        UUID REFERENCES empleadas(id),   -- NULL si no está asignado a empleada
  tipo_vencimiento   TEXT NOT NULL,                   -- FK vía codigo en parametros
  fecha_vencimiento  DATE NOT NULL,
  descripcion        TEXT NOT NULL,
  completado         BOOLEAN NOT NULL DEFAULT FALSE,
  completado_at      TIMESTAMPTZ,
  completado_by      UUID REFERENCES usuarios(id),
  ambito             TEXT NOT NULL DEFAULT 'CLIENTE'
                       CHECK (ambito IN ('CLIENTE','ESTUDIO','PERSONAL')),
  -- 'PERSONAL' = solo visible para admin (vencimientos propios de Paola)
  notas              TEXT,
  created_by         UUID REFERENCES usuarios(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vencimientos_fecha ON vencimientos(fecha_vencimiento);
CREATE INDEX idx_vencimientos_cliente ON vencimientos(cliente_id);
CREATE INDEX idx_vencimientos_empleada ON vencimientos(empleada_id);
CREATE INDEX idx_vencimientos_completado ON vencimientos(completado) WHERE completado = FALSE;
```

---

### 3.18 `audit_log`
Registro de auditoría. Se llena automáticamente via trigger.

```sql
CREATE TABLE audit_log (
  id               BIGSERIAL PRIMARY KEY,
  usuario_id       UUID REFERENCES usuarios(id),
  tabla_afectada   TEXT NOT NULL,
  registro_id      UUID NOT NULL,
  accion           TEXT NOT NULL CHECK (accion IN ('INSERT','UPDATE','DELETE')),
  valor_anterior   JSONB,
  valor_nuevo      JSONB,
  ip_address       INET,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_tabla ON audit_log(tabla_afectada, registro_id);
CREATE INDEX idx_audit_usuario ON audit_log(usuario_id);
CREATE INDEX idx_audit_fecha ON audit_log(created_at);
```

**Trigger genérico de auditoría:**

```sql
CREATE OR REPLACE FUNCTION fn_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log(usuario_id, tabla_afectada, registro_id, accion, valor_nuevo)
    VALUES (auth.uid(), TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log(usuario_id, tabla_afectada, registro_id, accion, valor_anterior, valor_nuevo)
    VALUES (auth.uid(), TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log(usuario_id, tabla_afectada, registro_id, accion, valor_anterior)
    VALUES (auth.uid(), TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD));
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar en tablas sensibles:
CREATE TRIGGER audit_clientes
  AFTER INSERT OR UPDATE OR DELETE ON clientes
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER audit_honorarios_mensuales
  AFTER INSERT OR UPDATE OR DELETE ON honorarios_mensuales
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER audit_liquidaciones
  AFTER INSERT OR UPDATE OR DELETE ON liquidaciones
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER audit_pagos
  AFTER INSERT OR UPDATE ON pagos
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();
```

---

## 4. Views útiles

### Vista: Cuenta corriente por cliente

```sql
CREATE OR REPLACE VIEW v_cuenta_corriente AS
SELECT
  c.id                                          AS cliente_id,
  c.nombre                                      AS cliente_nombre,
  COALESCE(SUM(l.importe_liquidado), 0)         AS total_devengado,
  COALESCE(SUM(p.importe), 0)                   AS total_cobrado,
  COALESCE(SUM(l.importe_liquidado), 0)
    - COALESCE(SUM(p.importe), 0)               AS saldo_pendiente,
  COUNT(l.id) FILTER (
    WHERE l.estado IN ('PENDIENTE', 'PARCIALMENTE_COBRADA')
  )                                             AS liquidaciones_pendientes
FROM clientes c
LEFT JOIN liquidaciones l ON l.cliente_id = c.id AND l.estado != 'ANULADA'
LEFT JOIN pagos p ON p.liquidacion_id = l.id
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.nombre;
```

### Vista: Saldo de fondos

```sql
CREATE OR REPLACE VIEW v_saldo_fondos AS
SELECT
  COALESCE(SUM(importe_banco)    FILTER (WHERE tipo_movimiento = 'INGRESO'), 0)
  - COALESCE(SUM(importe_banco)  FILTER (WHERE tipo_movimiento = 'EGRESO'),  0)  AS saldo_banco,
  COALESCE(SUM(importe_efectivo) FILTER (WHERE tipo_movimiento = 'INGRESO'), 0)
  - COALESCE(SUM(importe_efectivo) FILTER (WHERE tipo_movimiento = 'EGRESO'),0)  AS saldo_efectivo,
  COALESCE(SUM(importe_usd)      FILTER (WHERE tipo_movimiento = 'INGRESO'), 0)
  - COALESCE(SUM(importe_usd)    FILTER (WHERE tipo_movimiento = 'EGRESO'),  0)  AS saldo_usd
FROM fondos_movimientos;
```

---

## 5. Row Level Security (RLS)

### Principios
- RLS habilitado en **todas** las tablas al momento de crearlas
- Usuarios no autenticados: **cero acceso**
- Empleadas: acceso de lectura a módulos operativos
- Admin: acceso total
- Tablas sensibles (claves, sueldos, vencimientos personales): **solo admin**

### Políticas base

```sql
-- Helper: verificar si el usuario es admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper: verificar si el usuario está autenticado en el sistema
CREATE OR REPLACE FUNCTION is_authenticated_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios WHERE id = auth.uid() AND activo = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Clientes: todos los usuarios activos pueden leer
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clientes_read" ON clientes
  FOR SELECT USING (is_authenticated_user() AND deleted_at IS NULL);
CREATE POLICY "clientes_write" ON clientes
  FOR ALL USING (is_admin());

-- Claves de clientes: SOLO admin
ALTER TABLE claves_clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "claves_solo_admin" ON claves_clientes
  FOR ALL USING (is_admin());

-- Liquidaciones y pagos: lectura para todos, escritura para todos autenticados
ALTER TABLE liquidaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "liquidaciones_read" ON liquidaciones
  FOR SELECT USING (is_authenticated_user());
CREATE POLICY "liquidaciones_write" ON liquidaciones
  FOR INSERT WITH CHECK (is_authenticated_user());
CREATE POLICY "liquidaciones_update" ON liquidaciones
  FOR UPDATE USING (is_admin());  -- Solo admin puede modificar/anular

-- Sueldos y liquidaciones de empleadas: SOLO admin
ALTER TABLE liquidaciones_empleadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sueldos_solo_admin" ON liquidaciones_empleadas
  FOR ALL USING (is_admin());

ALTER TABLE pagos_empleadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pagos_emp_solo_admin" ON pagos_empleadas
  FOR ALL USING (is_admin());

-- Vencimientos: personales solo admin, resto para todos
ALTER TABLE vencimientos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vencimientos_read" ON vencimientos
  FOR SELECT USING (
    is_authenticated_user() AND (
      ambito != 'PERSONAL' OR is_admin()
    )
  );
CREATE POLICY "vencimientos_write" ON vencimientos
  FOR INSERT WITH CHECK (is_authenticated_user());

-- Audit log: solo lectura para admin
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_solo_admin" ON audit_log
  FOR SELECT USING (is_admin());
```

---

## 6. Decisiones de diseño importantes

### 6.1 No hay tabla de cuenta corriente
El saldo se calcula dinámicamente via la view `v_cuenta_corriente`. Esto evita inconsistencias entre el saldo almacenado y los movimientos. Cuando el volumen crezca, se puede materializar la view o agregar una columna cache con trigger.

### 6.2 Honorarios no se sobreescriben
Cada ajuste de honorario crea un nuevo registro con `vigente_desde` y cierra el anterior con `vigente_hasta`. Esto da historial completo y permite auditar qué se le cobró a un cliente en cualquier periodo histórico.

### 6.3 Un cheque es una entidad propia
Los cheques aparecen en cobros de clientes, pagos a proveedores y movimientos de fondos. Modelarlo como entidad separada con lifecycle evita la duplicación de datos que había en el Excel.

### 6.4 `parametros` como fuente de verdad de listas
Todo lo que en el Excel era una lista en una columna (tipos de servicio, tipos de comprobante, cuentas bancarias) vive en `parametros`. El sistema puede agregar opciones sin deploy.

### 6.5 `tipo_liquidacion = 'SALDO_INICIAL'`
Al migrar del Excel, los saldos iniciales de cada cliente se cargan como una liquidación especial de tipo `SALDO_INICIAL`. Esto establece el punto de partida de la cuenta corriente sin distorsionar el historial real.
