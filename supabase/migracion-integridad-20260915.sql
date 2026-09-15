-- Ejecutar DESPUÉS de las cuatro migraciones históricas. Transacción completa.
-- No elimina datos académicos. Si hay duplicados previos, falla antes de publicar cambios.
begin;

alter table public.academic_teams drop constraint if exists academic_teams_status_check;
alter table public.academic_teams add constraint academic_teams_status_check check(status in ('forming','active','submitted','archived','deleting'));

do $$ declare t text; begin
  foreach t in array array['projects','problem_diagnosis','project_objectives','solution_alternatives','action_plan','stakeholders','project_resources','indicators','prototype','deliverables','project_comments','jury_reviews'] loop
    execute format('alter table public.%I add column if not exists version bigint not null default 1',t);
  end loop;
  if exists(select 1 from public.team_members where status='active' group by user_id having count(*)>1) then
    raise exception 'Migración detenida: hay personas con varias membresías activas. Revise preflight-integridad.sql.';
  end if;
  if exists(select 1 from public.project_objectives where objective_type='general' group by project_id having count(*)>1) then
    raise exception 'Migración detenida: hay proyectos con varios objetivos generales. Revise preflight-integridad.sql.';
  end if;
  if exists(select 1 from public.solution_alternatives where selected group by project_id having count(*)>1) then
    raise exception 'Migración detenida: hay varias alternativas seleccionadas. Revise preflight-integridad.sql.';
  end if;
end $$;
create unique index if not exists one_active_team_per_user on public.team_members(user_id) where status='active';
create unique index if not exists one_general_objective on public.project_objectives(project_id) where objective_type='general';
create unique index if not exists one_selected_alternative on public.solution_alternatives(project_id) where selected;
create unique index if not exists team_name_case_insensitive on public.academic_teams(cohort_id,lower(name));
create index if not exists alternatives_project_idx on public.solution_alternatives(project_id);
create index if not exists stakeholders_project_idx on public.stakeholders(project_id);
create index if not exists resources_project_idx on public.project_resources(project_id);
create index if not exists reviews_project_idx on public.jury_reviews(project_id);
create index if not exists assignments_reviewer_idx on public.jury_assignments(reviewer_id);
create index if not exists activity_project_idx on public.activity_log(project_id,created_at desc);

create or replace function public.guard_team_capacity() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 new.name=trim(new.name);
 if new.name='' then raise exception 'Escriba un nombre de equipo'; end if;
 if tg_op='UPDATE' then
  if new.id<>old.id or new.cohort_id<>old.cohort_id then raise exception 'Identidad y cohorte del equipo inmutables'; end if;
  if new.max_members<(select count(*) from public.team_members where team_id=old.id and status='active') then raise exception 'La capacidad no puede ser menor que el número de integrantes activos'; end if;
 end if;
 return new;
end $$;
revoke execute on function public.guard_team_capacity() from public,anon,authenticated;
drop trigger if exists guard_team_capacity on public.academic_teams;
create trigger guard_team_capacity before insert or update on public.academic_teams for each row execute function public.guard_team_capacity();

create or replace function public.is_active_user() returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.profiles where id=auth.uid() and status='active' and deleted_at is null)
$$;
create or replace function public.is_team_member(p_team uuid) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select public.is_active_user() and exists(select 1 from public.team_members where team_id=p_team and user_id=auth.uid() and status='active')
$$;
create or replace function public.can_manage_team(p_team uuid) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select public.is_active_user() and (public.is_facilitator() or exists(select 1 from public.team_members where team_id=p_team and user_id=auth.uid() and status='active' and role='lider'))
$$;
create or replace function public.can_edit_team(p_team uuid) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select public.is_active_user() and exists(select 1 from public.academic_teams where id=p_team and status in ('forming','active','submitted'))
 and (public.is_facilitator() or exists(select 1 from public.team_members where team_id=p_team and user_id=auth.uid() and status='active' and role in ('lider','integrante')))
$$;
create or replace function public.can_review_project(p_project uuid) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select public.current_global_role() in ('jurado','admin','docente')
 and exists(select 1 from public.jury_assignments where project_id=p_project and reviewer_id=auth.uid())
 and exists(select 1 from public.projects p join public.academic_teams t on t.id=p.team_id where p.id=p_project and t.status<>'deleting')
$$;
create or replace function public.can_view_project(p_project uuid) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select public.is_active_user() and (public.is_facilitator()
 or exists(select 1 from public.projects p where p.id=p_project and public.is_team_member(p.team_id))
 or public.can_review_project(p_project))
$$;
create or replace function public.can_view_team(p_team uuid) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select public.is_active_user() and (public.is_facilitator() or public.is_team_member(p_team)
 or exists(select 1 from public.projects where team_id=p_team and public.can_review_project(id)))
$$;

create or replace function public.protect_profile_privileges() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is not null then
  if not public.is_active_user() then raise exception 'Su cuenta no está activa'; end if;
  if (new.global_role,new.status,new.email,new.deleted_at) is distinct from (old.global_role,old.status,old.email,old.deleted_at) then
   if not public.is_admin() and not (public.is_facilitator() and new.global_role in ('participante','lider') and old.global_role in ('participante','lider') and (new.status,new.email,new.deleted_at) is not distinct from (old.status,old.email,old.deleted_at)) then
    raise exception 'No puede modificar privilegios, correo o eliminación del perfil';
   end if;
   perform pg_advisory_xact_lock(20260915,1);
   if old.global_role='admin' and old.status='active' and old.deleted_at is null
    and (new.global_role<>'admin' or new.status<>'active' or new.deleted_at is not null)
    and not exists(select 1 from public.profiles where id<>old.id and global_role='admin' and status='active' and deleted_at is null) then
    raise exception 'Debe conservar al menos un administrador activo';
   end if;
  end if;
  if new.id<>old.id or new.created_at<>old.created_at then raise exception 'Identidad inmutable'; end if;
 end if;
 new.updated_at=clock_timestamp(); return new;
end $$;

-- Modifica las funciones existentes sin duplicar sus firmas públicas.
-- La guarda NULL se corrige también en la definición canónica más abajo.
create or replace function public.create_team_as_leader(p_name text,p_modality text,p_max_members integer) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare c uuid; t uuid; clean text:=trim(p_name);
begin
 perform 1 from public.profiles where id=auth.uid() for update;
 if public.current_global_role() is distinct from 'lider' then raise exception 'El profesor debe asignarle primero el rol de líder activo'; end if;
 if clean is null or char_length(clean) not between 3 and 80 or p_modality is null or p_modality not in ('presencial','remoto') or p_max_members is null or p_max_members not between 3 and 8 then raise exception 'Datos de equipo inválidos'; end if;
 if exists(select 1 from public.team_members where user_id=auth.uid() and status='active') then raise exception 'Ya pertenece a un equipo activo'; end if;
 select id into c from public.cohorts where active order by year desc,created_at limit 1;
 if c is null then raise exception 'No existe una cohorte activa'; end if;
 perform pg_advisory_xact_lock(hashtextextended(c::text||lower(clean),0));
 select id into t from public.academic_teams where cohort_id=c and lower(name)=lower(clean) for update;
 if t is null then
  insert into public.academic_teams(cohort_id,name,modality,max_members,leader_id,status,created_by) values(c,clean,p_modality,p_max_members,auth.uid(),'active',auth.uid()) returning id into t;
 else
  if exists(select 1 from public.academic_teams where id=t and (leader_id is not null or status not in ('forming','active'))) or exists(select 1 from public.team_members where team_id=t and status='active') then raise exception 'Ese equipo no está disponible'; end if;
  update public.academic_teams set leader_id=auth.uid(),modality=p_modality,max_members=p_max_members,status='active' where id=t;
 end if;
 insert into public.team_members(team_id,user_id,role,status) values(t,auth.uid(),'lider','active') on conflict(team_id,user_id) do update set role='lider',status='active';
 return t;
end $$;
create or replace function public.join_with_invitation(raw_code text,participant_name text) returns uuid
language plpgsql security definer set search_path=extensions,public,pg_temp as $$
declare i public.invitations%rowtype; capacity integer;
begin
 perform 1 from public.profiles where id=auth.uid() for update;
 if not public.is_active_user() then raise exception 'Su cuenta no está activa'; end if;
 select * into i from public.invitations where code_hash=encode(digest(upper(trim(raw_code)),'sha256'),'hex') and revoked_at is null and use_count<max_uses and (expires_at is null or expires_at>now()) for update;
 if i.id is null or i.role is distinct from 'integrante' then raise exception 'Código inválido o vencido'; end if;
 select max_members into capacity from public.academic_teams where id=i.team_id and status in ('forming','active') for update;
 if capacity is null then raise exception 'El equipo no admite nuevos integrantes'; end if;
 if exists(select 1 from public.team_members where team_id=i.team_id and user_id=auth.uid() and status='active') then return i.team_id; end if;
 if exists(select 1 from public.team_members where user_id=auth.uid() and status='active') then raise exception 'Ya pertenece a otro equipo activo'; end if;
 if (select count(*) from public.team_members where team_id=i.team_id and status='active')>=capacity then raise exception 'El equipo alcanzó su capacidad máxima'; end if;
 if nullif(trim(participant_name),'') is null then raise exception 'Indique su nombre'; end if;
 update public.profiles set full_name=trim(participant_name) where id=auth.uid();
 insert into public.team_members(team_id,user_id,role,status) values(i.team_id,auth.uid(),'integrante','active') on conflict(team_id,user_id) do update set role='integrante',status='active';
 update public.invitations set use_count=use_count+1 where id=i.id;
 return i.team_id;
end $$;
create or replace function public.create_invitation(p_team uuid,raw_code text,p_role text,p_max_uses integer,p_expires_at timestamptz) returns uuid
language plpgsql security definer set search_path=extensions,public,pg_temp as $$
declare result uuid;
begin
 if not public.can_manage_team(p_team) then raise exception 'No autorizado'; end if;
 perform 1 from public.academic_teams where id=p_team and status in ('forming','active') for update;
 if not found then raise exception 'El equipo no admite invitaciones'; end if;
 if p_role is distinct from 'integrante' or raw_code is null or length(trim(raw_code))<8 or p_max_uses is null or p_max_uses<1 then raise exception 'Invitación inválida'; end if;
 insert into public.invitations(team_id,code_hash,role,max_uses,expires_at,created_by) values(p_team,encode(digest(upper(trim(raw_code)),'sha256'),'hex'),'integrante',p_max_uses,p_expires_at,auth.uid()) returning id into result;
 return result;
end $$;
create or replace function public.revoke_invitation(p_invitation uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not exists(select 1 from public.invitations where id=p_invitation and public.can_manage_team(team_id)) then raise exception 'No autorizado'; end if;
 update public.invitations set revoked_at=now() where id=p_invitation;
end $$;

-- Inicialización atómica e idempotente, incluidas bases con proyectos incompletos.
create or replace function public.initialize_project_records(p_project uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid; yr integer;
begin
 select p.created_by,c.year into actor,yr from public.projects p join public.academic_teams t on t.id=p.team_id join public.cohorts c on c.id=t.cohort_id where p.id=p_project;
 if actor is null then raise exception 'Proyecto inexistente'; end if;
 insert into public.problem_diagnosis(project_id,updated_by) values(p_project,actor) on conflict do nothing;
 insert into public.prototype(project_id,updated_by) values(p_project,actor) on conflict do nothing;
 insert into public.deliverables(project_id,stage,title,due_at) values
 (p_project,'formulacion','Formulación: diagnóstico y objetivos',make_timestamptz(yr,9,17,23,59,0,'America/Bogota')),
 (p_project,'guia_completa','Guía completa: ítems 3 al 7',make_timestamptz(yr,10,27,23,59,0,'America/Bogota')),
 (p_project,'prototipo','Prototipo validado',make_timestamptz(yr,11,19,23,59,0,'America/Bogota')),
 (p_project,'shark_tank','Presentación tipo shark tank',make_timestamptz(yr,11,26,8,0,0,'America/Bogota')) on conflict(project_id,stage) do nothing;
end $$;
create or replace function public.create_project(p_team uuid,p_title text,p_alignment text,p_perspective uuid default null) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare result uuid;
begin
 perform 1 from public.academic_teams where id=p_team for update;
 if not public.can_edit_team(p_team) then raise exception 'No autorizado'; end if;
 if nullif(trim(p_title),'') is null or nullif(trim(p_alignment),'') is null then raise exception 'Título y alineación son obligatorios'; end if;
 insert into public.projects(team_id,title,strategic_alignment,perspective_id,created_by,updated_by) values(p_team,trim(p_title),trim(p_alignment),p_perspective,auth.uid(),auth.uid()) on conflict(team_id) do nothing returning id into result;
 if result is null then select id into result from public.projects where team_id=p_team; end if;
 perform public.initialize_project_records(result);
 return result;
end $$;

create table if not exists public.deliverable_versions(
 id uuid primary key default gen_random_uuid(),
 deliverable_id uuid not null references public.deliverables(id) on delete cascade,
 project_id uuid not null references public.projects(id) on delete cascade,
 file_path text not null unique,
 submitted_by uuid references public.profiles(id),
 submitted_at timestamptz not null default now()
);
alter table public.deliverable_versions enable row level security;
create index if not exists deliverable_versions_project_idx on public.deliverable_versions(project_id,submitted_at desc);
insert into public.deliverable_versions(deliverable_id,project_id,file_path,submitted_by,submitted_at)
 select id,project_id,file_path,submitted_by,coalesce(submitted_at,now()) from public.deliverables where file_path<>'' on conflict(file_path) do nothing;

create or replace function public.valid_project_file(p_path text,p_write boolean default false) returns boolean
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare team uuid; project uuid;
begin
 if not public.is_active_user() or p_path is null then return false; end if;
 begin team:=split_part(p_path,'/',1)::uuid; project:=split_part(p_path,'/',2)::uuid; exception when invalid_text_representation then return false; end;
 return exists(select 1 from public.projects where id=project and team_id=team)
 and case when p_write then public.can_edit_project(project) and split_part(p_path,'/',4)=auth.uid()::text and split_part(p_path,'/',3) in ('formulacion','guia_completa','prototipo','shark_tank') and lower(p_path) ~ '\.(pdf|ppt|pptx|doc|docx|xlsx|png|jpg|jpeg)$' else public.can_view_project(project) end;
end $$;

-- Columnas de control, versión, autoría y referencias se validan en el servidor.
create or replace function public.guard_academic_row() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare n jsonb:=to_jsonb(new); o jsonb; pid uuid; target uuid;
begin
 if auth.uid() is not null and not public.is_active_user() then raise exception 'Su cuenta no está activa'; end if;
 if tg_op='UPDATE' then
  o:=to_jsonb(old);
  if (n->'id',n->'project_id',n->'team_id',n->'created_by',n->'created_at',n->'author_id',n->'reviewer_id') is distinct from (o->'id',o->'project_id',o->'team_id',o->'created_by',o->'created_at',o->'author_id',o->'reviewer_id') then raise exception 'Identidad, proyecto y autor originales son inmutables'; end if;
  n:=n||jsonb_build_object('version',(o->>'version')::bigint+1);
 else
  n:=n||jsonb_build_object('version',1);
  if auth.uid() is not null and n ? 'created_by' then n:=n||jsonb_build_object('created_by',auth.uid()); end if;
  if auth.uid() is not null and n ? 'author_id' then n:=n||jsonb_build_object('author_id',auth.uid()); end if;
  if auth.uid() is not null and n ? 'created_at' then n:=n||jsonb_build_object('created_at',clock_timestamp()); end if;
 end if;
 if n ? 'updated_at' then n:=n||jsonb_build_object('updated_at',clock_timestamp()); end if;
 if auth.uid() is not null and n ? 'updated_by' then n:=n||jsonb_build_object('updated_by',auth.uid()); end if;
 pid:=nullif(n->>'project_id','')::uuid;
 if n ? 'objective_id' and n->>'objective_id' is not null then
  if not exists(select 1 from public.project_objectives where id=(n->>'objective_id')::uuid and project_id=pid) then raise exception 'El objetivo debe pertenecer al mismo proyecto'; end if;
 end if;
 if tg_table_name='project_comments' and n->>'parent_id' is not null and not exists(select 1 from public.project_comments where id=(n->>'parent_id')::uuid and project_id=pid) then raise exception 'El comentario debe pertenecer al mismo proyecto'; end if;
 if tg_table_name='projects' and auth.uid() is not null and not public.is_facilitator() then
  if tg_op='UPDATE' and (new.stage,new.status) is distinct from (old.stage,old.status) then raise exception 'Solo un docente puede cambiar la etapa o aprobación'; end if;
  if tg_op='INSERT' and (new.stage<>'formulacion' or new.status<>'draft' or new.progress<>0) then raise exception 'El proyecto debe iniciar como borrador'; end if;
 end if;
 if tg_table_name='projects' and tg_op='UPDATE' and auth.uid() is not null and n->'progress' is distinct from o->'progress' and pg_trigger_depth()<2 then raise exception 'El avance se calcula automáticamente'; end if;
 if tg_table_name='solution_alternatives' and coalesce((n->>'selected')::boolean,false) then
  if nullif(trim(n->>'selection_rationale'),'') is null then raise exception 'Justifique la alternativa seleccionada'; end if;
  perform pg_advisory_xact_lock(hashtextextended(pid::text,1));
  update public.solution_alternatives set selected=false where project_id=pid and id<>(n->>'id')::uuid and selected;
 end if;
 if tg_table_name='deliverables' and tg_op='UPDATE' and auth.uid() is not null then
  if not public.is_facilitator() and (new.title,new.due_at,new.stage,new.reviewer_feedback,new.reviewed_by,new.reviewed_at) is distinct from (old.title,old.due_at,old.stage,old.reviewer_feedback,old.reviewed_by,old.reviewed_at) then raise exception 'Solo un docente puede modificar la revisión o el vencimiento'; end if;
  if new.file_path is distinct from old.file_path then
   if not public.valid_project_file(new.file_path,true) or split_part(new.file_path,'/',3)<>new.stage or not exists(select 1 from storage.objects where bucket_id='deliverables' and name=new.file_path) then raise exception 'Archivo inexistente o fuera del proyecto'; end if;
   n:=n||jsonb_build_object('status','submitted','submitted_by',auth.uid(),'submitted_at',now(),'reviewer_feedback','','reviewed_by',null,'reviewed_at',null);
  elsif public.is_facilitator() then
   if new.status in ('approved','in_review','changes_requested') and new.file_path='' then raise exception 'No se puede revisar una entrega sin archivo'; end if;
   if (new.status,new.reviewer_feedback) is distinct from (old.status,old.reviewer_feedback) then n:=n||jsonb_build_object('reviewed_by',auth.uid(),'reviewed_at',now()); end if;
  elsif (new.status,new.submitted_by,new.submitted_at) is distinct from (old.status,old.submitted_by,old.submitted_at) then raise exception 'Debe subir un archivo para registrar una entrega'; end if;
 end if;
 if tg_table_name='jury_reviews' then
  if not public.can_review_project(pid) or new.reviewer_id<>auth.uid() then raise exception 'Debe ser un jurado asignado activo'; end if;
  if new.strategic_impact is null or new.feasibility is null or new.innovation is null or new.evidence_quality is null or new.presentation is null or nullif(trim(new.comments),'') is null then raise exception 'Complete los cinco criterios y los comentarios'; end if;
  n:=n||jsonb_build_object('submitted_at',now());
 end if;
 new:=jsonb_populate_record(new,n); return new;
end $$;

create or replace function public.project_completion(p uuid) returns integer
language sql stable security definer set search_path=public,pg_temp as $$
 select round(100.0*(
  (exists(select 1 from public.problem_diagnosis where project_id=p and trim(current_situation)<>'' and trim(impact)<>'' and trim(root_causes)<>''))::int+
  (exists(select 1 from public.project_objectives where project_id=p and objective_type='general' and trim(statement)<>'') and exists(select 1 from public.project_objectives where project_id=p and objective_type='specific' and trim(statement)<>'' and trim(metric)<>'' and target is not null and deadline is not null))::int+
  (exists(select 1 from public.solution_alternatives where project_id=p and selected and trim(selection_rationale)<>''))::int+
  (exists(select 1 from public.action_plan where project_id=p) and not exists(select 1 from public.action_plan where project_id=p and (objective_id is null or start_date is null or end_date is null or trim(owner_name)='')))::int+
  (exists(select 1 from public.stakeholders where project_id=p and trim(functions)<>'') and exists(select 1 from public.project_resources where project_id=p))::int+
  (exists(select 1 from public.indicators where project_id=p and indicator_type='eficacia' and current_value is not null and target is not null) and exists(select 1 from public.indicators where project_id=p and indicator_type='eficiencia' and current_value is not null and target is not null))::int+
  (exists(select 1 from public.prototype where project_id=p and status='validated' and trim(test_results)<>'' and trim(validation_method)<>''))::int+
  ((select count(*) from public.deliverables where project_id=p)=4 and not exists(select 1 from public.deliverables where project_id=p and status<>'approved'))::int
 )/8)::int
$$;
create or replace function public.record_academic_change() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare row_data jsonb; pid uuid; pct integer;
begin
 row_data:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 pid:=case when tg_table_name='projects' then (row_data->>'id')::uuid else (row_data->>'project_id')::uuid end;
 if not exists(select 1 from public.projects where id=pid) then return null; end if;
 insert into public.activity_log(project_id,actor_id,action,entity_type,entity_id,details) values(pid,auth.uid(),lower(tg_op),tg_table_name,coalesce(row_data->>'id',pid::text),jsonb_build_object('version',row_data->'version'));
 if tg_table_name='deliverables' and tg_op<>'DELETE' and row_data->>'file_path'<>'' then
  insert into public.deliverable_versions(deliverable_id,project_id,file_path,submitted_by,submitted_at) values((row_data->>'id')::uuid,pid,row_data->>'file_path',(row_data->>'submitted_by')::uuid,coalesce((row_data->>'submitted_at')::timestamptz,now())) on conflict(file_path) do nothing;
 end if;
 if tg_table_name<>'projects' then
  pct:=public.project_completion(pid);
  update public.projects set progress=pct where id=pid and progress<>pct;
 end if;
 return null;
end $$;
do $$ declare t text; begin
 foreach t in array array['projects','problem_diagnosis','project_objectives','solution_alternatives','action_plan','stakeholders','project_resources','indicators','prototype','deliverables','project_comments','jury_reviews'] loop
  execute format('drop trigger if exists guard_academic on public.%I',t);
  execute format('create trigger guard_academic before insert or update on public.%I for each row execute function public.guard_academic_row()',t);
  execute format('drop trigger if exists record_academic on public.%I',t);
  execute format('create trigger record_academic after insert or update or delete on public.%I for each row execute function public.record_academic_change()',t);
 end loop;
end $$;

-- Las restricciones NOT VALID preservan datos previos; se aplican a nuevas escrituras.
do $$ begin
 if not exists(select 1 from pg_constraint where conname='actions_valid_dates') then alter table public.action_plan add constraint actions_valid_dates check(start_date is null or end_date is null or end_date>=start_date) not valid; end if;
 if not exists(select 1 from pg_constraint where conname='resources_nonnegative') then alter table public.project_resources add constraint resources_nonnegative check(estimated_cost>=0 and trim(description)<>'') not valid; end if;
 if not exists(select 1 from pg_constraint where conname='stakeholders_valid') then alter table public.stakeholders add constraint stakeholders_valid check((dedication_hours is null or dedication_hours>=0) and trim(person_name)<>'' and trim(project_role)<>'' and trim(functions)<>'') not valid; end if;
 if not exists(select 1 from pg_constraint where conname='objectives_nonempty') then alter table public.project_objectives add constraint objectives_nonempty check(trim(statement)<>'') not valid; end if;
 if not exists(select 1 from pg_constraint where conname='alternatives_nonempty') then alter table public.solution_alternatives add constraint alternatives_nonempty check(trim(title)<>'' and trim(description)<>'') not valid; end if;
 if not exists(select 1 from pg_constraint where conname='actions_nonempty') then alter table public.action_plan add constraint actions_nonempty check(trim(action)<>'') not valid; end if;
 if not exists(select 1 from pg_constraint where conname='indicators_nonempty') then alter table public.indicators add constraint indicators_nonempty check(trim(name)<>'' and trim(formula)<>'') not valid; end if;
 if not exists(select 1 from pg_constraint where conname='comments_nonempty') then alter table public.project_comments add constraint comments_nonempty check(trim(body)<>'') not valid; end if;
 if not exists(select 1 from pg_constraint where conname='diagnosis_cost_nonnegative') then alter table public.problem_diagnosis add constraint diagnosis_cost_nonnegative check(cost_impact is null or cost_impact>=0) not valid; end if;
end $$;

create or replace function public.get_project_comments(p_project uuid) returns table(id uuid,project_id uuid,section text,body text,author_id uuid,parent_id uuid,resolved boolean,created_at timestamptz,updated_at timestamptz,version bigint,author jsonb)
language sql stable security definer set search_path=public,pg_temp as $$
 select c.id,c.project_id,c.section,c.body,c.author_id,c.parent_id,c.resolved,c.created_at,c.updated_at,c.version,jsonb_build_object('full_name',p.full_name)
 from public.project_comments c join public.profiles p on p.id=c.author_id where c.project_id=p_project and public.can_view_project(p_project) order by c.created_at desc
$$;

create or replace function public.set_team_member(p_team uuid,p_user uuid,p_role text,p_remove boolean default false) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.is_facilitator() then raise exception 'No autorizado'; end if;
 perform 1 from public.profiles where id=p_user and status='active' and deleted_at is null for update;
 if not found and not p_remove then raise exception 'Perfil inactivo'; end if;
 perform 1 from public.academic_teams where id=p_team and status in ('forming','active','submitted') for update;
 if not found then raise exception 'Equipo no editable'; end if;
 if not exists(select 1 from public.team_members where team_id=p_team and user_id=p_user and status='active') then raise exception 'La persona no pertenece al equipo'; end if;
 if p_remove then
  update public.team_members set status='removed' where team_id=p_team and user_id=p_user;
  update public.academic_teams set leader_id=null where id=p_team and leader_id=p_user;
 else
  if p_role not in ('lider','integrante','observador') or p_role is null then raise exception 'Rol inválido'; end if;
  if p_role='lider' then update public.team_members set role='integrante' where team_id=p_team and role='lider'; end if;
  update public.team_members set role=p_role where team_id=p_team and user_id=p_user;
  update public.academic_teams set leader_id=case when p_role='lider' then p_user when leader_id=p_user then null else leader_id end where id=p_team;
 end if;
end $$;
create or replace function public.prepare_team_deletion(p_team uuid,p_confirmation text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.is_admin() then raise exception 'No autorizado'; end if;
 perform 1 from public.academic_teams where id=p_team and name=trim(p_confirmation) for update;
 if not found then raise exception 'La confirmación no coincide'; end if;
 update public.academic_teams set status='deleting' where id=p_team;
 update public.invitations set revoked_at=now() where team_id=p_team;
end $$;
create or replace function public.admin_delete_team(p_team uuid,p_confirmation text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.is_admin() then raise exception 'No autorizado'; end if;
 perform 1 from public.academic_teams where id=p_team and name=trim(p_confirmation) for update;
 if not found then raise exception 'La confirmación no coincide'; end if;
 if exists(select 1 from storage.objects where bucket_id='deliverables' and split_part(name,'/',1)=p_team::text) then raise exception 'Hay archivos pendientes. Reintente la eliminación desde administración'; end if;
 delete from public.academic_teams where id=p_team;
end $$;

-- Reconstrucción explícita de las políticas: evita que una política vieja permisiva se combine por OR.
do $$ declare r record; begin
 for r in select schemaname,tablename,policyname from pg_policies where schemaname='public' and tablename in ('profiles','cohorts','strategic_perspectives','academic_teams','team_members','invitations','projects','problem_diagnosis','project_objectives','solution_alternatives','action_plan','stakeholders','project_resources','indicators','prototype','deliverables','project_comments','jury_assignments','jury_reviews','activity_log','deliverable_versions') loop
  execute format('drop policy %I on %I.%I',r.policyname,r.schemaname,r.tablename);
 end loop;
end $$;
create policy profiles_read on public.profiles for select to authenticated using(id=auth.uid() or public.is_facilitator());
create policy profiles_update on public.profiles for update to authenticated using(public.is_active_user() and (id=auth.uid() or public.is_admin())) with check(id=auth.uid() or public.is_admin());
create policy cohorts_read on public.cohorts for select to authenticated using(public.is_active_user());
create policy cohorts_manage on public.cohorts for all to authenticated using(public.is_facilitator()) with check(public.is_facilitator());
create policy perspectives_read on public.strategic_perspectives for select to authenticated using(public.is_active_user());
create policy teams_read on public.academic_teams for select to authenticated using(public.can_view_team(id));
create policy teams_create on public.academic_teams for insert to authenticated with check(public.is_facilitator());
create policy teams_update on public.academic_teams for update to authenticated using(public.is_facilitator()) with check(public.is_facilitator());
create policy members_read on public.team_members for select to authenticated using(public.is_facilitator() or public.is_team_member(team_id));
create policy invitations_read on public.invitations for select to authenticated using(public.can_manage_team(team_id));
create policy projects_read on public.projects for select to authenticated using(public.can_view_project(id));
create policy projects_update on public.projects for update to authenticated using(public.can_edit_team(team_id)) with check(public.can_edit_team(team_id));
do $$ declare t text; begin
 foreach t in array array['problem_diagnosis','project_objectives','solution_alternatives','action_plan','stakeholders','project_resources','indicators','prototype'] loop
  execute format('create policy content_read on public.%I for select to authenticated using(public.can_view_project(project_id))',t);
  execute format('create policy content_write on public.%I for all to authenticated using(public.can_edit_project(project_id)) with check(public.can_edit_project(project_id))',t);
 end loop;
end $$;
create policy deliverables_read on public.deliverables for select to authenticated using(public.can_view_project(project_id));
create policy deliverables_update on public.deliverables for update to authenticated using(public.can_edit_project(project_id)) with check(public.can_edit_project(project_id));
create policy versions_read on public.deliverable_versions for select to authenticated using(public.can_view_project(project_id));
create policy comments_read on public.project_comments for select to authenticated using(public.can_view_project(project_id));
create policy comments_create on public.project_comments for insert to authenticated with check(public.can_view_project(project_id) and author_id=auth.uid());
create policy comments_update on public.project_comments for update to authenticated using(public.can_view_project(project_id) and (author_id=auth.uid() or public.is_facilitator())) with check(public.can_view_project(project_id) and (author_id=auth.uid() or public.is_facilitator()));
create policy assignments_read on public.jury_assignments for select to authenticated using(public.is_active_user() and (reviewer_id=auth.uid() or public.is_facilitator()));
create policy assignments_manage on public.jury_assignments for all to authenticated using(public.is_facilitator()) with check(public.is_facilitator() and exists(select 1 from public.profiles where id=reviewer_id and global_role in ('jurado','admin','docente') and status='active' and deleted_at is null));
create policy reviews_read on public.jury_reviews for select to authenticated using(public.is_active_user() and (public.is_facilitator() or (reviewer_id=auth.uid() and public.can_review_project(project_id))));
create policy reviews_insert on public.jury_reviews for insert to authenticated with check(reviewer_id=auth.uid() and public.can_review_project(project_id));
create policy reviews_update on public.jury_reviews for update to authenticated using(reviewer_id=auth.uid() and public.can_review_project(project_id)) with check(reviewer_id=auth.uid() and public.can_review_project(project_id));
create policy activity_read on public.activity_log for select to authenticated using(public.can_view_project(project_id));

drop policy if exists "deliverable files read" on storage.objects;
drop policy if exists "deliverable files create" on storage.objects;
drop policy if exists "deliverable files update" on storage.objects;
drop policy if exists "deliverable files admin delete" on storage.objects;
drop policy if exists portal_files_read on storage.objects;
drop policy if exists portal_files_create on storage.objects;
drop policy if exists portal_files_delete on storage.objects;
create policy portal_files_read on storage.objects for select to authenticated using(bucket_id='deliverables' and (public.is_admin() or public.valid_project_file(name,false)));
create policy portal_files_create on storage.objects for insert to authenticated with check(bucket_id='deliverables' and public.valid_project_file(name,true));
create policy portal_files_delete on storage.objects for delete to authenticated using(bucket_id='deliverables' and ((public.is_admin() and exists(select 1 from public.academic_teams where id::text=split_part(storage.objects.name,'/',1) and status='deleting')) or (public.valid_project_file(storage.objects.name,true) and not exists(select 1 from public.deliverables where file_path=storage.objects.name) and not exists(select 1 from public.deliverable_versions where file_path=storage.objects.name))));
update storage.buckets set public=false,file_size_limit=26214400,allowed_mime_types=array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/png','image/jpeg'] where id='deliverables';

-- Ninguna función nueva queda ejecutable por anónimos; los triggers internos tampoco por clientes.
do $$ declare f regprocedure; begin
 for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('is_active_user','can_manage_team','can_review_project','can_view_team','valid_project_file','revoke_invitation','create_project','get_project_comments','set_team_member','prepare_team_deletion','initialize_project_records','guard_academic_row','project_completion','record_academic_change') loop
  execute format('revoke execute on function %s from public,anon,authenticated',f);
 end loop;
end $$;
grant execute on function public.is_active_user(),public.can_manage_team(uuid),public.can_review_project(uuid),public.can_view_team(uuid),public.valid_project_file(text,boolean),public.revoke_invitation(uuid),public.create_project(uuid,text,text,uuid),public.get_project_comments(uuid),public.set_team_member(uuid,uuid,text,boolean),public.prepare_team_deletion(uuid,text) to authenticated;
grant select on public.deliverable_versions to authenticated;
revoke all on public.deliverable_versions from anon;

-- Reparación de inicialización incompleta y cálculo común de avance.
do $$ declare p record; begin
 for p in select id from public.projects loop perform public.initialize_project_records(p.id); end loop;
 update public.projects set progress=public.project_completion(id);
end $$;
do $$ declare t text; begin
 foreach t in array array['projects','problem_diagnosis','project_objectives','solution_alternatives','action_plan','stakeholders','project_resources','indicators','prototype','deliverables','project_comments','team_members','academic_teams','profiles','jury_assignments','jury_reviews'] loop
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t); end if;
 end loop;
end $$;
notify pgrst,'reload schema';
create or replace function public.portal_version() returns integer language sql immutable as $$ select 20260915 $$;
revoke execute on function public.portal_version() from public,anon;
grant execute on function public.portal_version() to authenticated;
commit;
