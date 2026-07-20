# Preparación Reunión — Flujo de Trabajos y Vencimientos

**Fecha reunión:** Martes (próxima semana)  
**Participantes:** Renzo + Paola  
**Objetivo:** Definir el flujo completo de trabajos: desde el vencimiento hasta el cobro al cliente

---

## 1. Flujo propuesto para validar con Paola

Esto es lo que entendemos del sistema. Confirmar si es correcto o ajustar.

```
[VENCIMIENTOS]
Paola carga el calendario de obligaciones por cliente
Ej: "Ganancias PF — Cliente Rodríguez — vence 30/6"
         ↓
[ASIGNACIÓN]
Ese vencimiento se asigna a una empleada (Luciana o Victoria)
         ↓
[TRABAJO — Empleada]
La empleada ingresa a "Mis Trabajos"
Ve sus trabajos pendientes ordenados por fecha de vencimiento
Carga los datos del trabajo (campos según tipo)
Marca como TERMINADO cuando está listo
         ↓
[APROBACIÓN — Paola]
Paola ve en "Trabajos" los trabajos terminados pendientes de aprobación
Revisa y aprueba (o rechaza con comentario)
         ↓
[COLA DE FACTURA PENDIENTE]
El trabajo aprobado pasa automáticamente a una cola "Pendiente de facturar"
Paola NO necesita ir al cliente manualmente
         ↓
[CARGA DE FACTURA — Paola]
Paola va a la cola, elige el trabajo, carga:
  - Número de factura/comprobante
  - Fecha de emisión
  - Importe
Da aceptar → el sistema crea automáticamente el cargo en la CC del cliente
         ↓
[CUENTA CORRIENTE — Cliente]
El cliente aparece con saldo deudor en la CC
         ↓
[PAGO — cuando el cliente paga]
Paola va a la CC del cliente y registra el pago/recibo
El saldo queda en cero (o parcial si paga a cuenta)
```

**Preguntar a Paola: ¿Este flujo refleja cómo lo imaginás? ¿Falta algún paso? ¿Sobra alguno?**

---

## 2. Tipos de trabajo y campos — completar con Paola

Necesitamos que Paola dicte todos los tipos de trabajo que existen y qué datos hay que cargar en cada uno.

### Tipos conocidos (confirmar y completar):

| Tipo de trabajo           | ¿Quién lo hace?    | Frecuencia | Campos que necesita                       |
| ------------------------- | ------------------ | ---------- | ----------------------------------------- |
| Honorario mensual         | Luciana / Victoria | Mensual    | ¿período, monto?                          |
| Ganancias PF              | Luciana            | Anual      | ¿período, categoría, ¿vencimiento?        |
| Ganancias PJ (Sociedades) | Luciana            | Anual      | ¿período, razón social?                   |
| Balance                   | Luciana            | Anual      | ¿período, tipo de sociedad?               |
| Saldo técnico             | Victoria           | A demanda  | ¿descripción, avance %, fecha inicio/fin? |
| ???                       | ???                | ???        | ???                                       |

**Pedirle a Paola:** "¿Me dictás todos los tipos de trabajo que existen, y para cada uno me decís qué datos tiene que completar la empleada cuando lo termina?"

---

## 3. Preguntas clave por tema

### 3.1 Sobre el calendario de vencimientos

- ¿Los vencimientos del año los cargás vos al inicio del año para todos los clientes, o los vas cargando mes a mes?
- ¿Hay fechas que se repiten igual todos los años (ej: Ganancias PF siempre el 30 de junio)? Si es así, ¿te gustaría que el sistema las pre-cargue automáticamente?
- ¿Un vencimiento es siempre de un cliente específico, o hay vencimientos generales del estudio (ej: vence el IVA del estudio)?
- ¿Vencimientos = trabajos que tiene que hacer la empleada, o hay vencimientos que Paola solo quiere ver pero no generan trabajo?

### 3.2 Sobre la asignación a empleadas

- ¿Quién asigna el trabajo a cada empleada? ¿Lo hacés vos Paola, o la empleada "toma" el trabajo de una lista?
- ¿Una empleada puede ver los trabajos asignados a la otra, o solo ve los propios?
- ¿Hay trabajos que puede hacer cualquiera de las dos, o cada tipo de trabajo siempre es de la misma empleada?

### 3.3 Sobre los datos del trabajo

- ¿El importe del trabajo (cuánto se le va a cobrar al cliente) lo carga la empleada al terminar, o lo define Paola al aprobar/facturar?
- En el caso de **saldo técnico de Victoria**: ¿maneja sub-etapas de avance, o solo pendiente / terminado?
- ¿Hay trabajos que NO generan cobro al cliente? (trabajos internos, sin impacto en CC)

### 3.4 Sobre la aprobación y facturación

- Cuando Paola aprueba un trabajo, ¿siempre genera una factura nueva, o a veces se acumulan varios trabajos en una sola factura al cliente?
- ¿Los honorarios mensuales fijos (los que se generan automáticamente cada mes) pasan por este mismo flujo de trabajos, o van por separado?
- ¿Qué pasa si Paola rechaza un trabajo? ¿La empleada lo corrige y reenvía?

### 3.5 Sobre la cuenta corriente (para que Renzo entienda)

- Cuando cargás una factura en el sistema, ¿solo guardás el número de comprobante como referencia, o necesitás que el sistema lleve el libro de facturas?
- ¿Los recibos de pago también los emitís externamente (AFIP), o son internos del sistema?
- Si un cliente paga con cheque, ¿ya está cubierto por el módulo de Cheques existente?

### 3.6 Sobre las empleadas específicamente

- Mencionaste que Luciana tiene vencimientos mensuales y anuales. ¿Cuáles son los mensuales fijos que hace Luciana todos los meses?
- Victoria hace "saldo técnico" — ¿estos son trabajos que le asignás vos Paola, o Victoria los va tomando sola?
- ¿Las empleadas tienen que poder ver la cuenta corriente de los clientes, o solo ven sus propios trabajos?

---

## 4. Lo que ya existe en el sistema (para contexto)

| Módulo        | Estado                      | Qué hace                                   |
| ------------- | --------------------------- | ------------------------------------------ |
| Dashboard     | En construcción             | Métricas generales                         |
| Clientes      | ✅ Listo                    | ABM de clientes, claves AFIP               |
| Honorarios    | ✅ Listo                    | Cuotas mensuales fijas por cliente         |
| Cobranzas     | ✅ Listo                    | CC del cliente, liquidaciones, pagos       |
| Trabajos      | ✅ Listo                    | Trabajos anuales, estados, asignación      |
| Empleadas     | ✅ Listo                    | Liquidación de sueldos, comisiones, puntos |
| Vencimientos  | ✅ Listo                    | Calendario de vencimientos                 |
| Fondos        | ✅ Listo (sin link en menú) | Caja, cheques                              |
| Proveedores   | ✅ Listo (sin link en menú) | Gastos del estudio                         |
| Configuración | ✅ Listo                    | Parámetros del sistema                     |

**Lo que falta construir:**

- Vínculo entre Vencimientos → Trabajos (asignación automática)
- Cola "Pendiente de facturar" después de que Paola aprueba un trabajo
- Que al cargar la factura se cree el cargo en la CC del cliente automáticamente
- Dashboard completo (fase 3)

---

## 5. Cosas para anotar durante la reunión

Usar esta sección para completar en la reunión:

**Tipos de trabajo dictados por Paola:**

- [ ] ...

**Campos de cada tipo de trabajo:**

- [ ] ...

**Flujo confirmado / ajustado:**

- [ ] ...

**Decisiones tomadas:**

- [ ] ...

**Pendientes para la próxima sesión:**

- [ ] ...
