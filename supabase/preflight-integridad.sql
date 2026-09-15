-- Solo lectura. Resolver duplicados antes de ejecutar la migración de integridad.
select user_id,count(*) from public.team_members where status='active' group by user_id having count(*)>1;
select project_id,count(*) from public.project_objectives where objective_type='general' group by project_id having count(*)>1;
select project_id,count(*) from public.solution_alternatives where selected group by project_id having count(*)>1;
select cohort_id,lower(name),count(*) from public.academic_teams group by cohort_id,lower(name) having count(*)>1;
select id,project_id,start_date,end_date from public.action_plan where end_date<start_date;
select a.id,a.project_id,a.objective_id from public.action_plan a join public.project_objectives o on o.id=a.objective_id where a.project_id<>o.project_id;
select i.id,i.project_id,i.objective_id from public.indicators i join public.project_objectives o on o.id=i.objective_id where i.project_id<>o.project_id;
