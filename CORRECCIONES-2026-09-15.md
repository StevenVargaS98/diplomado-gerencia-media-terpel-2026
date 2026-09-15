# Informe de correcciones y validación

## Resultado

Se corrigieron los defectos reproducidos en la auditoría del repositorio: autorización de datos y archivos, evaluación, colaboración, entregas, edición académica y operación administrativa. Se añadieron pruebas de regresión y un esquema consolidado reproducible.

**La puesta en producción no se considera completada con el push.** El dominio Supabase configurado no resolvió durante la revisión y no se dispuso de una sesión administrativa de ese proyecto. La migración, el estado de los datos existentes y las pruebas con servicios reales siguen pendientes. El frontend comprueba la versión de base requerida para impedir operar con un esquema incompatible.

## Seguimiento de los hallazgos

| Área revisada | Corrección implementada | Evidencia / límite |
|---|---|---|
| Disponibilidad del backend | Error explícito de conexión y comprobación de versión | Pendiente proyecto Supabase activo; el código no puede recuperar un servicio inexistente |
| Cuentas bloqueadas o retiradas | Permisos de contenido y Storage exigen perfil activo, membresía y rol vigentes | Pruebas SQL con cuentas bloqueadas y retiradas |
| Creación de equipos | Validación del rol incluso cuando la consulta devuelve NULL; bloqueo de concurrencia y membresía única | SQL: accesos denegados e instalación/actualización |
| Evaluaciones de jurado | Solo autor con rol vigente y asignación activa puede guardar; cinco criterios y comentarios obligatorios | SQL y envío real en navegador con API simulada |
| Manipulación de aprobación, autor y avance | Controles en triggers; avance calculado por servidor; revisión reservada a facilitadores | Pruebas de escritura directa por participante |
| Formulario del jurado | Delegación al formulario correcto; identificador capturado antes de esperar respuestas | Regresión DOM y navegador: estado «Evaluado» |
| Invitaciones y recuperación de contraseña | Captura de formulario antes de operaciones asíncronas; errores visibles y controles restaurados | Prueba de contraseña; invitaciones de líder y administrador en navegador |
| Borradores y tiempo real | No se reemplazan formularios modificados; aviso y actualización explícita; protección al salir | DOM y navegador conservan el texto tras evento remoto |
| Lecturas fallidas | Consultas verifican errores y no reemplazan datos por listas vacías | Fallo simulado de lectura |
| Proyecto parcialmente inicializado | Creación transaccional por RPC y reparación de registros faltantes | SQL: proyecto idempotente con diagnóstico, prototipo y cuatro entregas |
| Archivos y eliminación de equipos | Versiones conservadas, compensación de subida fallida, eliminación por etapas y reintento | SQL valida referencias y exige limpiar objetos antes del borrado final; falta aceptación con Storage real |
| Evidencia del jurado | Nombre del equipo, datos del prototipo, indicadores y descarga privada | Interfaz y permisos SQL del jurado asignado |
| Entregas del participante | Abrir entrega vigente y consultar versiones anteriores | Interfaz y tabla protegida de versiones |
| Cobertura Realtime | Suscripciones para entidades académicas y cambios de acceso | Prueba de suscripciones; transporte real pendiente |
| Avance inconsistente | Ocho componentes comunes para administración y participante | SQL recalcula; DOM muestra el valor persistido, sin porcentajes ficticios |
| Funciones académicas incompletas | Alta, edición y eliminación; alternativa elegida con justificación; objetivo de acciones e indicadores; valores actuales; recursos y Gantt | Las doce secciones renderizan; edición de indicador verificada en navegador |
| Fechas desplazadas | Fechas de calendario se interpretan localmente sin desplazamiento UTC | Regresión en zona America/Bogota; fecha 17 de septiembre visible en móvil |
| Valores cero y campos opcionales | Se preserva cero; costo vacío de recurso equivale a cero; fechas vacías usan NULL | DOM y SQL |
| Integridad entre registros | Fechas coherentes, objetivo del mismo proyecto, importes no negativos, unicidad y capacidad | Pruebas SQL; datos históricos inconsistentes se reportan para revisión |
| Historial de actividad | Generado desde triggers con actor, entidad, operación y versión; clientes no pueden falsificarlo | SQL: escritura manual rechazada y eventos generados |
| Autor de comentarios | RPC devuelve nombre necesario sin divulgar el perfil completo | SQL: nombre disponible y correo ausente |
| Estado de eliminación del perfil | Columna protegida y conservación del último administrador activo | Pruebas SQL |
| Equipos archivados y liderazgo | Invitaciones cerradas, reapertura, asignación y recuperación de líder desde administración | SQL y controles administrativos |
| Observador y docente | Observador sin edición académica; docente entra al espacio del equipo | DOM readonly, RLS y enlace administrativo |
| Paginación, concurrencia y accesibilidad | Páginas de datos completas; versión por registro evita sobrescritura silenciosa; diálogos nativos, etiquetas y avisos accesibles | Prueba de 1.201 filas, conflicto de versiones y revisión móvil de 390 px |

## Pruebas

Resultado local final: **36 comprobaciones aprobadas, 0 fallos**. `npm run check` terminó correctamente. `npm audit --audit-level=moderate` no reportó vulnerabilidades conocidas en las dependencias registradas en el lockfile; este control no inspecciona las bibliotecas vendorizadas ni prueba su comportamiento.

- `npm run check`: análisis de sintaxis, referencias a archivos locales y coincidencia exacta entre migración y esquema consolidado.
- `npm test`: instalación limpia, actualización desde versiones anteriores, repetición de la migración, permisos, flujos SQL y pruebas DOM. Los casos usan identidades y datos ficticios.
- Navegador: conservar y guardar diagnóstico después de un evento remoto; activar invitación como líder y administrador; editar valor actual del indicador; enviar cinco criterios del jurado y mostrar evaluación guardada; revisar entregas a 390 × 844 px. No se observaron errores de consola en las sesiones revisadas.
- Word: generación XML con valores actuales, cero, frecuencia y escape de texto. La exportación utiliza la plantilla y el generador ZIP locales.

Las pruebas PostgreSQL emplean PGlite con contexto de autenticación y tablas Storage sintéticos; no comprueban entrega de correos, firma real de enlaces, objetos físicos, latencia, cuotas o transporte WebSocket del proyecto remoto. No se realizaron pruebas destructivas contra datos de producción.

## Despliegue pendiente de base real

El procedimiento completo, los comandos y los pasos de recuperación están en [ACTUALIZAR-20260915.md](ACTUALIZAR-20260915.md). Resolver el proyecto activo, ejecutar la migración y realizar la aceptación con usuarios de prueba son requisitos para cerrar la validación integral. No se puede garantizar ausencia absoluta de errores a partir de pruebas locales.
