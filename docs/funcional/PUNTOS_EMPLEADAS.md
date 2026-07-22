# Sistema de Puntos y Premios — Empleadas

Documento funcional del sistema de puntos para bonificaciones de empleadas.  
**Estado:** implementado.  
**Confirmado por Paola:** 2026-05-29.

> ⚠️ **Corrección 2026-07-16:** las secciones 6 y 7 de este documento describían un corte **automático** del umbral (15,5 pts/mes) al liquidar. En la demo del 2026-07-16 Paola pidió que el sistema funcione como una **cuenta corriente manual**: los puntos se acumulan solos en tiempo real (sin resetearse mes a mes) y es ella quien decide, al liquidar, cuántos puntos descontar — puede acumular varios meses y descontar múltiplos del umbral de una sola vez. Implementado en la migración `0043_comisiones_cuenta_corriente_manual.sql` (triggers que mantienen `saldo_puntaje_empleadas` en tiempo real + `fn_ajustar_saldo_puntaje` para el descuento manual) y expuesto en `ComisionesSection.tsx`. El umbral queda solo como referencia visual, no como corte automático.
>
> **Actualización 2026-07-22:** el flujo viejo (`confirmarComisionPuntaje`/`calcularPreviewPuntaje`/`getComisionesRegistradas`/`liquidarComision` y la tabla `comisiones_puntaje_registradas`) se sacó por completo de la aplicación — ya no queda ningún botón, hook ni service method que lo use (estaba generando confusión real: convivía visualmente con la cuenta corriente nueva en la ficha de la empleada y en el modal "Importar comisiones"). Las funciones RPC viejas (`fn_confirmar_comision_puntaje`, `fn_liquidar_comision_puntaje`, `fn_calcular_comision_puntaje`) y la tabla siguen existiendo en la base (no se tocó el schema), pero nada en el código las llama. Ver [`REUNION_2026-07-16_DEMO.md`](./REUNION_2026-07-16_DEMO.md) ítem 5.

---

## 1. Resumen del sistema

Cada empleada acumula puntos al completar ciertos trabajos. Cuando el total acumulado supera el umbral mensual (15,5 puntos), se genera una bonificación. Los puntos que no alcanzan el umbral se arrastran al mes siguiente.

Además, existe un tipo de premio adicional basado en porcentaje sobre un monto que Paola ingresa manualmente al liquidar.

---

## 2. Tipos de trabajo que generan puntos

| Tipo de trabajo                         | Notas               |
| --------------------------------------- | ------------------- |
| Balance                                 | Por empresa/cliente |
| Ganancias Persona Física                | Por persona         |
| Saldo Técnico — Secretaría de Industria | Por empresa         |
| Saldo Técnico — AFIP                    | Por empresa         |
| Exportaciones                           | Por empresa         |

**No todos los trabajos generan puntos.** Solo los tipos listados. Registrar un honorario mensual o un pago, por ejemplo, no genera puntos.

---

## 3. Configuración de puntos por trabajo

Paola asigna cuántos puntos vale cada tipo de trabajo según la complejidad del cliente:

- **Balance de Empresa X** → 5 puntos
- **Balance de Empresa Y** → 3 puntos
- **Ganancias PF de Juan Pérez** → 2 puntos

Esta configuración vive en la tabla `puntos_trabajo_config` (nueva):

| Campo          | Tipo    | Descripción                                      |
| -------------- | ------- | ------------------------------------------------ |
| `cliente_id`   | uuid FK | El cliente/empresa al que corresponde el trabajo |
| `tipo_trabajo` | varchar | El tipo de trabajo (Balance, Ganancias PF, etc.) |
| `puntos`       | decimal | Puntos asignados por Paola                       |

---

## 4. Valor monetario de los puntos

Cada tipo de punto tiene un valor en pesos que Paola puede cambiar en cada liquidación:

- Punto de Balance = $20.000
- Punto de Ganancias PF = $15.000
- Punto de Saldo Técnico = $18.000

El valor es global por tipo (no varía por cliente ni por empleada). Vive en la tabla `valores_punto_tipo` (nueva):

| Campo             | Tipo    | Descripción                                            |
| ----------------- | ------- | ------------------------------------------------------ |
| `tipo_trabajo`    | varchar | El tipo de trabajo                                     |
| `valor_por_punto` | decimal | Valor monetario por punto                              |
| `vigente_desde`   | date    | Permite cambiar el valor sin pisar períodos anteriores |

---

## 5. Flujo de generación de puntos (automático)

```
Empleada completa un trabajo (tipo_trabajo = Balance, cliente = Empresa X)
              ↓
Admin aprueba el trabajo en el sistema
              ↓
fn_aprobar_trabajo_realizado busca en puntos_trabajo_config:
  → (tipo=Balance, cliente=Empresa X) = 5 pts
              ↓
Se inserta automáticamente en registros_puntaje_empleadas
  → empleada_id, periodo_mes, periodo_anio, puntos=5, descripcion="Balance Empresa X"
```

La empleada **no carga puntos manualmente**. El historial se construye solo a partir de los trabajos aprobados.

---

## 6. Cuenta corriente de puntos (umbral = 15,5 pts/mes) — ⚠️ superado, ver nota al inicio

Los puntos se acumulan hasta superar el umbral. Cuando se supera, se generan "unidades" de bonificación (una por cada 15,5 puntos completados). Los puntos restantes se arrastran.

**Esta sección describe el diseño original (corte automático). En producción funciona distinto: ver la corrección 2026-07-16 al inicio del documento.**

### Ejemplo

| Mes     | Puntos del mes | Acumulado | Unidades cobradas | Saldo restante |
| ------- | -------------- | --------- | ----------------- | -------------- |
| Enero   | 10             | 10        | 0                 | 10             |
| Febrero | 20             | 30        | 1 (15,5 pts)      | 14,5           |
| Marzo   | 5              | 19,5      | 1 (15,5 pts)      | 4              |
| Abril   | 25             | 29        | 1 (15,5 pts)      | 13,5           |

**Pago diferido:** Paola puede optar por no pagar en el mes en que se supera el umbral y acumular para pagar varios períodos juntos. El sistema lo permite: al confirmar la liquidación, se descuentan los puntos correspondientes a las unidades que se paguen en ese momento.

---

## 7. Cálculo de la bonificación al liquidar

Al liquidar el sueldo de una empleada, el sistema calcula:

```
Por cada tipo de trabajo en el período:
  puntos_tipo × valor_punto_tipo = sub-total

Total bonificación = suma de todos los sub-totales

Si total_acumulado ≥ 15,5: se generan floor(total_acumulado / 15,5) unidades
Monto a pagar = unidades × total_bonificación (proporcional)
Puntos restantes = total_acumulado mod 15,5
```

Esto lo resuelve la función existente `fn_calcular_comision_puntaje`, que se actualizará para usar `valores_punto_tipo` en lugar del valor único actual de `comisiones_config`.

---

## 8. Premio adicional — porcentaje sobre monto

Además del sistema de puntos, existe un tipo de premio libre:

- Paola ingresa un monto base al momento de liquidar (ej: sueldo de una empleada nueva)
- Indica un porcentaje
- El sistema calcula el importe y lo agrega como línea en la liquidación

**Caso de uso típico:** Victoria como supervisora recibe X% del sueldo de la empleada que supervisa.

Este premio no tiene config previa — Paola lo ingresa manualmente en cada liquidación como un concepto más. Se agrega como `tipo_concepto = 'HABER'` en `liquidaciones_empleadas` con descripción libre.

---

## 9. Cambios en el sistema existente

### Tablas nuevas

| Tabla                   | Descripción                                  |
| ----------------------- | -------------------------------------------- |
| `puntos_trabajo_config` | (cliente, tipo_trabajo) → puntos             |
| `valores_punto_tipo`    | tipo_trabajo → valor_por_punto, con vigencia |

### Funciones modificadas

| Función                        | Cambio                                                                                                                                 |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `fn_aprobar_trabajo_realizado` | Eliminar ingreso manual de importe_comision. Buscar puntos en `puntos_trabajo_config` y auto-insertar en `registros_puntaje_empleadas` |
| `fn_calcular_comision_puntaje` | Usar `valores_punto_tipo` por tipo en vez del `valor` único de `comisiones_config`                                                     |

### UI nueva (solo admin)

| Pantalla                  | Descripción                                                  |
| ------------------------- | ------------------------------------------------------------ |
| Config puntos por trabajo | Paola asigna puntos a cada (cliente, tipo_trabajo)           |
| Config valores por tipo   | Paola setea cuánto vale cada punto antes de cada liquidación |

### UI simplificada

| Componente      | Cambio                                                                   |
| --------------- | ------------------------------------------------------------------------ |
| Aprobar trabajo | Se elimina el campo manual de importe_comision (ya no se ingresa a mano) |

---

## 10. Tablas existentes que se reutilizan (sin cambios)

| Tabla                         | Rol en este sistema                           |
| ----------------------------- | --------------------------------------------- |
| `trabajos_realizados`         | Registro de trabajos completados por empleada |
| `registros_puntaje_empleadas` | Puntos generados por período                  |
| `saldo_puntaje_empleadas`     | Saldo acumulado de puntos                     |
| `comisiones_config`           | Umbral (15,5) y tipo de comisión por empleada |
| `liquidaciones_empleadas`     | Destino final de la bonificación confirmada   |
