-- Ejecutar como propietario desde SQL Editor. No confirma cambios: termina con ROLLBACK.
begin;
do $$ declare u uuid; begin
 select tm.user_id into u from public.team_members tm join public.profiles p on p.id=tm.user_id join public.projects pr on pr.team_id=tm.team_id
 where tm.status='active' and tm.role in ('lider','integrante') and p.status='active' and p.deleted_at is null and p.global_role in ('participante','lider') limit 1;
 if u is null then raise exception 'No existe un participante elegible para esta prueba'; end if;
 perform set_config('request.jwt.claim.sub',u::text,true);
end $$;
set local role authenticated;
do $$ declare p uuid; v bigint; after_v bigint; denied boolean:=false; begin
 if public.portal_version()<>20260915 then raise exception 'Versión incorrecta'; end if;
 if (select count(*) from public.projects)>1 then raise exception 'El participante ve proyectos ajenos'; end if;
 select id into p from public.projects limit 1;
 if p is null then raise exception 'El participante no puede consultar su proyecto'; end if;
 select version into v from public.problem_diagnosis where project_id=p;
 update public.problem_diagnosis set current_situation=current_situation||' [prueba reversible]' where project_id=p returning version into after_v;
 if after_v is distinct from v+1 then raise exception 'No se guardó con control de versión'; end if;
 begin update public.profiles set global_role='admin' where id=auth.uid(); exception when raise_exception or insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Autopromoción permitida'; end if;
 denied:=false;
 begin insert into public.jury_reviews(project_id,reviewer_id,strategic_impact,feasibility,innovation,evidence_quality,presentation,comments)
 values(p,auth.uid(),5,5,5,5,5,'Prueba reversible'); exception when raise_exception or insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Evaluación sin asignación permitida'; end if;
 perform set_config('portal_verification.result','PASS: lectura propia, aislamiento, escritura versionada, autopromocion denegada, evaluacion no autorizada denegada',true);
end $$;
select current_setting('portal_verification.result') as production_rls_test;
rollback;
