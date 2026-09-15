import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
import fs from 'node:fs/promises';
export const userId=n=>`30000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
export async function database({upgrade=false}={}) {
 const db=new PGlite({extensions:{pgcrypto}});
 await db.exec(`create role anon nologin;create role authenticated nologin;
 create schema auth;create schema storage;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text);
 alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql immutable as $$select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1]$$;
 grant usage on schema auth,storage,public to anon,authenticated;
 grant select,insert,update,delete on storage.objects to authenticated;
 create publication supabase_realtime;`);
 const schema=await fs.readFile(new URL('../supabase/schema.sql',import.meta.url),'utf8');
 if(upgrade){await db.exec(schema.split('-- BEGIN CONSOLIDATED 20260915')[0]+'\ncommit;');for(const name of ['migracion-acceso-y-lideres.sql','migracion-fix-pgcrypto.sql','migracion-admin-eliminaciones.sql','migracion-participantes-equipo.sql','migracion-integridad-20260915.sql'])await db.exec(await fs.readFile(new URL('../supabase/'+name,import.meta.url),'utf8'));}
 else await db.exec(schema);
 await db.exec(await fs.readFile(new URL('../supabase/seed.sql',import.meta.url),'utf8'));
 return db;
}
export async function as(db,user,sql,params=[]) {
 await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${user}',false)`);
 try{return await db.query(sql,params);}finally{await db.exec("reset role;select set_config('request.jwt.claim.sub','',false)");}
}
export async function addUser(db,n,role='participante') {
 const id=userId(n);
 await db.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)',[id,`fixture${n}@example.invalid`,JSON.stringify({full_name:`Fixture ${n}`,global_role:'admin'})]);
 await db.query('update profiles set global_role=$1 where id=$2',[role,id]);return id;
}
