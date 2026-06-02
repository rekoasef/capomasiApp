# Documento Funcional — Gestión de Honorarios, Facturación y Recibos

## Objetivo

Simplificar la carga mensual de honorarios y automatizar la gestión de facturación, IVA y recibos dentro del sistema, reduciendo tareas repetitivas y evitando errores manuales.

---

## 1. Carga de Honorarios Mensuales y demás trabajos

### Flujo de trabajo

Para generar una nueva liquidación mensual:

1. El usuario ingresa al perfil del cliente.
2. Selecciona la opción **"Nueva liquidación"**.
3. Elige el tipo **"Honorario Mensual"** o cualquier otro trabajo.
4. El sistema completa automáticamente la información usando la **última liquidación registrada** del cliente:
   - Importe del mes anterior.
   - Empleada asociada.
   - Tipo de comprobante utilizado (Factura A / Factura C / Presupuesto).
   - **Período siguiente automático** — Ejemplo: si la última liquidación es Mayo 2026, el sistema propone Junio 2026.

### Comportamiento esperado

- Si no hubo cambios → el usuario solo presiona **Guardar**.
- Si el honorario cambió → modifica el importe y guarda.

### Beneficios

- Eliminación de carga repetitiva de datos.
- Ahorro de tiempo operativo mensual.
- Reducción de errores manuales.

---

## 2. Gestión Automática del IVA

### Concepto principal

El usuario carga únicamente el valor del honorario profesional sin IVA, denominado **"Importe Liquidado"**. El sistema calcula automáticamente el valor final facturado al cliente según el tipo de comprobante.

### Reglas de cálculo

| Tipo de comprobante | Cálculo aplicado         |
|---------------------|--------------------------|
| Factura A           | Se adiciona 21% de IVA   |
| Factura C           | No se adiciona IVA       |
| Presupuesto         | No se adiciona IVA       |

### Visualización en tiempo real

Mientras el usuario completa la liquidación, el sistema muestra automáticamente:

> **"Total a facturar al cliente: $X"**

### Consideraciones contables

El sistema maneja dos conceptos simultáneos:

| Concepto            | Descripción                        | Usado para                                            |
|---------------------|------------------------------------|-------------------------------------------------------|
| **Importe facturado** | Valor total que paga el cliente   | Cuenta corriente, seguimiento de pagos, deuda del cliente |
| **Importe liquidado** | Honorario neto sin IVA            | Estadísticas internas, ganancias reales, reportes de honorarios |

---

## 3. Gestión de Números de Comprobante

### Facturación manual vs. automática

| Tipo        | Generación del número                     |
|-------------|-------------------------------------------|
| Factura A   | Manual (copiado desde AFIP)               |
| Factura C   | Manual                                    |
| Presupuesto | **Automática** por el sistema             |

### Numeración automática de presupuestos

- Secuencia incremental: `P-0100`, `P-0101`, `P-0102`, etc.
- Cuando el usuario selecciona **"Presupuesto"**:
  - El campo número queda **bloqueado**.
  - Se muestra el mensaje: `"Se asigna al guardar"`.
- Esto evita errores de numeración y elimina la necesidad de recordar el último número.

---

## 4. Gestión de Recibos

### Series independientes

| Serie   | Uso                                              |
|---------|--------------------------------------------------|
| Serie A | Pagos correspondientes a Facturas A              |
| Serie C | Pagos correspondientes a Facturas C y Presupuestos |

- Ambas series comienzan en **100**.
- Las series son **totalmente independientes**.

### Formato de numeración de recibos

| Serie   | Formato     | Ejemplo    |
|---------|-------------|------------|
| Serie A | `A-XXXX`    | `A-0100`   |
| Serie C | `C-XXXX`    | `C-0100`   |

### Flujo para registrar un pago

1. El usuario selecciona **"Registrar pago"**.
2. Elige el cliente.
3. Ingresa el importe recibido.
4. Imputa el pago a la liquidación correspondiente.
5. El sistema automáticamente:
   - Detecta el tipo de comprobante asociado.
   - Determina la serie correcta (A o C).
   - Genera y asigna el número de recibo.

### Ejemplos

- **Pago de Factura A** → Sistema genera: `Recibo A-0100 creado`
- **Pago de Presupuesto o Factura C** → Sistema genera: `Recibo C-0100 creado`

---

## 5. Definiciones Resueltas

### 5.1 Pagos mixtos

**Situación:** Un mismo pago cubre simultáneamente una Factura A y un Presupuesto/Factura C.

**Regla definida:** Se generan **dos recibos separados**.

**Caso especial — pago con cheque en Factura A:**
- Si el cliente pagó con cheque y hay vuelto en efectivo, ese efectivo se registra como pago de la serie C.

### 5.2 Formato de numeración de presupuestos

**Formato definido:** `P-0100`

### 5.3 Formato de numeración de recibos

**Formato definido:** `A-0100` / `C-0100`

---

## 6. Pendientes / A confirmar

> Los siguientes puntos aún requieren validación antes de la implementación final.

- [ ] Confirmar formato final de visualización de números de recibo en impresiones/PDFs.
- [ ] Definir comportamiento del sistema ante anulación de un comprobante (¿se libera el número o queda registrado como anulado?).
- [ ] Validar si el pago mixto con cheque requiere pantalla específica para ingresar el vuelto en efectivo.
