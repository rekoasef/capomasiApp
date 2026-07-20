# Documento Reunión

# Definición del Flujo de Trabajos, Vencimientos y Facturación

**Fecha de reunión:**  
**Participantes:** Paola – Renzo

**Objetivo:**  
Definir el circuito completo desde la generación de un vencimiento hasta el cobro al cliente, validando procesos, responsabilidades y automatizaciones necesarias dentro del sistema.

---

# 1. Flujo Propuesto para Validación

A continuación se detalla el flujo actualmente interpretado para el funcionamiento del sistema. Durante la reunión deberá confirmarse si refleja correctamente la operatoria del estudio o si requiere ajustes.

## Etapa 1 – Vencimientos

Paola registra las obligaciones o vencimientos de cada cliente.

### Ejemplo

- Cliente: Rodríguez
- Obligación: Ganancias Persona Física
- Fecha de vencimiento: 30/06

### Resultado

Se genera un vencimiento asociado al cliente.

---

## Etapa 2 – Asignación

El vencimiento se asigna a una empleada responsable.

### Ejemplos

- Luciana
- Victoria

### Resultado

Se genera automáticamente un trabajo pendiente para la empleada asignada.

### Pregunta

¿Hay vencimientos que siempre le corresponden a la misma empleada? Para automatizar esa parte.

---

## Etapa 3 – Ejecución del Trabajo

La empleada accede al módulo **"Mis Trabajos"**.

Desde allí puede:

- Visualizar sus trabajos pendientes.
- Verlos ordenados por fecha de vencimiento.
- Completar los datos requeridos para cada tipo de trabajo.
- Marcar el trabajo como **Terminado** cuando finaliza la tarea.

### Resultado

El trabajo queda disponible para revisión.

---

## Etapa 4 – Revisión y Aprobación

Paola accede al listado de trabajos terminados pendientes de revisión.

### Opciones disponibles

#### Aprobar

El trabajo continúa al siguiente paso.

#### Rechazar

Se devuelve a la empleada con observaciones para su corrección.

### Resultado

Solo los trabajos aprobados avanzan al proceso de facturación.

---

## Etapa 5 – Cola de Facturación Pendiente

Los trabajos aprobados ingresan automáticamente a una cola denominada:

> Pendiente de Facturar

### Objetivo

Evitar que Paola tenga que buscar manualmente cada trabajo o cliente para generar la factura correspondiente.

---

## Etapa 6 – Registro de Factura

Desde la cola de pendientes, Paola selecciona el trabajo y completa:

- Número de factura o comprobante.
- Fecha de emisión.
- Importe.

### Al confirmar

- El sistema registra la factura.
- Se genera automáticamente el movimiento en la cuenta corriente del cliente.

### Resultado

El cliente pasa a tener saldo deudor.

---

## Etapa 7 – Cuenta Corriente

El movimiento generado aparece en la cuenta corriente del cliente.

### Información disponible

- Fecha
- Concepto
- Importe
- Saldo

### Resultado

La deuda queda registrada para futuras cobranzas.

---

## Etapa 8 – Registro de Pago

Cuando el cliente realiza un pago:

1. Paola accede a la cuenta corriente.
2. Registra el recibo o pago recibido.
3. El sistema descuenta el importe correspondiente.

### Resultado

- Saldo cancelado si el pago es total.
- Saldo pendiente si el pago es parcial.

---

## Pregunta Principal para Validación

¿Este flujo representa correctamente la operatoria del estudio?

### Confirmar

- Si existe algún paso faltante.
- Si algún paso debe modificarse.
- Si existe algún escenario especial que no esté contemplado.

---

# 2. Tipos de Trabajo y Datos Requeridos

Se necesita relevar todos los tipos de trabajo que realiza el estudio y la información que debe completar la empleada al finalizar cada uno.

## Tipos actualmente identificados

| Tipo de Trabajo            | Responsable        | Frecuencia |
| -------------------------- | ------------------ | ---------- |
| Honorario mensual          | Luciana / Victoria | Mensual    |
| Ganancias Persona Física   | Luciana            | Anual      |
| Ganancias Persona Jurídica | Luciana            | Anual      |
| Estados Contables          | Luciana            | Anual      |
| Saldo Técnico Exportación  | Victoria           | A demanda  |
| Saldo Técnico SIR          | Victoria           | A demanda  |
| Secretaría de Industria    | Victoria           | A demanda  |
| Otros                      | A definir          | A definir  |

## Solicitud para Paola

Enumerar todos los tipos de trabajo existentes e indicar:

- Qué datos debe cargar la empleada.
- Qué información se necesita para aprobar el trabajo.
- Qué información se utiliza posteriormente para facturación.

---

### Comentarios relevados

**Paola (23/06/2026 14:51)**

> Ahora solo tildan lo que hicieron con los vencimientos, por ejemplo Luciana.

> Pero de Victoria yo quisiera que pueda ir poniendo al lado si está presentado, en qué fecha o si falta algo, como los avances de los trabajos para ir viendo.

---

## Definición más precisa del flujo

### Configuración inicial

1. Se ingresa el cliente.
2. Paola asigna los trabajos correspondientes al cliente.
3. Cada trabajo posee una cantidad de puntos.
4. Algunos trabajos pueden valer 0 puntos.

### Configuración de vencimientos

Cada trabajo debe configurarse con:

- Tipo de vencimiento:
  - Mensual
  - Anual

Si es mensual:

- Día del mes de vencimiento.

Si es anual:

- Fecha anual de vencimiento.

También debe configurarse:

- Responsable del trabajo:
  - Luciana
  - Victoria

Esta configuración se realiza una sola vez.

---

### Flujo de Luciana

1. Visualiza sus trabajos en un calendario.
2. Selecciona un trabajo.
3. Lo marca como realizado.
4. Agrega observaciones.
5. Envía para aprobación.

Cuando Paola aprueba:

- Si el trabajo tiene puntos:
  - Se suman a Luciana.
- Si vale 0:
  - No suma puntos.

Se mantiene historial completo de:

- Trabajos realizados.
- Fecha.
- Observaciones.
- Puntos obtenidos.

---

### Flujo de Victoria

Victoria trabaja con tareas de seguimiento y avance.

Ejemplos:

- Saldo Técnico SIR
- Saldo Exportación
- Secretaría de Industria

Paola asigna manualmente el trabajo.

Victoria puede indicar estados:

- Iniciado
- En proceso
- Terminado

Además puede agregar observaciones para informar avances.

Esto permite que Paola tenga visibilidad en tiempo real del estado de cada gestión.

---

# 3. Preguntas para Relevamiento

## 3.1 Calendario de Vencimientos

- ¿Los vencimientos se cargan anualmente o de manera mensual?
  - Algunos mensuales y otros anuales.

- ¿Existen vencimientos repetitivos que podrían generarse automáticamente?
  - Sí.

- ¿Todos los vencimientos pertenecen a clientes?
  - Sí.

- ¿Existen vencimientos informativos que no generen trabajo?
  - No. Todos generan trabajos, solo que no todos se comisionan.

---

## 3.2 Asignación de Trabajos

- ¿Quién asigna los trabajos?
  - Paola.

- ¿Las empleadas pueden autoasignarse tareas?
  - Sí.

- ¿Cada empleada ve únicamente sus trabajos?
  - No. Deben poder ver los de todas.

- ¿Existen trabajos que puedan realizar ambas empleadas?
  - Sí.

---

## 3.3 Información del Trabajo

- ¿Quién define el importe a cobrar al cliente?
  - Paola.

- ¿Saldo Técnico requiere estados intermedios de avance?
  - Sí.

- ¿Existen trabajos sin facturación asociada?
  - Sí.

---

## 3.4 Aprobación y Facturación

- ¿Cada trabajo genera una factura independiente?
  - Sí.

- ¿Pueden agruparse varios trabajos en una sola factura?
  - Sí.

- ¿Los honorarios mensuales siguen este mismo circuito?
  - No.

- ¿Qué ocurre cuando un trabajo es rechazado?
  - Nunca es rechazado.

---

## 3.5 Cuenta Corriente

- ¿La factura se utiliza solo como referencia o se administrará un libro de comprobantes?
  - Existe el libro IVA Ventas de AFIP por fuera del sistema.

---

## 3.6 Operatoria de las Empleadas

### Luciana

- ¿Cuáles son los trabajos mensuales recurrentes?
  - Los carga manualmente Paola.

- ¿Cuáles son los trabajos anuales recurrentes?
  - Los carga manualmente Paola.

### Victoria

- ¿Los saldos técnicos se asignan o los toma de una bandeja?
  - Se los asigna Paola.

- ¿Cómo se mide el avance de este tipo de trabajo?
  - Actualmente mediante consultas directas.

### Visibilidad

- ¿Las empleadas pueden visualizar información de cuenta corriente?
  - No.

- ¿Únicamente deben ver sus trabajos asignados?
  - Sí.

---

# 4. Estado Actual del Sistema

| Módulo        | Estado          | Descripción                        |
| ------------- | --------------- | ---------------------------------- |
| Dashboard     | En construcción | Métricas e indicadores             |
| Clientes      | Finalizado      | Gestión de clientes y claves AFIP  |
| Honorarios    | Finalizado      | Cuotas mensuales                   |
| Cobranzas     | Finalizado      | Cuenta corriente y pagos           |
| Trabajos      | Finalizado      | Gestión de trabajos y estados      |
| Empleadas     | Finalizado      | Liquidaciones, puntos y comisiones |
| Vencimientos  | Finalizado      | Calendario de obligaciones         |
| Fondos        | Finalizado      | Caja y cheques                     |
| Proveedores   | Finalizado      | Gastos del estudio                 |
| Configuración | Finalizado      | Parámetros generales               |

---

# 5. Funcionalidades Pendientes

## Integración Vencimientos → Trabajos

Generación automática de trabajos a partir de vencimientos.

## Cola de Facturación

Creación automática de una bandeja de trabajos aprobados pendientes de facturar.

## Integración con Cuenta Corriente

Generación automática de cargos al registrar una factura.

## Dashboard General

Desarrollo de métricas e indicadores operativos para la dirección del estudio.

---

# Observación Final

**GENIALLLLLLLL!!!!!!!!!!!!!**
