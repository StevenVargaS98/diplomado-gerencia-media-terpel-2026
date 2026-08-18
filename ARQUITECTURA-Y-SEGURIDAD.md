# Arquitectura y seguridad

## Separación de responsabilidades

```text
GitHub Pages (público)
  ├── HTML, CSS y JavaScript
  ├── Portal de participantes
  └── Pantalla administrativa
            ↓ sesión JWT
Supabase (protegido)
  ├── Auth: identidad y recuperación de acceso
  ├── PostgreSQL: información académica
  ├── RLS: autorización por usuario y equipo
  ├── Storage: entregables privados
  └── Realtime: cambios colaborativos
```

La página `admin.html` no se considera secreta. Cualquier persona puede conocer su URL, pero no puede leer ni modificar información sin sesión válida y rol autorizado. Las decisiones de acceso se ejecutan en PostgreSQL.

## Roles

### Globales

- `admin`: administra toda la cohorte.
- `docente`: consulta y revisa todos los equipos.
- `participante`: accede a sus equipos.
- `jurado`: evalúa proyectos asignados.

### Dentro del equipo

- `lider`: coordina y administra el proyecto del equipo.
- `integrante`: crea y modifica contenidos.
- `observador`: consulta sin modificar.

## Entidades principales

```text
cohorts
  └── academic_teams
        ├── team_members ── profiles ── auth.users
        ├── invitations
        └── projects
              ├── problem_diagnosis
              ├── project_objectives
              ├── solution_alternatives
              ├── action_plan
              ├── stakeholders
              ├── project_resources
              ├── indicators
              ├── prototype
              ├── deliverables ── storage.objects
              ├── project_comments
              ├── jury_assignments
              ├── jury_reviews
              └── activity_log
```

## Reglas críticas

- Ninguna tabla académica permite acceso anónimo.
- La membresía activa determina qué equipo puede consultar el participante.
- Escritura limitada a líderes e integrantes.
- Docentes y administradores operan mediante un rol global protegido.
- Las invitaciones usan SHA-256, vencimiento y máximo de usos.
- Los archivos se guardan en un bucket privado y se consultan con URL firmada.
- Los roles no se toman de metadatos editables del usuario.
- Los cambios importantes registran autor y fecha.

## Alcance de privacidad

RLS protege los datos frente a otros usuarios del portal y frente a visitantes. No reemplaza las políticas corporativas de clasificación, retención, consentimiento, auditoría o transferencia internacional de datos. Antes de cargar información sensible de la organización se requiere la aprobación institucional correspondiente.
