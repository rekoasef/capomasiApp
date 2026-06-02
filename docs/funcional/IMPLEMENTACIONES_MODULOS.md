# Implementaciones de Nuevos Módulos

---

# 1. Módulo de Comisiones de Empleadas

Se propone implementar distintos métodos de cálculo de comisiones, permitiendo asignar a cada empleada el esquema correspondiente según su modalidad de trabajo.

---

## 1.1 Comisión por Producción / Facturación

### Funcionamiento

El sistema calculará automáticamente el total de trabajos realizados por la empleada durante el mes.

#### Ejemplo

- Total trabajado en el mes: `$5.000.000`

Sobre ese total, el sistema permitirá definir:

- Comisión por porcentaje.
  - Ejemplo: `5%` sobre el total trabajado.

O bien:

- Comisión por monto fijo.
  - Ejemplo: `$150.000` finales.

### Características

- Configurable por empleada.
- Cálculo automático mensual.
- Historial de liquidaciones.
- Registro de fechas y observaciones.

---

## 1.2 Comisión por Puntaje / Objetivos

### Funcionamiento

Cada empleada tendrá asignadas diferentes tareas u objetivos con puntajes específicos.

Al finalizar el mes:

- El administrador completará la tabla de puntajes.
- El sistema sumará automáticamente los puntos obtenidos.

### Lógica de acumulación

- Si la empleada supera el mínimo requerido (ejemplo: `15,5 puntos`), obtiene la comisión.
- Si no alcanza el mínimo, los puntos se acumulan para el mes siguiente.

#### Ejemplo

- Mes 1: obtiene `10 puntos` → no cobra comisión.
- Mes 2: obtiene `6 puntos` → total acumulado: `16 puntos`.
- Se libera la comisión y se descuentan los `15,5 puntos` utilizados.

### Configuración

La comisión podrá definirse:

- Por porcentaje.
- Por monto fijo.

### Características

- Sistema acumulativo.
- Historial mensual.
- Registro de tareas y puntajes.
- Configuración flexible por empleada.

---

## 1.3 Comisión por Horas Trabajadas

### Funcionamiento

Sistema orientado a empleadas que cobran por cantidad de horas trabajadas.

El sistema permitirá:

- Registrar horas trabajadas.
- Definir valor por hora.
- Calcular automáticamente el total mensual.

### Características

- Registro mensual de horas.
- Historial de liquidaciones.
- Configuración individual por empleada.

---

# 2. Módulo de Creación y Gestión de Empleadas

## Objetivo

Centralizar toda la información de cada empleada en un perfil individual.

---

## Datos Iniciales Sugeridos

### Información Personal

- Nombre
- Apellido
- Fecha de nacimiento
- Localidad
- DNI
- Correo electrónico

### Información Laboral

- Tipo de comisión asignada
- Sueldo fijo
- Valor hora (si aplica)
- Estado de la empleada
- Fecha de ingreso

---

## Observaciones

Se recomienda validar junto a la clienta si necesita incluir:

- CBU / Alias
- Teléfono
- Dirección
- Obra social
- Categoría laboral
- Datos impositivos

---

# 3. Módulo de Sueldos y Liquidaciones

## Objetivo

Gestionar el historial completo de liquidaciones mensuales de cada empleada.

Cada perfil deberá contener:

- Sueldo fijo
- Tipo de comisión
- Premios
- Aguinaldo
- Vacaciones
- Descuentos
- Formas de pago
- Observaciones
- Historial mensual

---

## 3.1 Historial y Trazabilidad

### El sistema deberá:

- Guardar cada modificación realizada.
- Registrar fecha de cambios.
- Permitir agregar observaciones.
- Mantener historial completo por mes.

### Ejemplos

- Aumento de sueldo
- Cambio de modalidad de comisión
- Ajustes manuales
- Pagos adicionales

---

## 3.2 Conceptos de Liquidación

### Ingresos

- Sueldo fijo
- Premios
- Comisiones
- Aguinaldo
- Vacaciones
- Estados contables
- Ganancias y bienes personales

### Descuentos

- Ingresos Brutos
- Monotributo
- Otros descuentos

### Formas de Pago

- Transferencia bancaria
- Efectivo
- Cheques

### Resultado Final

- Subtotal
- Total
- Saldo pendiente

---

# 4. Legajo Digital de Empleadas

Cada empleada tendrá un legajo digital con:

- Datos personales
- Historial salarial
- Liquidaciones mensuales
- Registro de pagos
- Observaciones administrativas
- Historial de aumentos
- Historial de premios y comisiones

---

## Beneficio

Esto permitirá tener toda la información organizada y accesible desde un único lugar.