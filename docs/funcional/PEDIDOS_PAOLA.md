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

---

## 2026-09-08 (tercera tanda — lo que salió de probar lo anterior)

Al día siguiente de entregar lo de arriba, Paola fue a cargarle las horas a Agustina y no llegó. Los dos problemas salieron de la misma sesión.

| #   | Pedido                                                | Estado |
| :-- | :---------------------------------------------------- | :----- |
| 1   | "No me deja poner más horas" — el tope de 24          | ✅     |
| 2   | El sueldo fijo dice que puede ser 0 pero rechaza el 0 | ✅     |

### 1 — Fue a la pestaña equivocada, y con razón

Entró a **Comisiones** y quiso cargar 46 horas con fecha 08/09/2026 y la descripción "HORAS DESDE AGOSTO DE 2026". El navegador la frenó con "El valor debe ser inferior o igual a 24".

El tope está bien: ese panel es una **bitácora diaria**, una fila por día. Lo que estaba mal es que hubiera dos lugares que dicen "horas" y que el equivocado se llamara igual que el correcto — el panel mostraba "HORAS TRABAJADAS / VALOR POR HORA / TOTAL A PAGAR", que es literalmente lo que ella buscaba.

Son dos cosas distintas:

- **Comisiones → horas**: comisión por hora, un extra **encima** del sueldo, día por día, valor hora de `comisiones_config`.
- **Liquidación → "Horas trabajadas"**: el sueldo del mes, valor hora de `empleadas.valor_hora` (lo de la migración 0074).

Sobre un sueldo que ya es por hora, la comisión por hora es la misma plata dos veces. Así que cuando `tipo_relacion = 'POR_HORA'` el panel de comisión por hora ya no aparece: en su lugar hay un cartel que dice dónde van las horas. Y se renombraron las etiquetas del panel diario ("Horas del mes", "Horas de ese día") para que no compitan con el nombre del concepto.

**Ojo con los datos**: Agustina tenía `tipo_comision = 'HORAS'`, que es lo que le abría ese panel. Ese campo es para la comisión, no para el sueldo — va en `NINGUNA`.

### 2 — El sueldo fijo no se podía vaciar

Para pasarla a por hora había que vaciar `sueldo_fijo`, y no se podía por ningún lado:

- Escribir `0` → "Debe ser mayor a 0" (el campo tiene el placeholder "0.00", así que el mensaje se contradice solo).
- Borrar el campo → el `''` se volvía `undefined`, que Supabase **descarta del payload del update**. Guardaba sin error, la pantalla mostraba el campo vacío y la columna se quedaba con 8327. Silencioso, que es lo peor.

Ahora vacío y `0` significan lo mismo y los dos van a `null`, que sí viaja y borra. Los negativos se siguen rechazando. La base nunca fue el problema: `empleadas` no tiene ningún CHECK sobre `sueldo_fijo`.

El mismo arreglo cubre `valor_hora`, que tenía el bug idéntico.

---

## 2026-09-09 — Audio de Paola usando el sistema

Seis problemas en un audio. Tres son la misma raíz: la migración 0064 sacó el paso "pendiente → pagar" de las compras y quedaron cabos sueltos.

| #   | Pedido                                                               | Estado |
| :-- | :------------------------------------------------------------------- | :----- |
| 1   | Endosar un cheque a un proveedor es un callejón sin salida           | ✅     |
| 2   | Un gasto personal le baja el resultado del estudio                   | ✅     |
| 3   | Quedó plata fantasma en la caja por anular mal                       | ✅     |
| 4   | Las anulaciones se acumulan en el historial                          | ✅     |
| 5   | El PDF dice "Estudio Contable Capomasi", falta "Paola"               | ✅     |
| 6   | Los anticipos se marcan los 12 meses (son 5 en PF y 9 en sociedades) | ✅     |

### 1 a 4 — El nudo de las compras a proveedores

El circuito se mordía la cola. Tenía un cheque de tercero en cartera y se lo quiso endosar a Aceros Cufer:

1. El form de endoso solo ofrecía compras `PENDIENTE` o `PARCIALMENTE_PAGADA`.
2. Pero desde la 0064 toda compra nueva nacía pagada — el alta exigía medio de pago.
3. Entonces el desplegable del endoso **siempre estaba vacío**. Cargó la factura, el sistema la obligó a poner "efectivo", y el cheque ya no se podía endosar.

Encima ese gasto era de la casa, no del estudio, y `compras_proveedores` no tenía `ambito` (los gastos manuales sí lo tienen desde la 0045). Toda compra a proveedor se computaba como gasto del estudio.

Y cuando quiso deshacerlo, anular solo cambiaba el estado: el pago y su `EGRESO` en `fondos_movimientos` seguían vivos. La 0049 ya lo avisaba en su comentario ("No se maneja reversión") y la 0064 habilitó anular sobre compras pagadas sin tapar el agujero. **Su caja en efectivo quedó $886.353,35 abajo de lo real.**

Lo que se hizo (migración 0075):

- **Medio de pago opcional** — "Todavía no lo pagué" deja la compra `PENDIENTE`, lista para recibir el endoso.
- **`compras_proveedores.ambito`** (ESTUDIO/PERSONAL), filtrado en `v_resultado_mensual` y `v_historial_egresos_estudio`. Las compras ya cargadas arrancan en ESTUDIO, que es como venían computando: ningún número histórico se movió solo.
- **Anular → Eliminar.** `fn_eliminar_compra_proveedor` revierte el movimiento de fondos, borra el pago, devuelve el cheque endosado a cartera y borra la fila. Decisión de Renzo: si fue un error de carga, no sirve que quede en el historial.
- **Triggers de auditoría** en `compras_proveedores` y `pagos_proveedores`, que nunca los habían tenido. El borrado queda recuperable desde `audit_log` (solo-admin, fuera de sus pantallas).

**Limpieza de producción hecha el 2026-09-09:** se borró la compra que ella había anulado y se le sacó el pago falso en efectivo a la de MANTENIMIENTO ($779.424,88), que volvió a `PENDIENTE` con ámbito `PERSONAL` para que le endose el cheque de verdad. Caja en efectivo: **−$955.477,37 → −$69.124,02**.

### 5 — El nombre en el PDF

El encabezado y el pie de la cuenta corriente que le manda a los clientes decían "Estudio Contable Capomasi". Ahora dicen **"Estudio Contable Paola Capomasi"**. Solo el PDF: el sidebar y el título de la pestaña quedaron como estaban.

### 6 — Los anticipos no caen todos los meses

Un trabajo recurrente solo podía ser `MENSUAL` (los 12 meses, sin excepción — el generador hacía literalmente `if (MENSUAL) return true`) o `ANUAL` (un único mes). Los anticipos de ganancias son **5 al año en persona física y 9 en sociedades**, así que cargarlos como mensuales le llenaba el calendario de vencimientos que no existen.

Se agregó el tipo **`MESES_ESPECIFICOS`** (migración 0076) con una columna `meses_vencimiento SMALLINT[]`. El día del mes se reutiliza de `dia_vencimiento_mensual` en vez de crear otra columna: es el mismo dato y ya estaba validado 1-31. En la ficha del cliente aparece la opción "Meses puntuales (ej: anticipos)" con las 12 casillas para tildar.

La regla de qué mes aplica se sacó del service a una función pura, `configAplicaAlMes`, con tests que cubren los 5 anticipos de PF, los 9 de sociedades, y que `A_DEMANDA` nunca se autogenere.

**Pendiente de Paola:** las 87 configuraciones `MENSUAL` que ya existen siguen generando los 12 meses hasta que ella marque los meses reales de cada una. Las 20 de `ANTICIPOS_DE_GANANCIAS` son las que le importan. El calendario depende del cierre fiscal de cada cliente, así que no se puede adivinar desde el código — si ella pasa la lista de meses, se puede hacer por SQL en bloque.

---

## 2026-09-09 (tarde) — Los comparativos con la facturación migrada

Paola por WhatsApp: _"me tenés que migrar lo que te pasé de facturación"_ y _"después me lo tiene que mostrar en los comparativos y no sé si lo hace"_. No lo hacía: Reportes solo miraba `liquidaciones`, que arrancan en septiembre 2026, así que los comparativos tenían **un solo mes**.

Se unieron las dos fuentes en vistas nuevas (migraciones 0077 y 0078). Los comparativos pasaron de 1 mes a **11** (nov-2025 → sep-2026).

**Por qué se puede unir sin doble conteo:** el corte de fechas es limpio. `facturacion_historica` termina el 2026-08-31 y las liquidaciones reales arrancan el 2026-09-01 (las que figuran con fecha 31/08 son `SALDO_INICIAL`, que ya quedaban afuera por `tipo_liquidacion = 'NORMAL'`). Se verificó mes por mes.

**Por qué vistas nuevas y no tocar las existentes:** `v_ingresos_mensuales` alimenta a `v_resultado_mensual`, que es el resultado del mes en el Dashboard. Nunca se migraron los **gastos** históricos, así que meterle los ingresos viejos habría mostrado una ganancia falsa enorme en esos meses. El Dashboard sigue leyendo solo datos reales; los comparativos leen las vistas `*_con_historico`.

**Tres decisiones de datos:**

1. **Los 11 "SALDO INICIAL" del Excel se excluyen.** Son saldos de arranque, no facturación; sumarlos inflaba octubre 2025 en ~$8,3M. Como octubre era _solo_ saldos iniciales, ese mes desaparece del comparativo, que es lo correcto.
2. **Comprobantes y servicios se normalizan** del texto libre del Excel al vocabulario del sistema, pero solo donde la equivalencia es inequívoca. Quedan sin mapear a propósito, porque elegir el equivalente es decisión de Paola: `CERTIFICACION DE BALANCE` (¿BALANCE o CERTIFICACIONES?), `RECATEGORIZACION MONOTRIBUTO` (hay código de enero y de julio), `SALDO TECNICO DE IVA` y `RECUPERO IVA DE EXPORTACION`.
3. **Las 10 filas de trabajo compartido van mitad y mitad** (decisión de Renzo): "LUCIANA + VICTORIA" ×8 y "PAOLA + VICTORIA" ×2. El importe se divide; la cantidad suma 1 a cada una porque las dos participaron, así que la suma de "cantidad" puede superar la cantidad de facturas. Verificado que la partición no crea ni pierde plata: $284.970.191,06 en la vista = $284.970.191,06 sumando las fuentes.

**Ojo con los nombres:** `empleadas.nombre` tiene espacios al final en la base real (`'LUCIANA '`, `'VICTORIA '`) y el Excel a veces escribe en minúscula. Sin normalizar con `upper(btrim())` en los dos lados, Luciana aparecía **dos veces** en el mismo reporte.

### ⚠️ Pendiente de Paola: la fila de ZELARAYAN

`ZELARAYAN, DANIEL — 31/08/2026 — SALDO TECNICO DE IVA — $78.284.834,40`, sin comprobante, sin importe facturado y sin período. Parece cargada a medias y **deforma tres reportes**:

- Agosto 2026 da $111,7M contra ~$22M de los demás meses.
- Victoria queda con el 41,6% de los ingresos con solo 26 trabajos (sin esa fila estaría en ~$40M).
- El total del comparativo anual.

Hay que preguntarle si está bien cargada. Si no, se corrige en el Excel y se recarga la tabla entera.

---

## 2026-09-10

| #   | Pedido                                                                   | Estado            |
| :-- | :----------------------------------------------------------------------- | :---------------- |
| 1   | "El cable y las expensas las marco como pagadas y me vuelven a aparecer" | ✅ migración 0079 |
| 2   | "Fijate que lo histórico no me lo compara"                               | ✅ solo service   |

### 1 — Gastos recurrentes que revivían después de pagarlos

Textual: _"RENZO EL CABLE Y LAS EXPENSAS LAS MARCO COMO PAGADAS Y ME VUELVEN A APARECER"_.

Estaba pasando de verdad, y en tres gastos, no dos:

```
CABLE IMAGEN ARMST.  próxima 2026-09-10  último pagado 2026-09-10
EXPENSAS             próxima 2026-09-10  último pagado 2026-09-10
GAS CASA             próxima 2026-10-03  último pagado 2026-10-03
```

**No era el pago.** Registrar el pago funcionaba bien: `fn_registrar_pago_gasto` avanzaba la fecha al mes siguiente. Lo que la traía de vuelta era **editar el gasto después**. Los timestamps lo dejan claro: el pago del cable es del 07/09 a las 16:44 y el gasto se editó el 10/09 a las 17:52; los gastos que ella no editó quedaron todos bien.

**Causa:** la regla de "dónde cae el próximo vencimiento" estaba escrita dos veces — en `fn_calcular_proxima_fecha_gasto` (DB) y en `calcularProximaFechaVencimiento` (cliente). `gastosRecurrentesService.update()` la recalculaba **desde hoy** y la mandaba en el payload de cada edición, y el trigger de la DB no la revertía porque solo recalcula cuando cambia `dia_vencimiento`. Con vencimiento el día 10 y editando un día 10, el resultado era volver al período ya pagado.

**Se arregló en los dos lados:**

- El cálculo sale del cliente. El service ya no manda `proxima_fecha_vencimiento` ni en `create` ni en `update`; la pone la DB (regla 4 de `CLAUDE.md`: una regla de negocio, un solo lugar). Se borraron `calcularProximaFechaVencimiento` y `avanzarFechaVencimiento` de `utils/fechas.ts` — la segunda ya no se usaba ni en producción.
- Red de seguridad en la DB: el trigger ahora corre en **cualquier** UPDATE y nunca deja la próxima fecha en un período que ya tiene pago registrado, venga de donde venga.

**Un efecto de rebote que hubo que resolver:** `fn_eliminar_pago_gasto` retrocedía la fecha _antes_ de borrar el pago, así que el guard nuevo veía el pago que se estaba borrando y volvía a empujar la fecha adelante — deshacer un pago habría dejado de funcionar. Se reordenó: primero el `DELETE`, después el retroceso. Verificado en seco que deshacer sigue devolviendo la fecha al período correcto.

**Sobre el `NOT NULL`:** como el cliente ya no manda la columna, el tipo generado la seguía exigiendo en el `INSERT`. Se cambió el `NOT NULL` por un `CHECK (proxima_fecha_vencimiento IS NOT NULL)`, que garantiza lo mismo (el trigger `BEFORE` corre antes de los checks) pero deja la columna opcional en el tipo.

Las tres filas quedaron reparadas en producción.

**Para que Paola verifique:** entrar a Gastos, ver que el cable, las expensas y el gas de casa ya no figuran pendientes, y después editar cualquiera de esos tres (cambiarle una nota) y confirmar que no vuelven a aparecer.

### 2 — El comparativo entre períodos tampoco traía lo histórico

Paola por WhatsApp, con captura: _"fijate que lo histórico no me lo compara"_. Había puesto **Período A = 01/11/2025 → 10/09/2026** y le devolvía **$7.058.746,88 con 23 liquidaciones** — solo lo real de septiembre. Diez meses de facturación migrada quedaban afuera.

Es la mitad que faltó de la 0077. Ahí se arreglaron los tres reportes de arriba (mensual, por tipo, por empleada), que leen las vistas `*_con_historico`; el **comparativo entre períodos** quedó pegando derecho a `liquidaciones` y nadie lo notó porque el default compara el mes actual contra el mismo mes del año pasado, donde no hay nada de ninguna de las dos fuentes.

**Qué se hizo:** `getComparativoPeriodos` ahora consulta las dos fuentes por período y las suma. No usa las vistas `*_con_historico` porque esas agrupan por mes y acá los períodos son fechas sueltas (ella comparó hasta el 10/09). Va a las filas de `v_facturacion_historica_normalizada`, que ya trae excluidos los `SALDO INICIAL`, y mantiene el mismo corte limpio de fechas: sin migración nueva, solo el service.

Con su rango, el Período A pasa de $7.058.746,88 (23) a **$284.970.191,06 (375 comprobantes)**.

**Dos cosas para avisarle:**

1. Ese total **incluye los $78.284.834,40 de la fila de ZELARAYAN** que sigue sin confirmar (ver el pendiente de arriba). Sin ella son ~$206,7M.
2. Su Período B seguía dando **$0,00** y eso no es un error: había quedado en el default (agosto-septiembre 2025) y los datos arrancan en **noviembre de 2025**. Para comparar contra algo, el período B tiene que caer de nov-2025 en adelante.

### 3 — Reportes: gráficos, atajos en el comparativo y vista de tabla

Pedido de Renzo, no de Paola: _"lo que muestra me parece que está bien, solo lo haría un poco más lindo"_ — antes de mostrárselo a ella.

Lo que hay ahora:

- **Cuatro cifras arriba de todo**: ingresos base, facturado c/IVA, promedio mensual y mejor mes. El promedio se calcula sobre los meses **con movimiento**, no sobre 12: dividir por el año entero achicaría el promedio de un año que recién empieza.
- **Ingresos mensuales en columnas apiladas**: base abajo, IVA arriba, y el total apilado es el facturado. Se puede apilar porque en los 11 meses cargados el facturado nunca queda por debajo de la base (verificado en la base). El mes más alto va a color pleno y el resto apenas atenuado — es "énfasis", que muestra el pico sin gastar un color nuevo.
- **Rankings en barras horizontales** para tipo de servicio y empleada, con el valor y el porcentaje siempre visibles (no escondidos detrás del hover) y la cola plegada en "Otros".
- **Cada sección tiene conmutador Gráfico / Tabla.** La tabla no es un extra: es el equivalente accesible: todo lo que el gráfico dice con color o largo de barra tiene que poder leerse como número.
- **El comparativo estrena atajos**: "este mes vs. el anterior", "vs. el mismo mes del año pasado", "últimos 3 meses vs. los 3 anteriores" y "este año vs. el pasado". Compara las tres métricas (base, facturado y cantidad), cada una con su propia escala — importes y cantidad de comprobantes son magnitudes distintas y meterlas en un solo eje inventaría una relación entre ellas.
- **Cuando el período B cae antes de nov-2025 lo avisa** en vez de mostrar $0,00 a secas. Es exactamente lo que la confundió a Paola: ahora dice que el sistema arranca en noviembre de 2025 y que mueva el rango.

**Sobre los colores:** salen de la paleta categórica validada del skill de dataviz, la misma que ya usaba el gráfico de gastos. Se corrieron contra la superficie real de la app (`#ffffff`) y pasan las seis pruebas, incluida la separación para daltonismo. El ámbar de la marca **no** se usa para las barras: sobre blanco da 2,68:1 de contraste y queda por debajo del piso; se queda en el chrome de la UI.

**Un bug que apareció al revisarlo en el navegador:** los rangos por defecto del comparativo se calculaban durante el render, o sea también en el server. Vercel corre en UTC, así que entre las 21 y la medianoche de Argentina el server ya estaba en el día siguiente y los rangos salían con un día de más. Ahora "hoy" se resuelve recién en el navegador (`useSyncExternalStore`, sin efectos, que el linter del proyecto no permite).

⚠️ **Los gráficos dejan la fila de ZELARAYAN a la vista.** Con $78,3M en una sola fila, agosto se lleva media escala del gráfico mensual y aplasta a los otros meses, Victoria queda primera con 20 trabajos contra los 197 de Luciana, y el comparativo contra agosto da −93,6%. No se tocó nada: es el pendiente de confirmación de arriba. Pero conviene resolverlo **antes** de mostrarle los reportes a Paola.

---

## 2026-09-17

| #   | Pedido                                                                                        | Estado            |
| :-- | :-------------------------------------------------------------------------------------------- | :---------------- |
| 1   | "No puedo sacar los cheques cuando los cambio en una cueva o los saco para pagar algo propio" | ✅ migración 0082 |

Textual, con captura del formulario de endoso trabado: _"fijate que no puedo sacar los cheques cuando los cambio en una cueva o los saco para pagar algo propio"_ / _"me debería dejar sacarlos poniendo solamente la nota de lo que hice sin que se impute a una factura"_.

**El problema era real y el formulario de la captura lo muestra:** eligió **Endosado** sobre un cheque de $1.253.000 y quedó frenada en **"Compra a pagar \*"**, que es obligatorio. Un cheque de tercero en cartera tenía tres salidas y ninguna servía para lo que ella hace:

- **Depositado** → lo manda a Banco, y esa plata nunca entró al banco.
- **Endosado** → `fn_endosar_cheque_a_proveedor` (0054) exige proveedor **y** factura impaga. Si el cheque se fue a una cueva o a un gasto suyo no hay factura que imputar.
- **Rechazado / Anulado** → dicen que la plata nunca existió. Es mentira: el cheque salió y, en el caso de la cueva, entró plata a cambio.

Resultado: el cheque se quedaba en cartera para siempre y `saldo_cheques_cartera` mentía. Había **5 cheques en cartera por $4.938.500** cuando se hizo el arreglo.

### Cómo quedó

En **Fondos > Cheques > Cambiar estado**, la opción pasó a llamarse **"Entregado / endosado (se lo di a alguien)"** y antes de pedir datos pregunta qué hizo con el cheque:

| Elección                    | Qué registra                                                                                                                                                 |
| :-------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Se lo di a un proveedor** | El endoso de siempre (0054): proveedor + factura impaga + importe.                                                                                           |
| **Lo cambié en una cueva**  | Sale el cheque de cartera por su importe y entra lo que le dieron, en efectivo o por transferencia. La diferencia baja la caja sola: es el costo del cambio. |
| **Lo usé para algo mío**    | Sale de cartera y no entra nada al estudio.                                                                                                                  |
| **En los dos últimos**      | La nota es obligatoria y es el único dato que se le pide además de la fecha. El cheque queda **Endosado**, sin proveedor.                                    |

**No se crea un gasto en ninguno de los dos casos nuevos.** Ella pidió "solamente la nota", y además es el mismo criterio de la 0075: la plata personal se va de la caja, no del resultado del estudio.

**Si se equivoca, se deshace:** volver el cheque a "En cartera" borra los movimientos de la salida y devuelve la plata a donde estaba (trigger `trigger_revertir_salida_cheque`). Se hizo con trigger propio porque el de la 0060 solo entiende Rechazado/Anulado y ahí pone los importes en cero en vez de borrar la fila — con una contrapartida en efectivo eso dejaría viva la plata que entró.

### Verificado

Prueba en seco contra producción, dentro de `BEGIN … ROLLBACK`, con `request.jwt.claims` seteado a un admin real para no tocar `is_admin()`. Ocho chequeos: cambio en cueva (cartera −$227.500 / efectivo +$200.000, banco quieto), el cheque no se puede sacar dos veces, la reversión deja los tres saldos exactamente como estaban y sin movimientos huérfanos, uso personal (un solo movimiento, no toca efectivo ni banco), rechazo posterior a la salida, nota vacía, tope de importe y cobro por transferencia. Migración aplicada; `SELECT` de control: 0 filas `cheque_salida`, o sea que no quedó nada de la prueba.

**Para que Paola verifique:** entrar a **Fondos > Cheques > En cartera**, elegir un cheque que de verdad haya cambiado, **Cambiar estado > Entregado / endosado**, marcar **"Lo cambié en una cueva"**, poner cuánto le dieron y la nota. Después mirar que **Cheques en cartera** bajó por el total del cheque y **Efectivo** subió por lo que le dieron.

### Lo que quedó abierto

El **endoso a proveedor sigue sin reversión**: volver ese cheque a "En cartera" deja vivo el pago a la compra y la caja queda descuadrada. Es el mismo agujero que la 0075 tapó para las compras, pero del lado del cheque. No se tocó acá porque no es lo que ella reportó.

### 2 — "Los movimientos de Tarallo y de dólares no los puedo ver en ningún lado"

Textual, con captura de las tarjetas **DÓLARES $ 50,00** y **TARALLO $ 0,00**: _"fijate que los movimientos de tarallo y de dólares no los puedo ver en ningún lado, a qué se deben"_.

**Los movimientos estaban, pero fuera de la pantalla.** La tabla de Fondos tenía nueve columnas fijas (Fecha, Tipo, Concepto, Banco, Cheques cartera, Efectivo, Dólares, Tarallo, borrar) dentro de un `overflow-x-auto`. En su monitor, con el sidebar, Dólares y Tarallo caían del borde derecho y había que scrollear la tabla en horizontal para verlas. Nunca lo hizo, y es razonable que no lo hiciera.

**Tres cambios:**

1. **Las tarjetas de saldo son botones.** Click en "Dólares" y el listado muestra solo los movimientos que tocaron dólares; click de nuevo, o en la cruz del chip "Solo Dólares", vuelve a mostrar todo. El filtro va al servidor (`fondosService.getMovimientos({ cuenta })` con un `neq(columna, 0)`), así que la paginación no miente. Un movimiento que toca dos cuentas — comprar dólares con efectivo — aparece bajo cualquiera de las dos.
2. **La tabla esconde las columnas que están en cero** en las filas que se ven. Sin filtro y con la caja como está hoy quedan cuatro columnas de importe en vez de cinco; con "Solo Dólares" quedan dos. Ya no hace falta scrollear.
3. **Los dólares se muestran como dólares.** `formatMoney(v, 'USD')` → **US$ 50,00**, no "$ 50,00", que se leía como pesos. También en el label del formulario ("Dólares US$").

### ⚠️ Lo que apareció mirando esos movimientos: no hay forma de cargar bien una compra de dólares

Las dos únicas filas con dólares las cargó ella hoy a mano:

| Hora  | Tipo    | Concepto           | Efectivo       | USD  | Nota                                                         |
| :---- | :------ | :----------------- | :------------- | :--- | :----------------------------------------------------------- |
| 18:30 | INGRESO | Compra USD         | **+1.248.000** | +800 | "compra dolares a piñero con efectivo del cambio del cheque" |
| 18:30 | EGRESO  | Pago a proveedores | —              | −750 | "pago a renzo asef fin del programa"                         |

La primera fila está mal, y **no es culpa suya: el sistema no le deja hacerlo bien.** Un movimiento tiene un solo `tipo_movimiento`, así que al marcarlo INGRESO los 1.248.000 de efectivo **entraron** en vez de salir. Y "Transferir entre cuentas" tampoco sirve: `fn_transferir_fondos` (0061) mueve **el mismo número** de una cuenta a la otra, o sea que efectivo → dólares le habría metido 1.248.000 dólares. No hay campo de cotización.

**Estado de la caja:** Efectivo da **$781.341,43** y está **inflado en $1.248.000**. Encima el cheque del que salió esa plata — **68579950, MACRO, $1.253.000** — sigue figurando EN CARTERA, porque cambió el cheque en la cueva antes de que estuviera la salida de la 0082.

La secuencia correcta, una vez deployado, sería: sacar el cheque con "Lo cambié en una cueva" (cartera −1.253.000, efectivo +1.248.000, y los $5.000 de diferencia quedan como costo del cambio) y después registrar la compra de dólares como salida de efectivo + entrada de USD. **Ese segundo paso todavía no tiene forma limpia de cargarse.** Falta una transferencia con cotización: "salen X pesos, entran Y dólares".

**No se tocó nada de su caja.** Los números son de ella y la corrección se hace con ella, no por atrás.

### 3 — Transferencia con cotización (migración 0083)

Se cerró el hueco de arriba en la misma sesión. `fn_transferir_fondos` pasa a tener **un importe por lado**: `p_importe` es lo que sale del origen y `p_importe_destino` lo que entra al destino. Omitirlo deja el comportamiento viejo, así que las transferencias que ya existían no cambian.

**Los importes solo pueden diferir cuando hay cambio de moneda**, o sea cuando exactamente una punta es Dólares. Banco, efectivo y tarallo son todos pesos: mover $100 de banco a efectivo tiene que llegar como $100, y dejar que no coincidan sería abrir la puerta a que se pierda plata en una transferencia sin que nadie se entere. La DB lo rechaza y el formulario ni siquiera pregunta.

En la pantalla, al elegir Dólares de un lado aparece un segundo campo — "Sale de Efectivo" / "Entra en Dólares" — y debajo **la cotización calculada en vivo** ("Cotización: US$ 1 = $1.560,00"), para que pueda controlarla antes de guardar. La regla de qué es cambio de moneda vive en `esCambioDeMoneda()`, que usan el schema Zod y el formulario, y en la función de la DB.

No se guarda la cotización en una columna: las dos filas quedan unidas por el mismo `referencia_id` y cada una muestra su importe en la columna de su cuenta, así que el tipo de cambio se lee de las dos filas juntas.

**Se hizo `DROP` + `CREATE` en vez de `CREATE OR REPLACE`:** agregar un parámetro con default crea una **segunda** función en vez de reemplazar la vieja, y las dos sobrecargas dejarían ambigua la llamada de seis argumentos desde PostgREST.

**Verificado** en seco contra producción dentro de `BEGIN … ROLLBACK`, 7 chequeos: compra de dólares (efectivo −$1.248.000 / USD +800, dos filas con el mismo `referencia_id`), venta de dólares, rechazo de pesos con importes distintos, la llamada vieja de 6 argumentos sin cambios, mismo importe explícito permitido, importe destino en cero rechazado, y que quede **una sola** sobrecarga. Aplicada.
