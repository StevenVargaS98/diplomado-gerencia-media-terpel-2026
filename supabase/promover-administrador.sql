-- Ejecutar desde SQL Editor como propietario del proyecto, una sola vez.
-- Registre y confirme antes el correo de la persona autorizada.
-- Sustituya el UUID vacío por el ID de esa cuenta en Authentication > Users.
-- Este script no sobrescribe funciones, políticas ni migraciones.
begin;
do $$
declare target_user uuid:=null; -- Reemplazar null por 'UUID-VERIFICADO'::uuid.
begin
 if target_user is null then raise exception 'Defina el UUID de la cuenta administradora verificada'; end if;
 if not exists(select 1 from auth.users where id=target_user and email_confirmed_at is not null) then
  raise exception 'La cuenta no existe o no ha confirmado el correo';
 end if;
 update public.profiles set global_role='admin',status='active',deleted_at=null where id=target_user;
 if not found then raise exception 'No existe el perfil académico'; end if;
end $$;
commit;
