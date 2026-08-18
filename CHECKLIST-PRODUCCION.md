# Checklist antes de invitar participantes

## Supabase

- [ ] Proyecto creado en la región aprobada por la organización.
- [ ] `schema.sql` ejecutado sin errores.
- [ ] `seed.sql` ejecutado.
- [ ] Confirmación de correo habilitada.
- [ ] Site URL y Redirect URLs configuradas.
- [ ] Primer administrador promovido mediante SQL.
- [ ] Bucket `deliverables` aparece como privado.
- [ ] Realtime activo para proyectos, acciones, comentarios y entregables.

## Seguridad

- [ ] No existe ninguna `service_role key` en los archivos.
- [ ] Un usuario anónimo no puede consultar tablas.
- [ ] Un participante no puede abrir `admin.html`.
- [ ] Un participante del Equipo A no puede leer el Equipo B.
- [ ] Un participante no puede cambiar su rol global.
- [ ] Un observador no puede editar.
- [ ] Los archivos solo abren mediante URL firmada.
- [ ] Se validó la política institucional de tratamiento de datos.

## Operación académica

- [ ] Cohorte y fechas confirmadas.
- [ ] Equipos presenciales y remotos creados.
- [ ] Líder asignado en cada equipo.
- [ ] Códigos de invitación probados y enviados por canal privado.
- [ ] Docentes y jurados tienen el rol correcto.
- [ ] Rúbrica de jurados confirmada.
- [ ] Canal de soporte definido.
- [ ] Política de respaldos y retención definida.

## GitHub Pages

- [ ] `config.js` contiene Project URL y Publishable key.
- [ ] Repositorio no contiene secretos.
- [ ] Pages publica desde `main` y `/ (root)`.
- [ ] Inicio de sesión probado desde la URL final.
- [ ] Recuperación de contraseña probada.
- [ ] Dominio personalizado y HTTPS validados, si aplica.
