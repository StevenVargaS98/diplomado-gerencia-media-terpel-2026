# Configuración de Supabase

Esta guía convierte el paquete estático en un portal multiusuario con información persistente y privada.

## 1. Crear el proyecto

1. Ingrese a `https://supabase.com/dashboard`.
2. Cree un proyecto nuevo.
3. Seleccione una contraseña segura para la base y guárdela en un gestor de contraseñas.
4. Espere a que el proyecto quede disponible.

## 2. Crear la base académica

1. Abra **SQL Editor**.
2. Cree una consulta nueva.
3. Copie todo el contenido de `supabase/schema.sql` y ejecútelo.
4. Cree otra consulta.
5. Copie `supabase/seed.sql` y ejecútelo.

`schema.sql` crea las tablas, índices, funciones de invitación, almacenamiento privado y políticas RLS. `seed.sql` agrega la cohorte 2026 y las seis perspectivas estratégicas.

### Si ya instaló la primera versión

No vuelva a ejecutar todo el esquema. Abra una consulta nueva, copie `supabase/migracion-acceso-y-lideres.sql` y pulse **Run**. Esta migración permite entrar sin equipo, agrega el rol `lider`, habilita la creación segura de equipos y configura la cuenta administradora definida para el diplomado.

## 3. Configurar el registro

En **Authentication → Sign In / Providers → Email**:

- Mantenga habilitado Email y contraseña.
- Mantenga activa la confirmación de correo para producción.
- Configure plantillas de correo si desea una comunicación institucional.

En **Authentication → URL Configuration** configure:

```text
Site URL: https://USUARIO.github.io/NOMBRE-REPOSITORIO/
Redirect URL: https://USUARIO.github.io/NOMBRE-REPOSITORIO/index.html
```

Cuando el dominio personalizado funcione, agregue también:

```text
https://brujulamaestria.co/
https://brujulamaestria.co/index.html
```

## 4. Conectar la página

En **Project Settings → API** copie únicamente:

```text
Project URL
Publishable key
```

Edite `config.js`:

```js
window.PORTAL_CONFIG = {
  supabaseUrl: "https://SU-PROYECTO.supabase.co",
  supabasePublishableKey: "sb_publishable_...",
  siteName: "Diplomado de Gerencia Media",
};
```

No use la `service_role key`. Esa clave evita RLS y no debe aparecer en GitHub, el navegador, mensajes o capturas.

## 5. Cuenta administradora

Registre o inicie sesión con `ing.stevenh.vargas@gmail.com`. El esquema y la migración asignan automáticamente a esa cuenta el rol `admin` y estado activo. Después abra `admin.html`.

El administrador puede habilitar docentes, jurados y líderes. Un docente también puede alternar entre `Participante` y `Líder habilitado`, pero no puede conceder permisos administrativos.

## 6. Crear equipos e invitaciones

1. Cada persona crea su cuenta sin código y puede entrar aunque todavía no tenga equipo.
2. En `admin.html`, abra **Participantes** y cambie a `Líder habilitado` a quien corresponda.
3. Esa persona vuelve al portal y crea o reclama su equipo enumerado.
4. El líder pulsa **Invitar integrantes**, genera el código y lo comparte de forma privada.
5. Los demás participantes ingresan con su correo y contraseña y aceptan la invitación desde el Centro de equipos.

El código no sirve para crear la cuenta ni para otorgar liderazgo. Solo vincula integrantes autenticados. No se almacena en texto plano: la base conserva un hash, número máximo de usos y vencimiento.

## 7. Publicar en GitHub Pages

1. Cree un repositorio de GitHub.
2. Suba el contenido de `portal-diplomado-pages` a la raíz de `main`.
3. Abra **Settings → Pages**.
4. Seleccione **Deploy from a branch**, `main` y `/ (root)`.
5. Guarde y espere la URL.

El archivo `.nojekyll` evita transformaciones innecesarias.

## 8. Comprobaciones de seguridad

Realice estas pruebas antes de invitar a participantes reales:

- Un visitante sin sesión no puede leer ninguna tabla.
- Un integrante del Equipo A no puede consultar el Equipo B.
- Un participante no puede convertirse en administrador.
- Un observador no puede modificar proyectos.
- Un archivo entregado requiere una URL firmada y temporal.
- `admin.html` rechaza usuarios sin rol `admin` o `docente`.
- No existe ninguna `service_role key` en el repositorio.

## 9. Copias de seguridad

Antes de iniciar producción, defina una política institucional de respaldo y retención en Supabase. Para información empresarial sensible, valide región, tratamiento de datos, términos institucionales y responsables de administración.
