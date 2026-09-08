# Pedidos de Paola — sistema en producción

Desde el **2026-09-04** Paola usa el sistema todos los días y manda los pedidos por WhatsApp a medida que le aparecen ("YO TE VOY A IR PONIENDO MIENTRAS VAYAMOS USANDO EL SISTEMA"). El feedback llega en goteo, no en reuniones.

Este archivo es el registro. Para el estado funcional de cada módulo ver `ESTADO_MODULOS.md`.

## Cómo se trabaja este feedback

- **La prueba funcional la hace ella, en producción.** No se cargan datos de prueba en la base real — ver `CLAUDE.md` sección 15.1 para cómo se verifica un cambio sin ensuciarla.
- **Mirar los datos reales antes de estimar.** Dos veces ya cambió el diseño por lo que mostraba la base y no por lo que decía el pedido.
- **Cuando pide "modificar X", casi siempre también pide "y que se vea por qué se modificó".** El historial es la mitad del pedido.
- **Las preguntas se le hacen sobre casos concretos suyos, no en abstracto.** Preguntarle "¿un recibo puede imputarse a una factura A y una C?" iba a recibir un "sí, la plata es la misma"; la pregunta útil era "estos recibos que hiciste ayer salieron C y los aplicaste a facturas A, ¿está bien?".

---

## 2026-09-04

| #   | Pedido                                                              | Estado                     |
| :-- | :------------------------------------------------------------------ | :------------------------- |
| 1   | Saldo inicial de cuenta corriente **a favor** del cliente           | ✅ migración 0068          |
| 2   | Poder modificar los honorarios (el ajuste era solo por porcentaje)  | ✅ migración 0069          |
| 3   | Poder modificar los presupuestos ya hechos (antes solo se anulaban) | ✅ migración 0070          |
| 4   | Que el honorario guarde historial con observación                   | ✅ migraciones 0069 + 0071 |

Los puntos 2 y 4 eran el mismo desarrollo. El 3 se resolvió más ancho de lo pedido: un presupuesto es una liquidación con `tipo_comprobante = 'PRESUPUESTO'`, así que se habilitó editar **cualquier** liquidación — equivocarse cargando una factura es igual de probable.

La 0069 corregía en el lugar los cambios del mismo día para no duplicar filas; se revirtió en la 0071: **cada modificación tiene que ser una fila propia del historial**, aunque sean dos el mismo día.

---

## 2026-09-08

| #   | Pedido                                                        | Estado            |
| :-- | :------------------------------------------------------------ | :---------------- |
| 1   | El menú lateral no se lee ("tengo casi 50 y no veo el color") | ✅                |
| 2   | Un solo recibo para un cobro con varios medios de pago        | ✅ migración 0073 |
| 3   | "Tarallo" va con doble l                                      | ✅                |
| 4   | Gastos: poder eliminar un pago y poder cargar importe $0      | ✅ migración 0072 |

### 1 — Sidebar

`--sidebar-foreground` estaba en `oklch(0.52)` sobre un charcoal casi negro. Se subió a casi blanco y se agregó `--sidebar-foreground-muted` para el segundo nivel (subtítulo, nombre de usuario, Salir), para no perder la jerarquía.

### 2 — Recibo con varios medios de pago

El pedido textual: _"si me pagan con dos cheques y efectivo tengo que hacer tres recibos distintos, no puedo hacer uno como el que me paga"_.

Los datos le daban la razón. El 07/09 emitió C-0127 + C-0128 + C-0129 para SOC-MAR (dos cheques y el efectivo que completaba la FC_A 386 al centavo) y C-0131 + C-0132 + C-0133 para SANTILLI, mismo patrón:

```
FC_A 386 = 531.398,00 + 763.510,00 + 20.492,75 = 1.315.400,75
FC_A 385 = 227.500,00 + 270.000,00 +    383,23 =   497.883,23
```

Un cobro, tres recibos, porque `recibos` tenía un solo `tipo_pago` y un solo `cheque_id`.

**Solución:** tabla `recibos_medios`. El recibo guarda el total y cuelga N medios, cada uno con su importe y sus datos propios. Cada medio genera **su propio movimiento de fondos**, así cada cheque entra a cartera por separado y conserva su lifecycle. El recibo queda marcado `tipo_pago = 'MIXTO'` cuando tiene más de uno.

**El hallazgo que destrabó la decisión** está documentado en `CLAUDE.md` sección 19 ("Series de recibo A/C eliminadas"): el corte por serie A/C existía en el código pero nunca se activaba, porque solo corría al imputar en el momento de cargar el recibo y ella imputa después. Queda pendiente que Paola confirme con su contador si el recibo debe llevar la letra de la factura.

### 3 — Tarallo

Solo cambiaron las etiquetas visibles. Las columnas `importe_taralo` / `saldo_taralo` conservan el nombre viejo: renombrarlas era una migración sin beneficio. **Buscar "Tarallo" en la base no devuelve nada.**

### 4 — Gastos en $0 y borrables

Pedía las dos cosas juntas porque usa los gastos recurrentes como **checklist**: los impuestos anuales los tiene cargados como vencimiento y los va "sacando" a medida que los paga, aunque todavía no sepa el importe. El `CHECK (importe > 0)` la obligaba a poner $0,01. Y como algunos gastos no se le sacaban de pendientes, los cargó dos veces y no tenía cómo borrar el duplicado.

- Un pago en $0 avanza igual el vencimiento (que es todo el punto) pero no genera movimiento de fondos.
- `fn_eliminar_pago_gasto` borra el pago y su movimiento de fondos, y si ese pago fue el que avanzó el calendario, devuelve el gasto recurrente al vencimiento anterior — así borrar el duplicado deja el calendario bien.

---

## 2026-09-08 (segunda tanda — Empleadas)

Apenas empezó a liquidarle al personal: _"AHI ARRANQUE CON LAS EMPLEADAS"_.

| #   | Pedido                                                          | Estado            |
| :-- | :-------------------------------------------------------------- | :---------------- |
| 1   | Liquidar por hora ("ESTA ES POR HORA PERO NO TENGO ESA OPCION") | ✅ migración 0074 |
| 2   | Qué hacer con el saldo a favor ("¿DESPUES COMO LO IMPUTO?")     | ✅ migración 0074 |

### 1 — Concepto "Horas trabajadas"

El legajo **ya tenía** `tipo_relacion = 'POR_HORA'` y 4 de las 5 empleadas están cargadas así, pero la liquidación solo ofrecía conceptos de importe plano. Hizo la cuenta a mano (46 × 8.327 = 383.042), la cargó como "Sueldo fijo" y se explicó en observaciones: _"46 HORAS A 8327 DESDE AGOSTO DE 2026"_.

El valor hora vigente vive en el legajo (`empleadas.valor_hora`) y se **copia a cada fila** de liquidación (`cantidad_horas`, `valor_hora`). Así el historial sale solo: cada mes conserva el valor con el que se liquidó y cambiar el valor de hoy no reescribe los meses viejos. Eso es lo que ella pedía con el "DESDE AGOSTO DE 2026".

⚠️ El select de conceptos usa `descripcion` como value, no `codigo`: en `liquidaciones_empleadas.concepto` se guarda el texto **"Horas trabajadas"**. Cambiar esa descripción en `parametros` rompe la detección en el formulario. La constante está en `calcularLiquidacionMes.ts` (`CONCEPTO_HORAS`).

### 2 — Arrastre entre meses

Le pagó $390.000 sobre un neto de $383.042 y preguntó cómo imputar los $6.958 que quedaron a favor. La respuesta es que **no los imputa**: los períodos dejaron de ser estancos y el saldo pasa solo al mes siguiente, en los dos sentidos (si quedó debiendo, se acumula).

El cálculo salió del componente a `calcularLiquidacionMes` — lo usan el detalle de la empleada y el resumen de Liquidación Personal, y era la única forma de tener una sola regla. Consecuencia: el resumen del período ya **no** filtra por período en la query, trae el historial completo y filtra en memoria.

En el encabezado aparece una tarjeta extra ("Venía debiendo" / "Pagado de más antes") solo cuando hay arrastre, con una línea que explica de dónde sale el pendiente.
