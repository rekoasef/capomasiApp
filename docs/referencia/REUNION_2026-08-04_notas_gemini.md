ago 4, 2026

## **Pao capomasi revision**

Archivos adjuntos [Pao capomasi revision](https://calendar.google.com/calendar/event?eid=NW00cTg5Yjloa2pocjd1Yjc4dGpxNTE3N2ggcmFzZWZAY3J1Y2lhbmVsbGkuY29t)

Registros de la reunión [Transcripción](https://docs.google.com/document/d/1AfzpciT0M4xjAaj7n4MYrluuWMMBI1m75e7tjYEfYUI/edit?usp=drive_web&tab=t.9srwbv6x6cwx)

### **Resumen**

La reunión revisó funciones de facturación y sistemas de gestión con migración de datos hacia plataforma web.

**Optimización del tablero administrativo**  
El sistema implementó la clasificación de ingresos y puntos para empleados junto con una simplificación de formularios. Se acordó migrar 320 filas de facturación histórica como datos informativos.

**Gestión financiera y gastos**  
Se automatizará el registro de gastos recurrentes para generar estados de resultados claros. Se utilizarán enlaces externos para comprobantes para maximizar el almacenamiento gratuito del servidor.

**Evaluación de software escritorio**  
Se discutió la viabilidad técnica de desarrollar una aplicación descargable en lugar de servicios web. El desarrollador investigará la tecnología necesaria antes de confirmar la viabilidad del proyecto.

### **Próximos pasos**

- [ ] \[Paola Capomasi\] Enviar Excel: Compartir el archivo de Excel con los datos históricos de facturación y cuenta corriente para la migración a la plataforma.

- [ ] \[Renzo Asef\] Migrar datos: Migrar los datos históricos de facturación contenidos en el archivo Excel a la plataforma del sistema.

- [ ] \[Paola Capomasi\] Definir PDF: Proporcionar un ejemplo de formato de PDF para personalizar la visualización de las liquidaciones y recibos en la plataforma.

- [ ] \[Renzo Asef\] Configurar PDF: Personalizar el formato del PDF de facturación de acuerdo al modelo proporcionado por el usuario.

- [ ] \[Renzo Asef\] Crear pestaña informativa: Implementar una sección en la aplicación que permita filtrar datos por fecha, trabajo y empleada.

- [ ] \[Renzo Asef\] Enviar video demostrativo: Enviar un video de demostración a Paola Capomasi una vez que la nueva pestaña informativa esté lista.

- [ ] \[Renzo Asef\] Publicar en dominio de prueba: Publicar el sistema en un dominio de prueba o subdominio para permitir su evaluación.

- [ ] \[Renzo Asef\] Investigar viabilidad técnica: Investigar el lenguaje de programación Flutter para determinar la viabilidad de desarrollar una aplicación de escritorio para el nuevo proyecto de costos.

- [ ] \[Paola Capomasi\] Presentar proyecto de costos: Organizar una reunión con Renzo Asef para presentar el funcionamiento y los detalles del nuevo proyecto de costos.

### **Detalles**

- **Revisión del tablero y facturación**: Renzo Asef presenta a Paola Capomasi las actualizaciones en el tablero de control, mostrando la capacidad de filtrar información por mes. Discuten la clasificación de ingresos y cómo el sistema diferencia entre facturas tipo A y C para el registro contable ([00:03:21](?tab=t.9srwbv6x6cwx#heading=h.yosa9bl1goo7)).

- **Gestión de clientes y suscripciones**: Renzo Asef detalla una nueva funcionalidad en la sección de clientes donde se gestionan los abonos mensuales. Explican que si un trabajo se marca como parte del abono, al ser aprobado por Paola Capomasi, este evita la cola de facturación, optimizando el flujo de trabajo ([00:04:23](?tab=t.9srwbv6x6cwx#heading=h.ekioul7t7w5j)).

- **Clasificación de trabajos**: Renzo Asef y Paola Capomasi definen las categorías para los tipos de trabajo. Acuerdan incluir explícitamente "Ganancias", "Bienes Personales" y el anual de "Ingresos Brutos" dentro del sistema para una organización adecuada de los vencimientos ([00:05:39](?tab=t.9srwbv6x6cwx#heading=h.5hr7bn4wqd9g)).

- **Sistema de puntos para empleados**: Renzo Asef demuestra cómo funciona el sistema de puntos para calcular la remuneración del personal. Explican que los puntos acumulados pueden descontarse contra montos financieros (por ejemplo, descontar 50 puntos equivalentes a 60.000 pesos) para gestionar las cuentas corrientes ([00:06:40](?tab=t.9srwbv6x6cwx#heading=h.z1q4mmaceoaa)).

- **Gestión de vencimientos y calendario**: Renzo Asef muestra el calendario de vencimientos. Explican que al seleccionar una fecha, el sistema despliega una lista detallada de los trabajos pendientes y las personas asignadas. Confirman que las empleadas pueden acceder a la plataforma con su propia cuenta para visualizar únicamente sus tareas asignadas ([00:08:25](?tab=t.9srwbv6x6cwx#heading=h.p86avsl3fhnv)).

- **Registro de gastos y almacenamiento**: Renzo Asef explica la sección de gastos recurrentes (como impuestos y servicios). Sobre el almacenamiento de comprobantes, sugieren utilizar enlaces a servicios externos como Google Drive en lugar de subir archivos directamente, esto para evitar costos adicionales de servidores al exceder el límite gratuito de 1 gigabyte ([00:14:33](?tab=t.9srwbv6x6cwx#heading=h.k37cirgo3bsk)).

- **Reportes y flujo de efectivo**: Renzo Asef presenta la sección de reportes y movimientos financieros. Discuten cómo registrar transferencias entre cuentas (ej. de efectivo a banco) y la gestión de cheques en cartera, permitiendo estados como "depositado" o "acreditado" para mantener las cuentas actualizadas ([00:18:10](?tab=t.9srwbv6x6cwx#heading=h.urw06r1w2wjo)).

- **Registro de egresos y resultados**: Paola Capomasi solicita que el sistema registre automáticamente los gastos del estudio (incluyendo sueldos y servicios) para obtener un estado de resultados claro (ingresos menos egresos). Acuerdan que para gastos no recurrentes, el registro se hará de forma manual ([00:24:20](?tab=t.9srwbv6x6cwx#heading=h.kfsuraxingyv)).

- **Simplificación de carga de proveedores**: Renzo Asef y Paola Capomasi deciden simplificar el formulario de carga de gastos manuales. Acuerdan eliminar la obligatoriedad del número de comprobante, permitiendo que el usuario ingrese únicamente el proveedor, el concepto (por ejemplo, "ropa" o "lámpara") y el importe total ([00:26:16](?tab=t.9srwbv6x6cwx#heading=h.whgh4t1brtm4)).

- **Planificación de la migración de datos**: Renzo Asef solicita el archivo Excel de Paola Capomasi para iniciar la migración de datos a la plataforma. Paola Capomasi aclara que se deben migrar 320 filas de facturas desde octubre del año pasado, pero que los gastos antiguos y cheques se mantendrán en el sistema anterior ([00:31:20](?tab=t.9srwbv6x6cwx#heading=h.qg8g1d6wuc1o)).

- **Estrategia de datos informativos**: Para evitar errores en el sistema actual, Renzo Asef y Paola Capomasi acuerdan que la información histórica de facturación se cargará como "informativa" en una pestaña separada. Esto permite ver el historial sin romper la lógica contable del sistema actual ([00:42:24](?tab=t.9srwbv6x6cwx#heading=h.5djqdghtwuh5)).

- **Discusión sobre nuevo proyecto de software**: Paola Capomasi expone un proyecto fallido de software de costos con otro desarrollador y expresa su deseo de crear una aplicación de escritorio descargable, en lugar de un servicio web (SaaS), para evitar la gestión de abonos y facilitar el uso a clientes ([00:45:32](?tab=t.9srwbv6x6cwx#heading=h.vc0rpyl82gfp)) ([00:48:50](?tab=t.9srwbv6x6cwx#heading=h.mdkafo4vxjas)).

- **Evaluación técnica de Renzo Asef**: Renzo Asef explica que su experiencia es en desarrollo web y que no ha trabajado anteriormente con el lenguaje "Flutter" para aplicaciones de escritorio. Se compromete a investigar la viabilidad de este lenguaje para determinar si puede asumir el proyecto del software de costos sin hacerle perder tiempo a Paola Capomasi ([00:49:57](?tab=t.9srwbv6x6cwx#heading=h.6ic5dm40a8n)) ([00:52:00](?tab=t.9srwbv6x6cwx#heading=h.5dyxtgd875kg)).

- **Pasos a seguir**: Renzo Asef confirma que procederá con la migración de los datos al sistema actual y creará un subdominio de prueba para que Paola Capomasi pueda validar la plataforma. Queda pendiente una futura reunión para definir si Renzo Asef tomará el desarrollo de la aplicación de escritorio ([00:58:33](?tab=t.9srwbv6x6cwx#heading=h.wbvg3yx2bfnf)).

_Revisa las notas de Gemini para asegurarte de que sean precisas. [Obtén sugerencias y descubre cómo Gemini toma notas](https://support.google.com/meet/answer/14754931)_

_Cómo es la calidad de **estas notas específicas?** [Responde una breve encuesta](https://google.qualtrics.com/jfe/form/SV_5bXzKQfylMIhSXc?confid=2qmEVnXFyIf4c_GtIDXUDxIWOBABMgUIigIgABgFCA&detailLevel=standard&hasImages=False&entryPoint=footerMain&isGoogler=False) para darnos tu opinión; por ejemplo, cuán útiles te resultaron las notas._
