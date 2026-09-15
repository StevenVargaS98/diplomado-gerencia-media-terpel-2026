import fs from 'node:fs/promises';
const file=new URL('../supabase/schema.sql',import.meta.url);
const marker='-- BEGIN CONSOLIDATED 20260915';
const base=(await fs.readFile(file,'utf8')).split(marker)[0].replace(/^begin;\s*/,'').trimEnd();
const migration=(await fs.readFile(new URL('../supabase/migracion-integridad-20260915.sql',import.meta.url),'utf8')).replace(/^begin;\s*$/m,'').replace(/^commit;\s*$/m,'');
await fs.writeFile(file,`begin;\n${base}\n\n${marker}\n${migration.trim()}\ncommit;\n`);
