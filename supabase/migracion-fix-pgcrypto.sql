-- Corrección para: function digest(text, unknown) does not exist
-- Ejecutar una vez en Supabase > SQL Editor sobre la base ya instalada.

begin;

-- En Supabase las extensiones se alojan normalmente en el esquema extensions.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- Las funciones ya existen. Se amplía únicamente su search_path para que puedan
-- resolver digest() tanto si pgcrypto está en extensions como si quedó en public.
alter function public.join_with_invitation(text, text)
  set search_path to extensions, public, pg_temp;

alter function public.create_invitation(uuid, text, text, integer, timestamptz)
  set search_path to extensions, public, pg_temp;

commit;

-- El resultado debe mostrar pgcrypto y ambas funciones con extensions en proconfig.
select
  e.extname as extension,
  n.nspname as extension_schema
from pg_extension e
join pg_namespace n on n.oid = e.extnamespace
where e.extname = 'pgcrypto';

select
  p.proname as function_name,
  p.proconfig as configuration
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('join_with_invitation', 'create_invitation')
order by p.proname;
