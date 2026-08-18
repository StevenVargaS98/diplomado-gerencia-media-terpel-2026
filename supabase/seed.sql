-- Datos académicos iniciales del Diplomado de Gerencia Media 2026.
insert into public.cohorts(id,name,year,institution,company,starts_on,ends_on,active)
values('10000000-0000-4000-8000-000000000001','Diplomado de Gerencia Media',2026,'Pontificia Universidad Javeriana','Organización Terpel','2026-08-18','2026-11-26',true)
on conflict(name,year) do update set active=true;

insert into public.strategic_perspectives(id,code,name,sort_order) values
('20000000-0000-4000-8000-000000000001','P1','Capital estratégico',1),
('20000000-0000-4000-8000-000000000002','P2','Innovación',2),
('20000000-0000-4000-8000-000000000003','P3','Eficiencia',3),
('20000000-0000-4000-8000-000000000004','P4','Sostenibilidad',4),
('20000000-0000-4000-8000-000000000005','P5','Clientes / Mercado',5),
('20000000-0000-4000-8000-000000000006','P6','Financiera',6)
on conflict(code) do update set name=excluded.name,sort_order=excluded.sort_order;

-- Los equipos se crean desde admin.html. Estructura esperada por la guía:
-- Presencial: 2 equipos de 3 personas y 2 equipos de 4 personas.
-- Remoto: 1 equipo de 3 personas y 1 equipo de 4 personas.
-- Fechas: formulación 17 septiembre; guía completa 27 octubre; shark tank 26 noviembre.

-- Después de registrar al primer administrador en la aplicación, ejecutar una vez:
-- update public.profiles set global_role='admin' where email='correo.admin@ejemplo.com';
