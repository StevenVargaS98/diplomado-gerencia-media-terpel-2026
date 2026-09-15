# Actualización del portal — 15 de septiembre de 2026

## Estado y requisito de publicación

Esta versión requiere `portal_version() = 20260915` en Supabase. La interfaz comprueba esa versión al ingresar y muestra un error de actualización si falta. El despliegue de GitHub Pages **no ejecuta migraciones SQL**.

Durante la revisión, el dominio configurado `zlilnnthjztzszejxwfd.supabase.co` no resolvió por DNS. No hubo acceso autenticado al proyecto Supabase ni a datos reales. La instalación y actualización fueron verificadas en PostgreSQL local con datos sintéticos; su aplicación en producción queda pendiente de disponer del proyecto activo.

## Base existente

1. Identifique el proyecto Supabase que contiene los datos y obtenga un respaldo antes de migrar.
2. Confirme que ya se aplicaron las cuatro migraciones históricas: acceso y líderes, pgcrypto, eliminaciones administrativas y participantes del equipo. Si falta alguna, ejecútela antes de la migración nueva.
3. Ejecute [preflight-integridad.sql](supabase/preflight-integridad.sql), que solo consulta. Si aparecen duplicados de membresías activas, objetivos generales, alternativas seleccionadas o nombres de equipos, revise los registros con el responsable académico. No se elige automáticamente qué datos conservar.
4. Ejecute completo [migracion-integridad-20260915.sql](supabase/migracion-integridad-20260915.sql) en SQL Editor. Es una única transacción: si algo falla, no queda una actualización parcial. Corrija el dato señalado y vuelva a ejecutarla completa.
5. Verifique `select public.portal_version();`: debe devolver `20260915`.
6. Revise las inconsistencias históricas de fechas y objetivos cruzados que muestre el preflight. Las nuevas escrituras ya están protegidas; la migración no inventa valores ni borra información antigua.
7. Compruebe sesiones reales de participante, observador, docente y jurado; una subida y descarga privada; invitaciones; edición simultánea y evaluación. Las pruebas locales no sustituyen estos pasos de aceptación con Auth, Storage y Realtime reales.

**No ejecute migraciones históricas después de la nueva:** algunas reemplazan funciones de permisos. Si ocurrió, vuelva a aplicar la migración de integridad completa.

## Base nueva

1. Ejecute [schema.sql](supabase/schema.sql) y luego [seed.sql](supabase/seed.sql). El esquema consolidado ya incluye esta corrección; no necesita migraciones históricas.
2. Registre y confirme la cuenta administradora.
3. Copie su UUID de Authentication → Users en [promover-administrador.sql](supabase/promover-administrador.sql) y ejecute el script. La promoción no depende de escribir un correo conocido al registrarse.
4. Configure las URL de retorno de Auth según [CONFIGURAR-SUPABASE.md](CONFIGURAR-SUPABASE.md).
5. Si cambia de proyecto, actualice `config.js` con la Project URL y **solo** la publishable key pública. Nunca publique contraseñas, JWT privados o `service_role`.

## Operación

- Los equipos archivados conservan lectura y cierran la edición y las invitaciones. Un docente puede reabrirlos.
- La eliminación de un equipo tiene una etapa `deleting`: primero bloquea escrituras, después retira todos los archivos y finalmente elimina los datos. Si falla la red, vuelva a pulsar **Reintentar eliminación**. No elimine filas de `storage.objects` mediante SQL en producción: use la interfaz para que Storage retire también los objetos físicos.
- El borrado de una persona bloquea acceso y retira membresías/asignaciones, conservando sus aportes. No borra su identidad de Auth ni todos sus datos personales.
- Un guardado con una versión antigua se rechaza. El texto permanece en pantalla: conserve el borrador y actualice explícitamente antes de reconciliar cambios.
- El avance académico se calcula en la base en ocho componentes y es el mismo para administración y participantes. El último exige las cuatro entregas aprobadas. No es una calificación del jurado.

## Validación reproducible

Requiere Node.js 24:

```sh
npm ci --ignore-scripts
npm run check
npm test
```

`tests/database.test.mjs` instala el esquema real en PGlite (PostgreSQL embebido), con roles autenticados y contexto `auth.uid()` sintéticos. `tests/frontend.test.mjs` ejecuta el JavaScript del portal en DOM simulado. GitHub Actions repite estos controles en cada push y pull request.

Para pruebas visuales aisladas:

```sh
node scripts/browser-fixtures.mjs
python -m http.server 8080 --bind 127.0.0.1
```

Abra `/test-results/ui/index.html?actor=leader`, `/test-results/ui/admin.html?actor=admin` o `/test-results/ui/jury.html?actor=jury` en ese servidor. Usan exclusivamente datos ficticios y una API simulada; no hacen escrituras en Supabase. Los archivos generados no se versionan.

Si modifica la migración, ejecute `npm run build:schema` antes de las pruebas. Las correcciones de código no requieren publicar `node_modules` ni las herramientas de auditoría.
