# Portal · Diplomado de Gerencia Media

Portal académico colaborativo preparado para **GitHub Pages + Supabase**. Convierte la Brújula Estratégica y las dos guías oficiales del proyecto de aplicación en un flujo digital de trabajo por equipos.

## Qué resuelve

- Registro e ingreso individual con correo y contraseña, sin exigir equipo ni código.
- El profesor habilita el rol de líder; únicamente ese rol puede crear o reclamar un equipo.
- Los demás participantes se vinculan después mediante una invitación privada del líder.
- Datos compartidos y sincronizados entre dispositivos.
- Separación segura de información por equipo mediante Row Level Security.
- Formulación guiada: diagnóstico, objetivos SMART, alternativas, plan, involucrados, recursos, indicadores y Gantt.
- Desarrollo y validación del prototipo.
- Entregables privados con retroalimentación de docentes.
- Comentarios colaborativos e historial de actividad.
- Preparación y evaluación de la presentación tipo *shark tank*.
- Administración separada para equipos, participantes, entregas y jurados.

## Documentos incorporados

### `Guia de trabajo.pdf`

La experiencia cubre sus siete componentes:

1. Problema identificado y delimitación en cinco dimensiones.
2. Objetivo general y objetivos específicos SMART.
3. Alternativas de solución.
4. Plan de acción: qué se hará y cómo.
5. Involucrados, roles, funciones, dedicación y recursos.
6. Indicadores de eficacia y eficiencia.
7. Cronograma Gantt.

### `presentacion de estructura proyectos.pdf`

El portal organiza los tres entregables:

1. Formulación del proyecto estratégico.
2. Prototipo de la solución.
3. Presentación de siete minutos ante el panel de jurados.

También incorpora las fechas indicadas: 18 de agosto, 17 de septiembre, 27 de octubre y 26 de noviembre.

## Estructura

```text
index.html                  Portal de participantes
admin.html                  Gestión de administradores y docentes
jury.html                   Evaluación privada del panel de jurados
app.js                      Flujo académico y colaboración
admin.js                    Gestión académica
jury.js                     Rúbrica y valoración de proyectos
portal-core.js              Conexión y utilidades compartidas
config.js                   URL y publishable key de Supabase
styles.css                  Diseño adaptable e impresión
supabase/schema.sql         Base, funciones, roles y RLS
supabase/seed.sql           Cohorte, fechas y perspectivas
supabase/migracion-acceso-y-lideres.sql Actualización para bases ya instaladas
CONFIGURAR-SUPABASE.md      Instalación paso a paso
ARQUITECTURA-Y-SEGURIDAD.md Diseño técnico y modelo de permisos
```

## Puesta en marcha

Siga [CONFIGURAR-SUPABASE.md](CONFIGURAR-SUPABASE.md). No necesita servidor propio: GitHub Pages aloja la interfaz y Supabase protege usuarios, datos y archivos.

Si la base ya estaba instalada con la primera versión, ejecute una vez `supabase/migracion-acceso-y-lideres.sql` antes de publicar esta versión. La migración asigna como administrador a `ing.stevenh.vargas@gmail.com`, agrega el rol `lider` y revoca los códigos antiguos de liderazgo.

## Vista local sin configurar Supabase

La opción más sencilla en Windows es hacer doble clic en `INICIAR-VISTA-LOCAL.bat`.

También puede iniciarla manualmente. Desde esta carpeta ejecute:

```powershell
python -m http.server 8080 --bind 127.0.0.1
```

Luego abra `http://127.0.0.1:8080/preview.html`. La barra superior permite recorrer el ingreso y las vistas de participante, administración y jurado con datos ficticios. Para detener el servidor presione `Ctrl + C` en la terminal.

## Principio de seguridad

El HTML, CSS, JavaScript y la `Publishable key` son públicos porque GitHub Pages es estático. Los datos no son públicos: cada consulta se valida en PostgreSQL mediante RLS. La clave `service_role` no se usa ni se incluye en este proyecto.
