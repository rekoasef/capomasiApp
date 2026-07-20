| Sistema de Gestión Integral Estudio Contable Capomasi Propuesta de funcionalidades y presupuesto |
| :----------------------------------------------------------------------------------------------: |

| Preparado por Renzo Asef radevelopment02@gmail.com | 3471343991 | Para Paola Capomasi Estudio Contable | Armstrong, Santa Fe |
| :---- | :---- |

Abril 2026 — Versión 1.0

# **Introducción**

A partir de la información compartida y el análisis de la planilla de trabajo actual, se desarrollará un sistema web que centralice toda la operatoria del estudio: clientes, honorarios, cuentas corrientes, fondos, sueldos, vencimientos y más.

El objetivo es que tanto Paola como su equipo puedan acceder al sistema desde cualquier dispositivo (computadora, tablet o celular), sin necesidad de instalar nada, y que cada persona vea únicamente lo que le corresponde según su rol.

| La facturación electrónica continuará realizándose por fuera del sistema, con el software SOS que ya utilizan. Este sistema es el complemento de gestión y registro interno del estudio. |
| :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

# **Funcionalidades del Sistema**

A continuación se detalla todo lo que se podrá hacer dentro de la plataforma, organizado por módulo.

| 👥 Módulo 1 Gestión deClientes | ✓ Ver, agregar, editar y dar de baja clientes ✓ Datos completos: CUIT, domicilio, teléfono, mail ✓ Claves de acceso del cliente: AFIP, ANSES, Sindicato, ARBA (solo visibles para el administrador) ✓ Responsable asignado del estudio por cliente ✓ Notas y observaciones internas por cliente ✓ Búsqueda rápida por nombre, CUIT o localidad |
| :----------------------------: | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

| 💰 Módulo 2 Honorarios Mensuales | ✓ Configurar el honorario mensual de cada cliente ✓ Registrar la periodicidad de actualización (cada 2 meses, cada 3 meses, etc.) ✓ Aplicar porcentaje de inflación para calcular el nuevo monto actualizado ✓ Ver el historial de honorarios de cada cliente mes a mes ✓ Visualizar qué clientes tienen actualización pendiente |
| :------------------------------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

| 📋 Módulo 3 Trabajos Anuales | ✓ Registrar los trabajos anuales de cada cliente: balances, ganancias y bienes personales, ISIB, etc. ✓ Registrar el honorario cobrado por cada trabajo ✓ Estado de cada trabajo: pendiente, en proceso, finalizado, cobrado ✓ Historial de trabajos por cliente y por año |
| :--------------------------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

| 📒 Módulo 4 Cuentas Corrientes | ✓ Ver el saldo actualizado de cada cliente en tiempo real ✓ Registrar honorarios devengados (débitos) y pagos recibidos (créditos) ✓ Ver la antigüedad de cada deuda pendiente ✓ Listado de clientes con saldo deudor ✓ Historial completo de movimientos por cliente |
| :----------------------------: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

| 🏦 Módulo 5 Control de Fondos | ✓ Registrar ingresos y egresos de caja ✓ Gestión de cheques recibidos: disponibles, depositados, endosados ✓ Gestión de cheques emitidos: a quién, por qué importe, en qué banco ✓ Registro de transferencias bancarias ✓ Saldo de caja en tiempo real |
| :---------------------------: | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

| 👩‍💼 Módulo 6 Liquidación del Personal | ✓ Liquidación mensual de sueldo por empleada ✓ Cálculo de premios, aguinaldo y vacaciones ✓ Registro de empleadas en relación de dependencia y por hora ✓ Historial de pagos realizados a cada empleada ✓ Retenciones y conceptos descontados (IIBB, monotributo, etc.) |
| :----------------------------------: | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

| 📅 Módulo 7 Vencimientos | ✓ Calendario de vencimientos impositivos por cliente (AFIP, IIBB, etc.) ✓ Ver qué trabajos hay que hacer para cada cliente en el mes ✓ Si falta una empleada, cualquiera puede ver qué tiene pendiente esa persona ✓ Vencimientos personales de la contadora (servicios, impuestos, seguros, etc.) ✓ Alertas visuales de vencimientos próximos |
| :----------------------: | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

| 🧾 Módulo 8 Proveedores y Gastos | ✓ Base de datos de proveedores del estudio ✓ Registro de compras y gastos con múltiples formas de pago (transferencia, efectivo, cheque) ✓ Cuenta corriente con proveedores ✓ Historial de pagos realizados |
| :------------------------------: | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

| 📊 Módulo 9 Estadísticas y Reportes | ✓ Resumen de ingresos por mes y por año ✓ Ingresos desagregados por tipo de trabajo y por empleada ✓ Comparativo entre períodos ✓ Estado general de cobranzas del estudio |
| :---------------------------------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |

| 🔐 Módulo 10 Usuarios y Accesos | ✓ Perfil Administrador (Paola): acceso total a todos los módulos incluyendo sueldos, gastos personales y claves de clientes ✓ Perfil Empleada: acceso solo a los módulos habilitados (a definir en conjunto) ✓ Cada usuario ingresa con su propia clave ✓ Registro de qué usuario realizó cada acción dentro del sistema |
| :-----------------------------: | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

| Los permisos exactos del perfil Empleada se definirán en conjunto durante la etapa de desarrollo, según las necesidades operativas del estudio. Por ejemplo: cargar pagos de clientes, registrar facturas en efectivo, cargar vencimientos, etc. |
| :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

# **Presupuesto**

El desarrollo, puesta en marcha y entrega del sistema completo tiene un costo total de:

| USD 1.500 pago único — dos opciones de cuotas detalladas a continuación |
| :---------------------------------------------------------------------: |

## **Opciones de pago**

| Opción A — 2 cuotas                                                                                                                                              | Opción B — 3 cuotas                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1° cuota — USD 750** Al momento de la entrega del sistema funcionando. **2° cuota — USD 750** Una vez transcurrido el mes de prueba y con el sistema aprobado. | **1° cuota — USD 500** Al momento de la entrega del sistema funcionando. **2° cuota — USD 500** Al mes de uso, una vez validado el funcionamiento. **3° cuota — USD 500** Al segundo mes. A partir de este mes comienza el mantenimiento. |

\* Los valores están expresados en dólares estadounidenses. Se puede acordar el pago en pesos al tipo de cambio del día.

## **¿Qué incluye el precio?**

- Desarrollo completo del sistema con todos los módulos descriptos

- Carga inicial de los datos actuales (migración desde el Excel)

- Un mes de período de prueba con ajustes y correcciones incluidas

- Capacitación para que Paola y su equipo puedan usar el sistema

- Manual de uso simplificado

## **¿Qué NO incluye?**

- Integración con AFIP para facturación electrónica (la facturación continúa con SOS)

- El costo del hosting y dominio (ya cubierto por la clienta)

- Funcionalidades nuevas que se soliciten después de aprobado el sistema (se cotizan aparte)

# **Mantenimiento Mensual**

Una vez entregado y aprobado el sistema, se ofrece un servicio de mantenimiento mensual para garantizar el correcto funcionamiento a largo plazo.

| USD 60 / mes servicio de mantenimiento y soporte continuo |
| :-------------------------------------------------------: |

## **¿Qué incluye el mantenimiento?**

| 🗄️  | Backup semanal de toda la información del sistema. Se descarga y guarda una copia completa de todos los datos del estudio (clientes, movimientos, honorarios, etc.) para que nunca se pierda nada. |
| :-: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🔧  | Corrección de errores o fallas que puedan aparecer en el uso cotidiano del sistema.                                                                                                                |
| 💬  | Soporte por WhatsApp o mail en horario laboral para consultas, dudas o problemas de uso.                                                                                                           |
| 🔄  | Ajustes menores de funcionalidades existentes: cambios de etiquetas, pequeñas modificaciones de pantallas, ajustes de cálculos, etc.                                                               |
| 🔒  | Monitoreo de seguridad básico del sistema y la base de datos.                                                                                                                                      |

| El mantenimiento no incluye el desarrollo de funcionalidades nuevas o cambios estructurales en el sistema. Esos trabajos se cotizan por separado según la complejidad. |
| :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

# **Próximos pasos**

Si esta propuesta te genera alguna duda, modificación o querés agregar algo que no está contemplado, podemos conversarlo antes de arrancar. La idea es que el sistema quede exactamente como lo necesitás.

|   1\.   | Revisamos juntos esta propuesta y confirmamos el alcance completo del sistema.          |
| :-----: | :-------------------------------------------------------------------------------------- |
| **2\.** | Elegís la opción de pago que mejor te convenga (2 o 3 cuotas).                          |
| **3\.** | Arrancamos el desarrollo. En aproximadamente un mes el sistema está listo para probar.  |
| **4\.** | Período de prueba: usás el sistema durante un mes, reportás cualquier ajuste necesario. |
| **5\.** | Una vez aprobado, queda en producción y comienza el mantenimiento mensual.              |

| Cualquier consulta estoy disponible. Renzo Asef — radevelopment02@gmail.com — 3471343991 |
| :--------------------------------------------------------------------------------------: |
