-- Agrega eliminación administrativa segura de personas y equipos.
-- Ejecutar una vez en Supabase > SQL Editor después de migracion-fix-pgcrypto.sql.

begin;

alter table public.profiles
  add column if not exists deleted_at timestamptz;

create or replace function public.current_global_role()
returns text
language sql
stable
security definer set search_path = public, pg_temp
as $$
  select global_role
  from public.profiles
  where id = auth.uid() and status = 'active' and deleted_at is null
$$;

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

revoke execute on function public.admin_remove_person(uuid) from public, anon;
revoke execute on function public.admin_delete_team(uuid,text) from public, anon;
grant execute on function public.admin_remove_person(uuid) to authenticated;
grant execute on function public.admin_delete_team(uuid,text) to authenticated;

drop policy if exists "deliverable files admin delete" on storage.objects;
create policy "deliverable files admin delete"
on storage.objects for delete to authenticated
using(bucket_id = 'deliverables' and public.is_admin());

commit;

-- Fuerza a la Data API de Supabase a reconocer inmediatamente las funciones.
notify pgrst, 'reload schema';
select pg_notification_queue_usage();

select
  p.proname as function_name,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('admin_remove_person', 'admin_delete_team')
order by p.proname;
