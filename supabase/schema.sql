-- Portal académico · Diplomado de Gerencia Media
-- Ejecutar una sola vez en Supabase > SQL Editor.
-- Todas las tablas expuestas tienen Row Level Security (RLS).

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  organization text not null default 'Organización Terpel',
  global_role text not null default 'participante' check (global_role in ('admin','docente','participante','jurado','lider')),
  status text not null default 'active' check (status in ('pending','active','blocked')),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cohorts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  year integer not null,
  institution text not null default 'Pontificia Universidad Javeriana',
  company text not null default 'Organización Terpel',
  starts_on date,
  ends_on date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(name, year)
);

create table if not exists public.strategic_perspectives (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  sort_order integer not null
);

create table if not exists public.academic_teams (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  name text not null,
  modality text not null check (modality in ('presencial','remoto')),
  max_members integer not null check (max_members between 3 and 8),
  leader_id uuid references public.profiles(id) on delete set null,
  status text not null default 'forming' check (status in ('forming','active','submitted','archived')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(cohort_id, name)
);

create table if not exists public.team_members (
  team_id uuid not null references public.academic_teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'integrante' check (role in ('lider','integrante','observador')),
  status text not null default 'active' check (status in ('invited','active','removed')),
  joined_at timestamptz not null default now(),
  primary key(team_id, user_id)
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.academic_teams(id) on delete cascade,
  code_hash text not null unique,
  role text not null default 'integrante' check (role in ('lider','integrante','observador')),
  max_uses integer not null default 1 check (max_uses > 0),
  use_count integer not null default 0 check (use_count >= 0),
  expires_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.academic_teams(id) on delete cascade,
  perspective_id uuid references public.strategic_perspectives(id),
  title text not null,
  strategic_alignment text not null default '',
  executive_summary text not null default '',
  stage text not null default 'formulacion' check (stage in ('formulacion','prototipo','shark_tank','completed')),
  status text not null default 'draft' check (status in ('draft','in_review','changes_requested','approved','presented')),
  progress integer not null default 0 check (progress between 0 and 100),
  created_by uuid not null references public.profiles(id),
  updated_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(team_id)
);

create table if not exists public.problem_diagnosis (
  project_id uuid primary key references public.projects(id) on delete cascade,
  current_situation text not null default '',
  justification text not null default '',
  impact text not null default '',
  physical_location text not null default '',
  people_involved text not null default '',
  magnitude text not null default '',
  chronology text not null default '',
  root_causes text not null default '',
  relevant_data text not null default '',
  cost_impact numeric(16,2),
  service_impact text not null default '',
  quality_impact text not null default '',
  organizational_capabilities text not null default '',
  updated_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_objectives (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  objective_type text not null check (objective_type in ('general','specific')),
  statement text not null,
  metric text not null default '',
  baseline numeric,
  target numeric,
  unit text not null default '',
  deadline date,
  sort_order integer not null default 0,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.solution_alternatives (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text not null,
  expected_impact text not null default '',
  feasibility_score integer check (feasibility_score between 1 and 5),
  impact_score integer check (impact_score between 1 and 5),
  cost_score integer check (cost_score between 1 and 5),
  selected boolean not null default false,
  selection_rationale text not null default '',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.action_plan (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  objective_id uuid references public.project_objectives(id) on delete set null,
  action text not null,
  method text not null default '',
  owner_id uuid references public.profiles(id) on delete set null,
  owner_name text not null default '',
  start_date date,
  end_date date,
  status text not null default 'pending' check (status in ('pending','in_progress','blocked','completed')),
  progress integer not null default 0 check (progress between 0 and 100),
  sort_order integer not null default 0,
  created_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.stakeholders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  person_name text not null,
  project_role text not null,
  functions text not null,
  dedication_hours numeric(6,2),
  dedication_period text not null default 'semanales',
  area text not null default '',
  is_team_member boolean not null default false,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.project_resources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  resource_type text not null check (resource_type in ('humano','tecnologico','financiero','fisico','informacion','otro')),
  description text not null,
  estimated_cost numeric(16,2) not null default 0,
  availability text not null default '',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.indicators (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  objective_id uuid references public.project_objectives(id) on delete set null,
  name text not null,
  indicator_type text not null check (indicator_type in ('eficacia','eficiencia','impacto')),
  formula text not null,
  baseline numeric,
  target numeric,
  current_value numeric,
  unit text not null default '',
  frequency text not null default '',
  data_source text not null default '',
  owner_name text not null default '',
  created_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.prototype (
  project_id uuid primary key references public.projects(id) on delete cascade,
  prototype_type text not null default '',
  value_proposition text not null default '',
  description text not null default '',
  hypothesis text not null default '',
  validation_method text not null default '',
  test_results text not null default '',
  evidence_url text not null default '',
  status text not null default 'idea' check (status in ('idea','design','testing','validated')),
  updated_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.deliverables (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  stage text not null check (stage in ('formulacion','guia_completa','prototipo','shark_tank')),
  title text not null,
  due_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','submitted','in_review','changes_requested','approved')),
  file_path text not null default '',
  submitted_at timestamptz,
  submitted_by uuid references public.profiles(id),
  reviewer_feedback text not null default '',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  unique(project_id, stage)
);

create table if not exists public.project_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  section text not null default 'general',
  body text not null,
  author_id uuid not null references public.profiles(id),
  parent_id uuid references public.project_comments(id) on delete cascade,
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jury_assignments (
  project_id uuid not null references public.projects(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key(project_id, reviewer_id)
);

create table if not exists public.jury_reviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  strategic_impact integer check (strategic_impact between 1 and 5),
  feasibility integer check (feasibility between 1 and 5),
  innovation integer check (innovation between 1 and 5),
  evidence_quality integer check (evidence_quality between 1 and 5),
  presentation integer check (presentation between 1 and 5),
  comments text not null default '',
  recommendation text not null default '',
  submitted_at timestamptz,
  unique(project_id, reviewer_id)
);

create table if not exists public.activity_log (
  id bigint generated always as identity primary key,
  project_id uuid references public.projects(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists team_members_user_idx on public.team_members(user_id);
create index if not exists projects_team_idx on public.projects(team_id);
create index if not exists objectives_project_idx on public.project_objectives(project_id);
create index if not exists actions_project_idx on public.action_plan(project_id);
create index if not exists indicators_project_idx on public.indicators(project_id);
create index if not exists comments_project_idx on public.project_comments(project_id);

-- Perfil automático para cada usuario registrado.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
begin
  insert into public.profiles(id, email, full_name, global_role, status)
  values(
    new.id,
    coalesce(new.email,''),
    coalesce(new.raw_user_meta_data->>'full_name',''),
    'participante',
    'active'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.current_global_role()
returns text language sql stable security definer set search_path = public, pg_temp
as $$ select global_role from public.profiles where id = auth.uid() and status = 'active' and deleted_at is null $$;

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
begin
  if (new.global_role is distinct from old.global_role or new.status is distinct from old.status or new.email is distinct from old.email)
     and auth.uid() is not null and not public.is_admin() then
    if not (
      new.email is not distinct from old.email
      and new.status is not distinct from old.status
      and old.global_role in ('participante','lider')
      and new.global_role in ('participante','lider')
      and public.is_facilitator()
    ) then
      raise exception 'No puede modificar su rol, estado o correo desde el portal';
    end if;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_facilitator()
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$ select coalesce(public.current_global_role() in ('admin','docente'), false) $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$ select coalesce(public.current_global_role() = 'admin', false) $$;

drop trigger if exists protect_profile_privileges on public.profiles;
create trigger protect_profile_privileges before update on public.profiles
for each row execute function public.protect_profile_privileges();

create or replace function public.is_team_member(p_team uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$ select exists(select 1 from public.team_members where team_id=p_team and user_id=auth.uid() and status='active') $$;

create or replace function public.can_edit_team(p_team uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$
  select public.is_facilitator() or exists(
    select 1 from public.team_members
    where team_id=p_team and user_id=auth.uid() and status='active' and role in ('lider','integrante')
  )
$$;

create or replace function public.can_view_project(p_project uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$
  select public.is_facilitator()
    or exists(select 1 from public.projects p join public.team_members tm on tm.team_id=p.team_id where p.id=p_project and tm.user_id=auth.uid() and tm.status='active')
    or exists(select 1 from public.jury_assignments ja where ja.project_id=p_project and ja.reviewer_id=auth.uid())
$$;

create or replace function public.can_edit_project(p_project uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$ select exists(select 1 from public.projects where id=p_project and public.can_edit_team(team_id)) $$;

-- Directorio privado del equipo. Expone nombre y correo únicamente a integrantes
-- del mismo grupo y a facilitadores autorizados.
create or replace function public.get_team_participants(p_team uuid)
returns table(
  profile_id uuid,
  full_name text,
  email text,
  member_role text,
  joined_at timestamptz,
  can_edit boolean,
  is_current_user boolean
)
language plpgsql
stable
security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Debe iniciar sesión';
  end if;
  if not (public.is_facilitator() or public.is_team_member(p_team)) then
    raise exception 'No autorizado para consultar este equipo';
  end if;

  return query
  select
    p.id,
    p.full_name,
    p.email,
    tm.role,
    tm.joined_at,
    (tm.role in ('lider','integrante') and p.status = 'active'),
    (p.id = auth.uid())
  from public.team_members tm
  join public.profiles p on p.id = tm.user_id
  where tm.team_id = p_team
    and tm.status = 'active'
    and p.status = 'active'
  order by case when tm.role = 'lider' then 0 else 1 end, p.full_name, p.email;
end;
$$;

-- Un administrador o docente puede habilitar a un participante para crear su equipo.
create or replace function public.set_team_leader_permission(p_profile uuid, p_enabled boolean)
returns void
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  target_role text;
begin
  if not public.is_facilitator() then
    raise exception 'No autorizado';
  end if;

  select global_role into target_role
  from public.profiles
  where id = p_profile
  for update;

  if target_role is null then
    raise exception 'Perfil no encontrado';
  end if;
  if target_role not in ('participante','lider') then
    raise exception 'Solo se puede habilitar a participantes';
  end if;

  update public.profiles
  set global_role = case when p_enabled then 'lider' else 'participante' end,
      updated_at = now()
  where id = p_profile;
end;
$$;

-- El líder autorizado crea un equipo o reclama uno enumerado que todavía esté vacío.
create or replace function public.create_team_as_leader(p_name text, p_modality text, p_max_members integer)
returns uuid
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  cohort_key uuid;
  team_key uuid;
  clean_name text := trim(p_name);
begin
  if auth.uid() is null then
    raise exception 'Debe iniciar sesión';
  end if;
  if public.current_global_role() <> 'lider' then
    raise exception 'El profesor debe asignarle primero el rol de líder';
  end if;
  if char_length(clean_name) < 3 or char_length(clean_name) > 80 then
    raise exception 'El nombre del equipo debe tener entre 3 y 80 caracteres';
  end if;
  if p_modality not in ('presencial','remoto') then
    raise exception 'Modalidad inválida';
  end if;
  if p_max_members not between 3 and 8 then
    raise exception 'La capacidad debe estar entre 3 y 8 integrantes';
  end if;

  -- Evita que dos solicitudes simultáneas creen más de un equipo para la misma persona.
  perform 1 from public.profiles where id = auth.uid() for update;
  if exists (
    select 1 from public.team_members
    where user_id = auth.uid() and status = 'active'
  ) then
    raise exception 'Ya pertenece a un equipo activo';
  end if;

  select id into cohort_key
  from public.cohorts
  where active = true
  order by year desc, created_at
  limit 1;
  if cohort_key is null then
    raise exception 'No existe una cohorte activa';
  end if;

  select id into team_key
  from public.academic_teams
  where cohort_id = cohort_key and lower(name) = lower(clean_name)
  for update;

  if team_key is not null then
    if exists (
      select 1 from public.academic_teams
      where id = team_key and leader_id is not null
    ) or exists (
      select 1 from public.team_members
      where team_id = team_key and status = 'active'
    ) then
      raise exception 'Ese nombre de equipo ya está ocupado';
    end if;
    update public.academic_teams
    set leader_id = auth.uid(), modality = p_modality,
        max_members = p_max_members, status = 'active', created_by = auth.uid()
    where id = team_key;
  else
    insert into public.academic_teams(
      cohort_id, name, modality, max_members, leader_id, status, created_by
    ) values (
      cohort_key, clean_name, p_modality, p_max_members,
      auth.uid(), 'active', auth.uid()
    )
    returning id into team_key;
  end if;

  insert into public.team_members(team_id, user_id, role, status)
  values(team_key, auth.uid(), 'lider', 'active');

  return team_key;
end;
$$;

-- El participante usa el código una vez autenticado. El código nunca se almacena en texto plano.
create or replace function public.join_with_invitation(raw_code text, participant_name text)
returns uuid
language plpgsql
security definer set search_path = extensions, public, pg_temp
as $$
declare
  invitation_row public.invitations%rowtype;
  team_capacity integer;
begin
  if auth.uid() is null then raise exception 'Debe iniciar sesión'; end if;
  if not exists(select 1 from public.profiles where id=auth.uid() and status='active') then
    raise exception 'Su cuenta no está activa';
  end if;
  select * into invitation_row from public.invitations
  where code_hash=encode(digest(upper(trim(raw_code)),'sha256'),'hex')
    and revoked_at is null and use_count < max_uses
    and (expires_at is null or expires_at > now())
  for update;
  if invitation_row.id is null then raise exception 'Código inválido o vencido'; end if;
  if invitation_row.role <> 'integrante' then
    raise exception 'Esta invitación ya no es válida para ingresar como integrante';
  end if;
  if exists(select 1 from public.team_members where team_id=invitation_row.team_id and user_id=auth.uid() and status='active') then
    return invitation_row.team_id;
  end if;
  if exists(select 1 from public.team_members where user_id=auth.uid() and status='active') then
    raise exception 'Ya pertenece a otro equipo activo';
  end if;
  select max_members into team_capacity from public.academic_teams where id=invitation_row.team_id for update;
  if (select count(*) from public.team_members where team_id=invitation_row.team_id and status='active') >= team_capacity then
    raise exception 'El equipo alcanzó su capacidad máxima';
  end if;
  update public.profiles set full_name=trim(participant_name), updated_at=now() where id=auth.uid();
  insert into public.team_members(team_id,user_id,role,status)
  values(invitation_row.team_id,auth.uid(),invitation_row.role,'active')
  on conflict(team_id,user_id) do update set role=excluded.role,status='active';
  update public.invitations set use_count=use_count+1 where id=invitation_row.id;
  return invitation_row.team_id;
end;
$$;

create or replace function public.create_invitation(p_team uuid, raw_code text, p_role text, p_max_uses integer, p_expires_at timestamptz)
returns uuid
language plpgsql
security definer set search_path = extensions, public, pg_temp
as $$
declare new_id uuid;
begin
  if not (public.is_facilitator() or exists(select 1 from public.team_members where team_id=p_team and user_id=auth.uid() and role='lider' and status='active')) then
    raise exception 'No autorizado';
  end if;
  if p_role <> 'integrante' then raise exception 'Las invitaciones son únicamente para integrantes'; end if;
  if char_length(trim(raw_code)) < 8 then raise exception 'El código debe tener al menos 8 caracteres'; end if;
  insert into public.invitations(team_id,code_hash,role,max_uses,expires_at,created_by)
  values(p_team,encode(digest(upper(trim(raw_code)),'sha256'),'hex'),p_role,greatest(p_max_uses,1),p_expires_at,auth.uid())
  returning id into new_id;
  return new_id;
end;
$$;

-- Eliminación administrativa de una persona: bloquea la cuenta y conserva la
-- trazabilidad académica. La eliminación física de Auth se hace desde Supabase.
create or replace function public.admin_remove_person(p_profile uuid)
returns void
language plpgsql
security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede eliminar personas';
  end if;
  if p_profile = auth.uid() then
    raise exception 'No puede eliminar su propia cuenta administradora';
  end if;
  if not exists(select 1 from public.profiles where id = p_profile and deleted_at is null) then
    raise exception 'La persona no existe o ya fue eliminada';
  end if;

  update public.academic_teams
  set leader_id = null, status = case when status = 'active' then 'forming' else status end
  where leader_id = p_profile;

  update public.team_members
  set status = 'removed'
  where user_id = p_profile and status <> 'removed';

  delete from public.jury_assignments where reviewer_id = p_profile;

  update public.profiles
  set global_role = 'participante', status = 'blocked', deleted_at = now(), updated_at = now()
  where id = p_profile;
end;
$$;

-- Eliminación irreversible de un equipo y de todos sus registros académicos.
create or replace function public.admin_delete_team(p_team uuid, p_confirmation text)
returns void
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  team_name text;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede eliminar equipos';
  end if;

  select name into team_name
  from public.academic_teams
  where id = p_team
  for update;

  if team_name is null then
    raise exception 'El equipo no existe';
  end if;
  if trim(coalesce(p_confirmation, '')) <> team_name then
    raise exception 'La confirmación no coincide con el nombre del equipo';
  end if;

  delete from public.academic_teams where id = p_team;
end;
$$;

-- RLS: la URL y el JavaScript son públicos; los datos no lo son.
alter table public.profiles enable row level security;
alter table public.cohorts enable row level security;
alter table public.strategic_perspectives enable row level security;
alter table public.academic_teams enable row level security;
alter table public.team_members enable row level security;
alter table public.invitations enable row level security;
alter table public.projects enable row level security;
alter table public.problem_diagnosis enable row level security;
alter table public.project_objectives enable row level security;
alter table public.solution_alternatives enable row level security;
alter table public.action_plan enable row level security;
alter table public.stakeholders enable row level security;
alter table public.project_resources enable row level security;
alter table public.indicators enable row level security;
alter table public.prototype enable row level security;
alter table public.deliverables enable row level security;
alter table public.project_comments enable row level security;
alter table public.jury_assignments enable row level security;
alter table public.jury_reviews enable row level security;
alter table public.activity_log enable row level security;

create policy "profile own or facilitator read" on public.profiles for select to authenticated using(id=auth.uid() or public.is_facilitator());
create policy "profile own update" on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy "profile admin update" on public.profiles for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "cohorts authenticated read" on public.cohorts for select to authenticated using(true);
create policy "cohorts facilitator manage" on public.cohorts for all to authenticated using(public.is_facilitator()) with check(public.is_facilitator());
create policy "perspectives authenticated read" on public.strategic_perspectives for select to authenticated using(true);
create policy "teams scoped read" on public.academic_teams for select to authenticated using(public.is_facilitator() or public.is_team_member(id));
create policy "teams facilitator create" on public.academic_teams for insert to authenticated with check(public.is_facilitator());
create policy "teams managed update" on public.academic_teams for update to authenticated using(public.is_facilitator() or exists(select 1 from public.team_members where team_id=id and user_id=auth.uid() and role='lider'));
create policy "members scoped read" on public.team_members for select to authenticated using(public.is_facilitator() or public.is_team_member(team_id));
create policy "members facilitator manage" on public.team_members for all to authenticated using(public.is_facilitator()) with check(public.is_facilitator());
create policy "invitations managers read" on public.invitations for select to authenticated using(public.is_facilitator() or exists(select 1 from public.team_members where team_id=invitations.team_id and user_id=auth.uid() and role='lider'));
create policy "invitations managers update" on public.invitations for update to authenticated using(public.is_facilitator() or exists(select 1 from public.team_members where team_id=invitations.team_id and user_id=auth.uid() and role='lider'));
create policy "projects scoped read" on public.projects for select to authenticated using(public.can_view_project(id));
create policy "projects team create" on public.projects for insert to authenticated with check(public.can_edit_team(team_id) and created_by=auth.uid() and updated_by=auth.uid());
create policy "projects team update" on public.projects for update to authenticated using(public.can_edit_team(team_id)) with check(public.can_edit_team(team_id));
create policy "projects leader delete" on public.projects for delete to authenticated using(public.is_facilitator() or exists(select 1 from public.team_members where team_id=projects.team_id and user_id=auth.uid() and role='lider'));

-- Políticas uniformes para contenidos asociados al proyecto.
create policy "diagnosis read" on public.problem_diagnosis for select to authenticated using(public.can_view_project(project_id));
create policy "diagnosis write" on public.problem_diagnosis for all to authenticated using(public.can_edit_project(project_id)) with check(public.can_edit_project(project_id));
create policy "objectives read" on public.project_objectives for select to authenticated using(public.can_view_project(project_id));
create policy "objectives write" on public.project_objectives for all to authenticated using(public.can_edit_project(project_id)) with check(public.can_edit_project(project_id));
create policy "alternatives read" on public.solution_alternatives for select to authenticated using(public.can_view_project(project_id));
create policy "alternatives write" on public.solution_alternatives for all to authenticated using(public.can_edit_project(project_id)) with check(public.can_edit_project(project_id));
create policy "actions read" on public.action_plan for select to authenticated using(public.can_view_project(project_id));
create policy "actions write" on public.action_plan for all to authenticated using(public.can_edit_project(project_id)) with check(public.can_edit_project(project_id));
create policy "stakeholders read" on public.stakeholders for select to authenticated using(public.can_view_project(project_id));
create policy "stakeholders write" on public.stakeholders for all to authenticated using(public.can_edit_project(project_id)) with check(public.can_edit_project(project_id));
create policy "resources read" on public.project_resources for select to authenticated using(public.can_view_project(project_id));
create policy "resources write" on public.project_resources for all to authenticated using(public.can_edit_project(project_id)) with check(public.can_edit_project(project_id));
create policy "indicators read" on public.indicators for select to authenticated using(public.can_view_project(project_id));
create policy "indicators write" on public.indicators for all to authenticated using(public.can_edit_project(project_id)) with check(public.can_edit_project(project_id));
create policy "prototype read" on public.prototype for select to authenticated using(public.can_view_project(project_id));
create policy "prototype write" on public.prototype for all to authenticated using(public.can_edit_project(project_id)) with check(public.can_edit_project(project_id));
create policy "deliverables read" on public.deliverables for select to authenticated using(public.can_view_project(project_id));
create policy "deliverables team submit" on public.deliverables for insert to authenticated with check(public.can_edit_project(project_id));
create policy "deliverables update" on public.deliverables for update to authenticated using(public.can_edit_project(project_id) or public.is_facilitator());
create policy "comments read" on public.project_comments for select to authenticated using(public.can_view_project(project_id));
create policy "comments create" on public.project_comments for insert to authenticated with check(public.can_view_project(project_id) and author_id=auth.uid());
create policy "comments own update" on public.project_comments for update to authenticated using(author_id=auth.uid() or public.is_facilitator());
create policy "jury assignments read" on public.jury_assignments for select to authenticated using(reviewer_id=auth.uid() or public.is_facilitator());
create policy "jury assignments manage" on public.jury_assignments for all to authenticated using(public.is_facilitator()) with check(public.is_facilitator());
create policy "jury reviews read" on public.jury_reviews for select to authenticated using(reviewer_id=auth.uid() or public.is_facilitator() or public.can_view_project(project_id));
create policy "jury reviews own write" on public.jury_reviews for all to authenticated using(reviewer_id=auth.uid()) with check(reviewer_id=auth.uid());
create policy "activity read" on public.activity_log for select to authenticated using(project_id is not null and public.can_view_project(project_id));
create policy "activity create" on public.activity_log for insert to authenticated with check(actor_id=auth.uid() and project_id is not null and public.can_view_project(project_id));

-- Bucket privado para entregables. La ruta debe empezar por TEAM_ID/PROJECT_ID/.
insert into storage.buckets(id,name,public) values('deliverables','deliverables',false)
on conflict(id) do update set public=false;

create policy "deliverable files read" on storage.objects for select to authenticated
using(bucket_id='deliverables' and public.is_team_member(((storage.foldername(name))[1])::uuid) or (bucket_id='deliverables' and public.is_facilitator()));
create policy "deliverable files create" on storage.objects for insert to authenticated
with check(bucket_id='deliverables' and public.can_edit_team(((storage.foldername(name))[1])::uuid));
create policy "deliverable files update" on storage.objects for update to authenticated
using(bucket_id='deliverables' and public.can_edit_team(((storage.foldername(name))[1])::uuid));
create policy "deliverable files admin delete" on storage.objects for delete to authenticated
using(bucket_id='deliverables' and public.is_admin());

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protect_profile_privileges() from public, anon, authenticated;
revoke execute on function public.join_with_invitation(text,text) from public, anon;
revoke execute on function public.create_invitation(uuid,text,text,integer,timestamptz) from public, anon;
revoke execute on function public.set_team_leader_permission(uuid,boolean) from public, anon;
revoke execute on function public.create_team_as_leader(text,text,integer) from public, anon;
revoke execute on function public.admin_remove_person(uuid) from public, anon;
revoke execute on function public.admin_delete_team(uuid,text) from public, anon;
revoke execute on function public.get_team_participants(uuid) from public, anon;
grant execute on function public.current_global_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_facilitator() to authenticated;
grant execute on function public.is_team_member(uuid) to authenticated;
grant execute on function public.can_edit_team(uuid) to authenticated;
grant execute on function public.can_view_project(uuid) to authenticated;
grant execute on function public.can_edit_project(uuid) to authenticated;
grant execute on function public.join_with_invitation(text,text) to authenticated;
grant execute on function public.create_invitation(uuid,text,text,integer,timestamptz) to authenticated;
grant execute on function public.set_team_leader_permission(uuid,boolean) to authenticated;
grant execute on function public.create_team_as_leader(text,text,integer) to authenticated;
grant execute on function public.admin_remove_person(uuid) to authenticated;
grant execute on function public.admin_delete_team(uuid,text) to authenticated;
grant execute on function public.get_team_participants(uuid) to authenticated;

revoke all on all tables in schema public from anon;
grant select,insert,update,delete on all tables in schema public to authenticated;
grant usage,select on all sequences in schema public to authenticated;

-- Sincronización en vivo. El bloque evita duplicados si una tabla ya está publicada.
do $$
declare table_name text;
begin
  foreach table_name in array array['projects','action_plan','project_comments','deliverables'] loop
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=table_name) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end $$;
