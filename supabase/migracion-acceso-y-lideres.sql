-- Migración: acceso sin equipo, líderes autorizados e invitaciones para integrantes.
-- Ejecutar una vez en Supabase > SQL Editor.

begin;

alter table public.profiles
  drop constraint if exists profiles_global_role_check;
alter table public.profiles
  add constraint profiles_global_role_check
  check (global_role in ('admin','docente','participante','jurado','lider'));

-- Asigna el administrador si la cuenta ya existe.
update public.profiles
set global_role = 'admin', status = 'active', updated_at = now()
where lower(email) = 'ing.stevenh.vargas@gmail.com';

-- También lo asigna automáticamente si esa cuenta se registra después de la migración.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $handle_new_user$
begin
  insert into public.profiles(id, email, full_name, global_role, status)
  values(
    new.id,
    coalesce(new.email,''),
    coalesce(new.raw_user_meta_data->>'full_name',''),
    case when lower(coalesce(new.email,'')) = 'ing.stevenh.vargas@gmail.com' then 'admin' else 'participante' end,
    'active'
  )
  on conflict (id) do update set
    email = excluded.email,
    global_role = case
      when lower(excluded.email) = 'ing.stevenh.vargas@gmail.com' then 'admin'
      else public.profiles.global_role
    end,
    status = case
      when lower(excluded.email) = 'ing.stevenh.vargas@gmail.com' then 'active'
      else public.profiles.status
    end;
  return new;
end;
$handle_new_user$;

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $protect_profile$
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
$protect_profile$;

create or replace function public.set_team_leader_permission(p_profile uuid, p_enabled boolean)
returns void
language plpgsql
security definer set search_path = public, pg_temp
as $set_leader$
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
$set_leader$;

create or replace function public.create_team_as_leader(p_name text, p_modality text, p_max_members integer)
returns uuid
language plpgsql
security definer set search_path = public, pg_temp
as $create_team$
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
$create_team$;

create or replace function public.join_with_invitation(raw_code text, participant_name text)
returns uuid
language plpgsql
security definer set search_path = public, pg_temp
as $join_team$
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

  select max_members into team_capacity
  from public.academic_teams
  where id=invitation_row.team_id
  for update;
  if (select count(*) from public.team_members where team_id=invitation_row.team_id and status='active') >= team_capacity then
    raise exception 'El equipo alcanzó su capacidad máxima';
  end if;

  update public.profiles
  set full_name=trim(participant_name), updated_at=now()
  where id=auth.uid();
  insert into public.team_members(team_id,user_id,role,status)
  values(invitation_row.team_id,auth.uid(),'integrante','active')
  on conflict(team_id,user_id) do update set role='integrante',status='active';
  update public.invitations set use_count=use_count+1 where id=invitation_row.id;
  return invitation_row.team_id;
end;
$join_team$;

create or replace function public.create_invitation(p_team uuid, raw_code text, p_role text, p_max_uses integer, p_expires_at timestamptz)
returns uuid
language plpgsql
security definer set search_path = public, pg_temp
as $create_invite$
declare new_id uuid;
begin
  if not (
    public.is_facilitator()
    or exists(
      select 1 from public.team_members
      where team_id=p_team and user_id=auth.uid() and role='lider' and status='active'
    )
  ) then
    raise exception 'No autorizado';
  end if;
  if p_role <> 'integrante' then
    raise exception 'Las invitaciones son únicamente para integrantes';
  end if;
  if char_length(trim(raw_code)) < 8 then
    raise exception 'El código debe tener al menos 8 caracteres';
  end if;

  insert into public.invitations(team_id,code_hash,role,max_uses,expires_at,created_by)
  values(
    p_team,
    encode(digest(upper(trim(raw_code)),'sha256'),'hex'),
    'integrante', greatest(p_max_uses,1), p_expires_at, auth.uid()
  )
  returning id into new_id;
  return new_id;
end;
$create_invite$;

-- Los códigos antiguos que daban liderazgo dejan de funcionar.
update public.invitations
set revoked_at = coalesce(revoked_at, now())
where role = 'lider';

revoke execute on function public.set_team_leader_permission(uuid,boolean) from public, anon;
revoke execute on function public.create_team_as_leader(text,text,integer) from public, anon;
revoke execute on function public.join_with_invitation(text,text) from public, anon;
revoke execute on function public.create_invitation(uuid,text,text,integer,timestamptz) from public, anon;
grant execute on function public.set_team_leader_permission(uuid,boolean) to authenticated;
grant execute on function public.create_team_as_leader(text,text,integer) to authenticated;
grant execute on function public.join_with_invitation(text,text) to authenticated;
grant execute on function public.create_invitation(uuid,text,text,integer,timestamptz) to authenticated;

commit;

select email, global_role, status
from public.profiles
where lower(email) = 'ing.stevenh.vargas@gmail.com';
