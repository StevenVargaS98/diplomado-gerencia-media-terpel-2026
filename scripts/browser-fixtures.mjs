import fs from 'node:fs/promises';
await fs.mkdir('test-results/ui',{recursive:true});
for(const name of ['index','admin','jury']){
 let html=await fs.readFile(`${name}.html`,'utf8');
 html=html.replace('<head>','<head><base href="/"><meta http-equiv="Content-Security-Policy" content="connect-src \'self\'; form-action \'none\'">');
 html=html.replace(/<script src="vendor\/supabase.min.js[^>]*><\/script>/,'<script src="tests/browser-client.js"></script>').replace(/<script src="config.js[^>]*><\/script>/,'');
 html=html.replace('</body>','<aside style="position:fixed;bottom:0;left:0;z-index:10000;background:white;border:2px solid #333;padding:8px;font:12px sans-serif">API simulada · Datos ficticios <button id="fixture-remote">Simular cambio remoto</button><pre id="fixture-status">Sin operaciones</pre></aside><script>document.getElementById("fixture-remote").onclick=window.fixtureRemote;window.addEventListener("unhandledrejection",e=>document.getElementById("fixture-status").textContent="ERROR: "+e.reason);</script></body>');
 await fs.writeFile(`test-results/ui/${name}.html`,html);
}
console.log('Serve repository root, then open /test-results/ui/index.html?actor=leader (or admin/jury).');
