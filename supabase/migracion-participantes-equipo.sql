-- Directorio privado de participantes por equipo.
-- Ejecutar una vez en Supabase > SQL Editor sobre la base ya instalada.

begin;

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

revoke execute on function public.get_team_participants(uuid) from public, anon;
grant execute on function public.get_team_participants(uuid) to authenticated;

commit;

notify pgrst, 'reload schema';
select pg_notification_queue_usage();

select
  p.proname as function_name,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'get_team_participants';
