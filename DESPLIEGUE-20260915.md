# Despliegue real — 15 de septiembre de 2026

## Estado

El proyecto Supabase `zlilnnthjztzszejxwfd` estaba pausado. Se reanudó desde la cuenta propietaria autorizada y se esperó a que Supabase confirmara **Restoration complete** y **Healthy** antes de modificar el esquema recuperado.

Se instaló el directorio de participantes que faltaba y la migración de integridad en una única transacción. La base real devuelve `portal_version() = 20260915`.

## Protección y conservación de datos

Antes de migrar se creó `portal_backup_20260915`, una copia privada dentro de la misma base, con 23 tablas: datos académicos, definiciones de funciones, políticas y metadatos de archivos. Tiene RLS habilitado y permisos de esquema y tablas revocados a `public`, `anon` y `authenticated`. No se publicaron sus contenidos en GitHub. Esta copia previa no sustituye un respaldo externo frente a pérdida del proyecto completo.

El preflight no encontró membresías duplicadas, varios objetivos generales, varias alternativas seleccionadas, nombres duplicados de equipo, fechas invertidas ni referencias a objetivos de otros proyectos.

| Conteo | Antes | Después |
|---|---:|---:|
| Perfiles | 7 | 7 |
| Equipos | 3 | 3 |
| Proyectos | 2 | 2 |
| Entregas | 8 | 8 |

Además se verificaron una cohorte activa, seis perspectivas, almacenamiento privado y cero tablas académicas o de respaldo sin RLS.

## Verificaciones reales

- PostgreSQL: un participante existente consulta su proyecto, permanece aislado de proyectos ajenos y guarda el diagnóstico con incremento de versión. La autopromoción a administrador y el envío de evaluación sin asignación son rechazados.
- Las pruebas se ejecutaron con rol `authenticated` y contexto `auth.uid()` en una transacción terminada con `ROLLBACK`. Se comprobó después que no quedó ningún cambio de diagnóstico ni evaluación de prueba.
- Auth devuelve HTTP 200; el registro y el ingreso por correo están habilitados.
- Los endpoints de proyectos y de versión rechazan solicitudes anónimas con HTTP 401 / código PostgreSQL `42501`.
- La Site URL y el retorno a `index.html` coinciden con el portal de GitHub Pages.
- El portal publicado carga la pantalla de ingreso sin errores de consola.

Las 36 pruebas locales y GitHub Actions siguen siendo la cobertura de regresión de referencia. Las pruebas SQL reales verifican PostgreSQL; no equivalen a iniciar sesión con la contraseña de cada usuario. En esta sesión no se enviaron correos de recuperación ni se subieron archivos a Storage real. La aceptación de correo, archivos y colaboración entre navegadores autenticados debe realizarse con usuarios de prueba autorizados.

## Continuidad hasta el 31 de mayo de 2027

El usuario decidió conservar Free y gestionar una tarea periódica de actividad. No se contrató Pro, no se creó una automatización en Codex y no se programó una pausa o eliminación al llegar esa fecha.

Supabase Free puede pausar proyectos por baja actividad durante siete días. Revisar cada 2–3 días deja más margen que una frecuencia semanal, pero no garantiza continuidad. Los planes de pago eliminan la pausa por inactividad; la disponibilidad también depende del estado y las cuotas del servicio. Referencias: [pausa de proyectos](https://supabase.com/docs/guides/platform/free-project-pausing) y [planes de Supabase](https://supabase.com/pricing).

Para una comprobación manual del esquema y sus conteos use [verificar-produccion.sql](supabase/verificar-produccion.sql). La prueba reversible de permisos está en [prueba-produccion-rollback.sql](supabase/prueba-produccion-rollback.sql); debe ejecutarla el propietario en SQL Editor y mantener su `ROLLBACK` final.
