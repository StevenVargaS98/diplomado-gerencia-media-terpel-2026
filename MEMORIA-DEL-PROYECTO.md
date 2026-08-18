# Memoria del proyecto

## Portal del Diplomado de Gerencia Media

Última actualización: 18 de agosto de 2026
Repositorio: `StevenVargaS98/diplomado-gerencia-media-terpel-2026`  
Rama de publicación: `main`  
Sitio público: <https://stevenvargas98.github.io/diplomado-gerencia-media-terpel-2026/>  
Backend: Supabase Free, proyecto `zlilnnthjztzszejxwfd`

Esta memoria permite continuar el desarrollo sin depender del historial de la conversación. No contiene contraseñas, tokens de recuperación, claves secretas ni códigos privados de invitación.

---

## 1. Objetivo del portal

El portal reemplaza y amplía el trabajo que inicialmente se llevaba en Excel. Su finalidad es que los participantes del **Diplomado de Gerencia Media** puedan formular, desarrollar y presentar un proyecto académico de manera colaborativa.

La solución incorpora la estructura de los documentos académicos revisados:

- `Guia de trabajo.pdf`.
- `presentacion de estructura de proyecto.pdf` o su versión equivalente dentro de los documentos originales.
- La información y lógica de seguimiento que se llevaba en Excel.

El resultado es una aplicación web multiusuario con:

- Registro e inicio de sesión.
- Acceso permitido aunque la persona todavía no pertenezca a un equipo.
- Creación controlada de equipos.
- Invitaciones privadas para integrantes.
- Trabajo colaborativo sobre un único proyecto por equipo.
- Seguimiento por docentes y administradores.
- Evaluación independiente para jurados.
- Persistencia de datos entre computadores y navegadores.
- Publicación gratuita mediante GitHub Pages.

---

## 2. Decisiones principales

### Alojamiento

- La interfaz se publica gratuitamente en **GitHub Pages**.
- No se utiliza dominio personalizado ni servicio de alojamiento pago.
- La URL oficial es la URL gratuita de GitHub Pages indicada al comienzo de este documento.
- El dominio propuesto `brujulamaestria.co` no se utiliza porque requería compra y configuración DNS.

### Base de datos y autenticación

- Se utiliza **Supabase Free**.
- Supabase administra usuarios, sesiones, base PostgreSQL, archivos privados y cambios colaborativos.
- GitHub Pages solo aloja HTML, CSS, JavaScript e imágenes.
- La información académica no se guarda en `localStorage` en la versión productiva.

### Seguridad

- La `Publishable key` de Supabase puede estar en `config.js` porque está diseñada para el navegador.
- La seguridad real depende de las políticas RLS de PostgreSQL.
- Nunca se debe publicar una `service_role key`, una secret key, la contraseña de la base o un token de recuperación.
- Los códigos de invitación se almacenan como hashes SHA-256 y no pueden recuperarse después.
- Las contraseñas de los usuarios son administradas por Supabase Auth y no se pueden consultar en texto legible.

### Costos

- GitHub Pages: plan gratuito.
- Supabase: plan Free.
- Dominio personalizado: no contratado.
- No existe actualmente un componente que requiera pago obligatorio.

---

## 3. Arquitectura actual

```text
Usuario
  │
  ▼
GitHub Pages
  ├── index.html        Registro, ingreso, equipos y proyecto
  ├── admin.html        Administración académica
  ├── jury.html         Evaluación de jurados
  ├── JavaScript        Lógica del cliente
  └── CSS               Diseño adaptable
  │
  │ HTTPS + sesión JWT
  ▼
Supabase
  ├── Auth              Usuarios, sesiones y recuperación
  ├── PostgreSQL        Información académica
  ├── RLS               Autorización por usuario y equipo
  ├── Storage privado   Entregables
  └── Realtime          Actualizaciones colaborativas
```

La URL del repositorio y el código JavaScript son públicos. Las tablas no permiten lectura anónima. Cada operación se vuelve a validar en Supabase.

---

## 4. Archivos principales

```text
index.html
  Portal de ingreso, registro, recuperación, centro de equipos y proyecto.

app.js
  Autenticación, equipos, invitaciones, proyecto y trabajo colaborativo.

styles.css
  Diseño del portal, administración, jurados, recuperación y móviles.

admin.html / admin.js
  Equipos, participantes, roles, entregables y evaluaciones.

jury.html / jury.js
  Panel privado de jurados y rúbrica de evaluación.

portal-core.js
  Cliente compartido de Supabase y utilidades.

config.js
  Project URL y Publishable key públicas de Supabase.

vendor/supabase.min.js
  Copia local del cliente Supabase JavaScript 2.112.3.

supabase/schema.sql
  Esquema completo para una instalación nueva.

supabase/seed.sql
  Cohorte 2026, fechas y perspectivas estratégicas iniciales.

supabase/migracion-acceso-y-lideres.sql
  Migración de la base existente al nuevo flujo de acceso y liderazgo.

supabase/migracion-fix-pgcrypto.sql
  Corrige la resolución de digest() dentro de las funciones de invitación.

supabase/migracion-admin-eliminaciones.sql
  Agrega eliminación de equipos y retiro seguro de personas.

supabase/migracion-participantes-equipo.sql
  Agrega el directorio privado de integrantes por equipo.

CONFIGURAR-SUPABASE.md
  Guía de instalación y configuración.

ARQUITECTURA-Y-SEGURIDAD.md
  Modelo resumido de permisos y seguridad.

CHECKLIST-PRODUCCION.md
  Validaciones recomendadas antes del uso académico real.
```

Existe además un archivo operativo local llamado `supabase/crear-20-equipos.sql`. Está incluido en `.gitignore` y no se publica en GitHub. Su función actual es crear `Equipo 01` hasta `Equipo 20` como espacios disponibles, sin generar códigos de líder.

---

## 5. Modelo académico implementado

Cada equipo trabaja sobre un proyecto de aplicación compuesto por:

1. Diagnóstico y situación actual.
2. Objetivo general y objetivos específicos SMART.
3. Alternativas de solución.
4. Plan de acción y cronograma.
5. Involucrados, roles, funciones, dedicación y recursos.
6. Indicadores de eficacia y eficiencia.
7. Prototipo y validación.
8. Entregables académicos.
9. Comentarios y decisiones colaborativas.
10. Presentación final tipo *shark tank*.

Las fechas iniciales incorporadas son:

- 18 de agosto: definición de equipos.
- 17 de septiembre: formulación.
- 27 de octubre: guía completa.
- 19 de noviembre: prototipo validado.
- 26 de noviembre: presentación final.

Estas fechas están actualmente codificadas para la cohorte 2026 y deberán revisarse en una cohorte futura.

---

## 6. Tablas principales de Supabase

### Identidad y organización

- `profiles`: perfil público interno, rol global y estado.
- `cohorts`: cohortes académicas.
- `academic_teams`: equipos.
- `team_members`: integrantes y rol dentro del equipo.
- `invitations`: invitaciones almacenadas como hash.

### Proyecto

- `projects`.
- `problem_diagnosis`.
- `project_objectives`.
- `solution_alternatives`.
- `action_plan`.
- `stakeholders`.
- `project_resources`.
- `indicators`.
- `prototype`.
- `deliverables`.
- `project_comments`.

### Evaluación y trazabilidad

- `jury_assignments`.
- `jury_reviews`.
- `activity_log`.

---

## 7. Roles y permisos

### Roles globales

- `admin`: administra toda la cohorte, participantes, equipos y configuración académica.
- `docente`: consulta todos los equipos, revisa entregas y puede habilitar líderes.
- `participante`: entra al portal y puede aceptar una invitación.
- `lider`: autorización para crear o reclamar un equipo si aún no tiene membresía.
- `jurado`: accede únicamente a los proyectos que le fueron asignados para evaluación.

### Roles dentro del equipo

- `lider`: coordina el equipo y genera invitaciones para integrantes.
- `integrante`: participa y modifica el proyecto compartido.
- `observador`: existe en el esquema original para consulta, aunque las invitaciones nuevas se restringieron a integrantes.

### Regla central de liderazgo

Un código de invitación no concede liderazgo.

El procedimiento correcto es:

1. La persona crea su cuenta sin código.
2. Entra al Centro de equipos aunque todavía no tenga equipo.
3. Un administrador o docente le asigna `Líder habilitado`.
4. La persona actualiza la página.
5. Crea un equipo nuevo o reclama uno enumerado que esté vacío.
6. La base la registra automáticamente como líder de ese equipo.
7. El líder genera una invitación privada para los demás integrantes.

---

## 8. Flujo de usuarios

### Registro normal

1. Abrir el portal público.
2. Seleccionar **Crear cuenta**.
3. Escribir nombre, correo y contraseña.
4. No se solicita código de equipo.
5. Ingresar al Centro de equipos.
6. Permanecer sin equipo o aceptar una invitación.

La confirmación de correo está actualmente desactivada en Supabase. Debe revisarse antes de un uso de mayor alcance.

### Participante sin equipo

Puede entrar al portal y ver:

- Su nombre, correo y rol.
- El formulario para aceptar una invitación.
- La explicación para solicitar habilitación como líder.
- Un botón para actualizar los permisos después del cambio de rol.

### Líder habilitado

Puede:

- Crear un equipo con nombre, modalidad y capacidad.
- Reclamar un equipo vacío si escribe exactamente su nombre, por ejemplo `Equipo 01`.
- Crear el proyecto del equipo.
- Generar invitaciones para integrantes.

No puede crear un segundo equipo si ya pertenece a uno activo.

### Integrante invitado

1. Crea o abre su cuenta.
2. Entra al Centro de equipos.
3. Pega el código enviado por el líder.
4. La base valida vencimiento, número de usos y capacidad.
5. Si es válido, queda vinculado al equipo.

### Administrador o docente

1. Inicia sesión.
2. Abre **Administración**.
3. Consulta participantes y equipos.
4. Asigna `Líder habilitado` a los participantes correspondientes.
5. Supervisa proyectos y entregables.

Los docentes solo pueden alternar entre `participante` y `lider`. No pueden conceder roles administrativos.

El administrador también puede:

- Entrar desde el panel de equipos al espacio completo de cualquier grupo para supervisar el proyecto, formularios, actividad y entregables, sin figurar como integrante.
- Eliminar definitivamente un equipo después de escribir su nombre exacto. La operación elimina archivos, proyecto, formularios, integrantes e invitaciones.
- Eliminar una persona del portal después de confirmar su correo. La cuenta queda bloqueada, se retiran sus membresías y desaparece del panel, pero sus aportes se conservan para mantener la trazabilidad académica.

La eliminación física de la identidad en Supabase Auth se realiza manualmente desde Authentication → Users cuando la política institucional permita borrar también ese registro.

### Jurado

Al iniciar sesión con el rol `jurado`, el portal redirige a `jury.html`. Allí únicamente aparecen los proyectos asignados y su rúbrica.

---

## 9. Administrador principal

La cuenta definida para la administración general es:

```text
ing.stevenh.vargas@gmail.com
```

La promoción se hace con `supabase/migracion-acceso-y-lideres.sql`, pero solo si la cuenta ya existe en Supabase Auth y tiene su fila correspondiente en `profiles`.

Procedimiento:

1. Registrar primero la cuenta con una contraseña privada.
2. Ejecutar la migración.
3. Confirmar que el resultado final sea:

```text
ing.stevenh.vargas@gmail.com | admin | active
```

Si la consulta no devuelve filas, la cuenta todavía no existe. Se debe registrar y ejecutar nuevamente la migración.

La cuenta no se promueve automáticamente solo por escribir el correo. Esta decisión evita una escalada de privilegios mientras la confirmación de correo permanezca desactivada.

---

## 10. Funciones seguras de PostgreSQL

Las funciones más importantes son:

- `current_global_role()`: obtiene el rol activo de la sesión.
- `is_admin()`: comprueba administración global.
- `is_facilitator()`: comprueba si es administrador o docente.
- `is_team_member(team_id)`: valida membresía activa.
- `can_edit_team(team_id)`: valida edición de un equipo.
- `can_view_project(project_id)`: valida lectura de un proyecto.
- `can_edit_project(project_id)`: valida escritura en un proyecto.
- `set_team_leader_permission(profile_id, enabled)`: permite a un facilitador habilitar o retirar la autorización de líder.
- `create_team_as_leader(name, modality, max_members)`: crea o reclama un equipo y registra al líder.
- `join_with_invitation(code, name)`: vincula un integrante autenticado.
- `create_invitation(team_id, code, role, uses, expiration)`: genera una invitación; actualmente solo acepta el rol `integrante`.

Estas comprobaciones están en la base. Modificar el HTML o mostrar manualmente un botón no evita las reglas de seguridad.

---

## 11. Recuperación de contraseña

El portal incluye un flujo simple:

1. Escribir el correo en el formulario de ingreso.
2. Pulsar **Olvidé mi contraseña**.
3. Supabase envía un enlace de recuperación.
4. Al abrirlo, el portal detecta el evento `PASSWORD_RECOVERY`.
5. Aparece una pantalla con:
   - Nueva contraseña.
   - Confirmar contraseña.
   - Botón **Cambiar contraseña**.
6. La contraseña se actualiza mediante Supabase Auth.
7. La sesión se cierra.
8. El usuario vuelve al ingreso normal.

Las contraseñas no pueden recuperarse desde la base. Solo pueden reemplazarse.

### URLs de redirección necesarias

En Supabase, dentro de **Authentication → URL Configuration**, usar:

```text
Site URL:
https://stevenvargas98.github.io/diplomado-gerencia-media-terpel-2026/

Redirect URLs:
https://stevenvargas98.github.io/diplomado-gerencia-media-terpel-2026/
https://stevenvargas98.github.io/diplomado-gerencia-media-terpel-2026/index.html
http://127.0.0.1:8080/index.html
```

La URL local se conserva para pruebas. La pública es necesaria para que los correos recibidos por usuarios reales no los envíen a `127.0.0.1`.

---

## 12. Configuración realizada en Supabase

### Datos conocidos y públicos

- Project URL: `https://zlilnnthjztzszejxwfd.supabase.co`.
- La Publishable key se encuentra en `config.js`.
- Confirmación de correo: desactivada en el momento de esta memoria.

### Acciones ya realizadas durante la construcción

- Creación del proyecto Supabase.
- Ejecución inicial de `supabase/schema.sql`.
- Ejecución inicial de `supabase/seed.sql`.
- Configuración de `config.js`.
- Prueba de registro e inicio de sesión.
- Verificación de que las tablas no se pueden leer anónimamente.

### Acciones que deben confirmarse

- Ejecutar `supabase/migracion-acceso-y-lideres.sql` en la base ya instalada.
- Ejecutar `supabase/migracion-fix-pgcrypto.sql` para corregir `digest()`.
- Ejecutar `supabase/migracion-admin-eliminaciones.sql`.
- Confirmar que la cuenta administradora aparezca como `admin` y `active`.
- Configurar las redirecciones públicas de recuperación.
- Confirmar si `supabase/crear-20-equipos.sql` fue ejecutado después de su última actualización.
- Probar el flujo completo con un líder y un integrante reales.

Para una base existente no se debe volver a ejecutar todo `schema.sql`, porque contiene políticas que ya existen. Se usa la migración específica.

---

## 13. Equipos enumerados

Se preparó un script local para crear:

```text
Equipo 01
Equipo 02
...
Equipo 20
```

Cada equipo tiene inicialmente:

- Modalidad `presencial`.
- Capacidad de cuatro personas.
- Estado de conformación.
- Ningún código de líder.

Si existía `Equipo Horizonte` y `Equipo 01` no existía, el script cambia su nombre a `Equipo 01` conservando sus integrantes.

Los equipos vacíos pueden ser reclamados desde el portal por una persona con rol global `lider`. Los códigos antiguos que concedían liderazgo se revocan con la migración.

El archivo permanece fuera del repositorio público porque es un recurso operativo y puede evolucionar para incluir información privada.

---

## 14. Problemas encontrados y soluciones

### Pantalla completamente blanca

Síntoma:

```text
Iniciando portal
Cargando la experiencia académica…
```

Soluciones aplicadas:

- Se añadió diagnóstico visible de errores de carga.
- Se incluyó localmente `vendor/supabase.min.js` para no depender de un CDN externo.
- Se agregaron parámetros de versión a scripts y estilos para evitar caché antigua.

### Error `Identifier 'supabase' has already been declared`

Causa:

- Distintos archivos JavaScript declaraban variables globales con el mismo nombre.

Solución:

- `app.js`, `admin.js` y `jury.js` se aislaron dentro de funciones IIFE.

### Cambios guardados solamente en el navegador

Causa:

- La primera demostración usaba `localStorage`.

Solución:

- La versión productiva se conectó a Supabase.
- Las tablas usan RLS y los cambios se comparten entre dispositivos.

### Código obligatorio durante el registro

Causa:

- La primera versión vinculaba la creación de cuenta con la conformación del equipo.

Solución:

- Se separaron autenticación y membresía.
- Cualquier cuenta puede entrar sin equipo.
- El código se usa después y únicamente para unirse como integrante.

### Error `function digest(text, unknown) does not exist`

Causa:

- Supabase aloja normalmente `pgcrypto` en el esquema `extensions`.
- Las funciones de invitación tenían un `search_path` restringido a `public` y `pg_temp`.

Solución:

- Se añadió `extensions` al `search_path` de `join_with_invitation` y `create_invitation`.
- Se creó `supabase/migracion-fix-pgcrypto.sql` para corregir bases ya instaladas.

### Participantes y roles aparece vacío

Causa posible:

- La interfaz intentaba filtrar por `deleted_at` desde Supabase antes de comprobar que la migración administrativa hubiese creado esa columna.
- Los errores de carga se convertían silenciosamente en listas vacías.

Solución:

- La consulta de perfiles vuelve a ser compatible con bases anteriores y filtra localmente los perfiles retirados.
- El panel muestra el mensaje concreto de Supabase cuando alguna consulta administrativa falla.

### `Could not find the function public.admin_remove_person` en el schema cache

Causa:

- La interfaz fue publicada antes de ejecutar `supabase/migracion-admin-eliminaciones.sql`, o la Data API todavía conservaba el esquema anterior en caché.

Solución:

- Ejecutar completa la migración administrativa.
- La migración ahora envía `NOTIFY pgrst, 'reload schema'` y consulta la cola de notificaciones para forzar la actualización de la Data API.

### Códigos permanentes de equipo

- El administrador y el líder generan códigos sin fecha de vencimiento y con reutilización práctica ilimitada.
- El ingreso continúa limitado por `max_members`; un código permanente no permite superar la capacidad del equipo.
- Los códigos nuevos omiten caracteres ambiguos como `O`, `0`, `I` y `1`.
- La base conserva únicamente el hash. El código debe copiarse y guardarse cuando se genera.

### Directorio privado de integrantes

- Cada espacio incorpora la sección `Equipo` con nombre, correo, rol, fecha de ingreso y permiso de edición.
- Líderes e integrantes activos pueden modificar colaborativamente el proyecto; los observadores permanecen en modo lectura.
- Los datos personales se obtienen mediante `get_team_participants(uuid)`, que solo responde a integrantes del mismo grupo, administradores y docentes.
- Las bases existentes deben ejecutar `supabase/migracion-participantes-equipo.sql`.

### Liderazgo concedido por código

Causa:

- La versión inicial permitía invitaciones con rol de líder.

Solución:

- Se creó el rol global `lider`.
- Solo el profesor o administrador concede esta habilitación.
- Los códigos antiguos de líder se revocan.

### Recuperación redirigida a localhost

Causa:

- Supabase tenía como destino `http://127.0.0.1:8080/index.html`.

Solución esperada:

- Agregar las URLs públicas de GitHub Pages en Authentication → URL Configuration.
- Mantener localhost únicamente como URL adicional de pruebas.

---

## 15. Ejecución local

La carpeta local es el clon del repositorio. Su ubicación depende del computador; en los comandos se representa así:

```text
<RUTA-LOCAL>\portal-diplomado-pages
```

### Opción sencilla

Hacer doble clic en:

```text
INICIAR-VISTA-LOCAL.bat
```

### Opción por PowerShell

Abrir una terminal en la carpeta del proyecto y ejecutar:

```powershell
python -m http.server 8080 --bind 127.0.0.1
```

Después abrir:

```text
http://127.0.0.1:8080/index.html
```

Si el navegador conserva una versión anterior, usar `Ctrl + F5`.

`preview.html` es una demostración local con datos ficticios. `index.html` es el portal real conectado a Supabase.

---

## 16. Publicación en GitHub

Repositorio remoto:

```text
https://github.com/StevenVargaS98/diplomado-gerencia-media-terpel-2026.git
```

El remoto local se llama `origin` y `main` rastrea `origin/main`.

Para publicar una próxima iteración:

```powershell
git status
git add ARCHIVO1 ARCHIVO2
git commit -m "descripcion clara del cambio"
git push
```

Antes de publicar:

1. Ejecutar `node --check app.js`.
2. Ejecutar `node --check admin.js`.
3. Ejecutar `node --check jury.js`.
4. Revisar `git diff --check`.
5. Comprobar que no haya contraseñas ni secret keys.
6. Confirmar que `supabase/crear-20-equipos.sql` siga ignorado.
7. Probar localmente con `Ctrl + F5`.

GitHub Pages está configurado desde la rama `main` y la carpeta raíz. El archivo `.nojekyll` está incluido.

La versión anterior del repositorio tenía un sitio estático con usuarios demo. Al publicar el nuevo portal, ambos historiales se integraron con una fusión que conservó los commits antiguos pero reemplazó el árbol visible. No se utilizó `force push`.

### Commit de publicación inicial de esta versión

```text
3aa9de3 chore: reemplazar sitio anterior conservando historial
```

### Commits funcionales relevantes

```text
8ead696 feat: agregar cambio simple de contrasena
f027e2a security: promover solo cuentas administradoras existentes
f7a7c0c feat: permitir acceso sin equipo y lideres autorizados
5d805d1 seguridad: excluir codigos privados de equipos
b99f586 fix: aislar modulos del cliente Supabase
f49a8fb fix: incluir cliente Supabase local
90d5612 fix: evitar pantalla en blanco al iniciar
75073d0 config: conectar Supabase Free
85c805b feat: agregar vista local de demostracion
3c8a66e feat: portal colaborativo Diplomado de Gerencia Media
```

---

## 17. Verificación de la publicación

Después de cada `git push`:

1. Esperar entre uno y tres minutos.
2. Abrir la URL pública.
3. Usar `Ctrl + F5`.
4. Confirmar que el título sea **Portal | Diplomado de Gerencia Media**.
5. Comprobar que aparezca el registro sin código.
6. Probar inicio de sesión.
7. Comprobar el Centro de equipos.
8. Probar administración con una cuenta autorizada.
9. Solicitar un correo de recuperación nuevo y verificar el destino público.

En la primera publicación productiva se verificó:

- Respuesta HTTP `200`.
- Título correcto.
- Centro de equipos presente.
- Pantalla de cambio de contraseña presente.
- Ausencia de los usuarios demo en la página visible.
- Coincidencia entre el commit local y `origin/main`.

---

## 18. Reglas de seguridad para próximas iteraciones

No hacer lo siguiente:

- No escribir contraseñas en archivos Markdown, JavaScript o SQL versionado.
- No publicar tokens recibidos por correo.
- No pegar la `service_role key` en `config.js`.
- No colocar la contraseña de PostgreSQL en GitHub.
- No desactivar RLS para resolver rápidamente un error.
- No asignar `admin` automáticamente por correo durante el registro mientras la confirmación esté desactivada.
- No permitir que un código de invitación otorgue liderazgo.
- No ejecutar SQL destructivo sin copia o validación previa.

Medidas pendientes o recomendadas:

- Si una contraseña de base fue compartida por un canal no seguro, rotarla desde Database → Settings.
- Si un enlace de recuperación fue compartido, no reutilizarlo; solicitar otro.
- Considerar reactivar la confirmación de correo antes de invitar a participantes reales.
- Configurar SMTP institucional si el volumen de correos supera el servicio de prueba de Supabase.
- Revisar periódicamente usuarios y sesiones en Authentication → Users.
- Eliminar o bloquear cuentas temporales de prueba cuando ya no sean necesarias.
- Definir una política de respaldo y retención de información académica.

---

## 19. Pendientes prioritarios

### Antes del uso con todo el diplomado

- [ ] Registrar la cuenta administradora si aún no existe.
- [ ] Ejecutar `supabase/migracion-acceso-y-lideres.sql`.
- [ ] Ejecutar `supabase/migracion-fix-pgcrypto.sql`.
- [ ] Ejecutar `supabase/migracion-admin-eliminaciones.sql`.
- [ ] Confirmar `admin | active` para el correo administrador.
- [ ] Configurar las Redirect URLs públicas en Supabase.
- [ ] Confirmar si se crearán los 20 equipos anticipadamente o bajo demanda.
- [ ] Probar un líder creando o reclamando `Equipo 01`.
- [ ] Probar un integrante aceptando una invitación.
- [ ] Verificar que un integrante no vea otros equipos.
- [ ] Probar recuperación de contraseña desde la URL pública.
- [ ] Revisar y eliminar cuentas demo innecesarias.
- [ ] Rotar la contraseña de base si todavía no se hizo después de haberla compartido.

### Mejoras futuras posibles

- Gestión de integrantes por parte del líder.
- Salida o traslado controlado entre equipos.
- Panel de equipos disponibles.
- Auditoría visible de cambios.
- Notificaciones por correo.
- Exportación del proyecto a PDF.
- Copias de seguridad automatizadas.
- Gestión de nuevas cohortes sin modificar código.
- Configuración de fechas desde administración.
- Indicadores consolidados del diplomado.
- Pruebas automáticas de permisos RLS.
- Accesibilidad y revisión móvil con usuarios reales.

---

## 20. Cómo iniciar la próxima iteración

Al retomar el proyecto, seguir este orden:

1. Leer este documento.
2. Ejecutar `git status` y confirmar que no existan cambios desconocidos.
3. Ejecutar `git pull --ff-only` para recibir cambios remotos.
4. Revisar el estado de Supabase y los pendientes marcados aquí.
5. Probar localmente `index.html`, `admin.html` y `jury.html`.
6. Definir un cambio pequeño y verificable.
7. Modificar esquema y migración por separado cuando cambie la base.
8. Validar seguridad y permisos.
9. Crear un commit descriptivo.
10. Hacer `git push` y verificar GitHub Pages.
11. Actualizar esta memoria con la decisión, el commit y cualquier pendiente nuevo.

---

## 21. Referencias rápidas

- Portal: <https://stevenvargas98.github.io/diplomado-gerencia-media-terpel-2026/>
- Repositorio: <https://github.com/StevenVargaS98/diplomado-gerencia-media-terpel-2026>
- Supabase Dashboard: <https://supabase.com/dashboard/project/zlilnnthjztzszejxwfd>
- SQL Editor: <https://supabase.com/dashboard/project/zlilnnthjztzszejxwfd/sql/new>
- Guía de configuración: `CONFIGURAR-SUPABASE.md`.
- Arquitectura: `ARQUITECTURA-Y-SEGURIDAD.md`.
- Lista de producción: `CHECKLIST-PRODUCCION.md`.

---

## 22. Resumen ejecutivo del estado

El portal web está construido y publicado en GitHub Pages. La interfaz productiva está conectada al proyecto Supabase y permite autenticación, acceso sin equipo, liderazgo autorizado, invitaciones para integrantes, trabajo académico colaborativo, administración, jurados y recuperación simple de contraseña.

El siguiente punto crítico no es agregar más interfaz: es confirmar la migración de Supabase, las URLs públicas de recuperación y una prueba completa con tres cuentas separadas —administrador, líder e integrante— antes de abrir el sistema a todo el diplomado.
