import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
for(const file of ['app.js','admin.js','jury.js','portal-core.js','word-export.js','preview.js','config.js']){
 new vm.Script(await fs.readFile(file,'utf8'),{filename:file});
}
for(const file of ['index.html','admin.html','jury.html','preview.html']){
 const html=await fs.readFile(file,'utf8');
 for(const [,url] of html.matchAll(/(?:src|href)="([^"]+)"/g)){
  if(/^(https?:|#|mailto:|data:)/.test(url))continue;
  await fs.access(url.split(/[?#]/)[0]);
 }
}
const schema=await fs.readFile('supabase/schema.sql','utf8');
const migration=(await fs.readFile('supabase/migracion-integridad-20260915.sql','utf8')).replace(/^begin;\s*$/m,'').replace(/^commit;\s*$/m,'').trim();
assert.equal(schema.split('-- BEGIN CONSOLIDATED 20260915')[1].trim(),`${migration}\ncommit;`,'Run npm run build:schema');
console.log('Syntax, local assets and consolidated schema verified.');
