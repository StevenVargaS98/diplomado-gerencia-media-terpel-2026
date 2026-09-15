-- Consulta de diagnóstico: solo metadatos y conteos, sin datos personales.
select jsonb_build_object(
 'database_time',now(),
 'tables',(select count(*) from pg_tables where schemaname='public'),
 'profiles',(select count(*) from public.profiles),
 'active_admins',(select count(*) from public.profiles where global_role='admin' and status='active'),
 'teams',(select count(*) from public.academic_teams),
 'projects',(select count(*) from public.projects),
 'files',(select count(*) from storage.objects where bucket_id='deliverables'),
 'create_leader_function',to_regprocedure('public.create_team_as_leader(text,text,integer)') is not null,
 'remove_person_function',to_regprocedure('public.admin_remove_person(uuid)') is not null,
 'participants_function',to_regprocedure('public.get_team_participants(uuid)') is not null,
 'version_function',to_regprocedure('public.portal_version()') is not null,
 'duplicate_memberships',(select count(*) from (select user_id from public.team_members where status='active' group by user_id having count(*)>1) d),
 'duplicate_general_objectives',(select count(*) from (select project_id from public.project_objectives where objective_type='general' group by project_id having count(*)>1) d),
 'duplicate_selected_alternatives',(select count(*) from (select project_id from public.solution_alternatives where selected group by project_id having count(*)>1) d),
 'duplicate_team_names',(select count(*) from (select cohort_id,lower(name) from public.academic_teams group by cohort_id,lower(name) having count(*)>1) d),
 'invalid_action_dates',(select count(*) from public.action_plan where end_date<start_date),
 'cross_project_actions',(select count(*) from public.action_plan a join public.project_objectives o on o.id=a.objective_id where a.project_id<>o.project_id),
 'cross_project_indicators',(select count(*) from public.indicators i join public.project_objectives o on o.id=i.objective_id where i.project_id<>o.project_id)
) as verification;
