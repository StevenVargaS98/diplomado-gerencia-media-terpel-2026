(function () {
  'use strict';
  const config = window.PORTAL_CONFIG || {};
  const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.supabaseUrl || '') && !!config.supabasePublishableKey && !/REEMPLAZAR/.test(config.supabasePublishableKey);
  const libraryAvailable = typeof window.supabase?.createClient === 'function';
  const client = configured && libraryAvailable ? window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  function shortDate(value) {
    if (!value) return 'Por definir';
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
    const date = match ? new Date(Number(match[1]), Number(match[2])-1, Number(match[3]), 12) : new Date(value);
    return Number.isNaN(date.getTime()) ? 'Fecha inválida' : date.toLocaleDateString('es-CO', {day:'2-digit',month:'short',year:'numeric'});
  }
  const money = value => Number(value ?? 0).toLocaleString('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0});
  function humanError(error) {
    const message=error?.message || 'No fue posible completar la operación.';
    if (/Failed to fetch|fetch failed|NetworkError|Load failed/i.test(message)) return 'No se pudo conectar al servicio. Sus cambios sin guardar se conservan. Revise la conexión e intente nuevamente.';
    if (/Invalid login/i.test(message)) return 'Correo o contraseña incorrectos.';
    if (/Email not confirmed/i.test(message)) return 'Confirme primero su correo electrónico.';
    if (/schema cache|could not find the function|portal_version|column .*version.*does not exist/i.test(message)) return 'El servicio necesita la actualización de base de datos del 15 de septiembre de 2026. Informe al administrador.';
    if (error?.code==='23505') return 'Ese registro ya existe. Solo se admite un objetivo general y una alternativa seleccionada por proyecto.';
    return message;
  }
  function toast(message,tone='success') {
    let element=document.querySelector('#global-toast');
    if(!element){element=document.createElement('div');element.id='global-toast';document.body.appendChild(element);}
    element.className=`toast ${tone}`;element.setAttribute('role',tone==='error'?'alert':'status');element.setAttribute('aria-live','polite');element.textContent=message;
    clearTimeout(toast.timer);toast.timer=setTimeout(()=>element.classList.add('hidden'),tone==='error'?9000:4500);
  }
  function setBusy(button,busy,label='Guardando…') {
    if(!button)return;
    if(['SELECT','INPUT'].includes(button.tagName)){button.disabled=busy;return;}
    if(busy){if(!button.dataset.label)button.dataset.label=button.textContent;button.textContent=label;button.disabled=true;}
    else {button.textContent=button.dataset.label||button.textContent;delete button.dataset.label;button.disabled=false;}
  }
  async function run(button,task,label) {setBusy(button,true,label);try{return await task();}catch(error){toast(humanError(error),'error');return null;}finally{setBusy(button,false);}}
  async function checked(query,label='') {const result=await query;if(result.error){if(label)result.error.message=`${label}: ${result.error.message}`;throw result.error;}return result.data;}
  async function allRows(factory) {const all=[];for(let offset=0;;offset+=500){const rows=await checked(factory().range(offset,offset+499));all.push(...(rows||[]));if(!rows||rows.length<500)return all;}}
  async function requireBackend() {const version=await checked(client.rpc('portal_version'));if(version!==20260915)throw new Error('portal_version: se requiere actualizar la base');}
  async function saveRow(table,payload,existing,key='id') {
    if(existing){const rows=await checked(client.from(table).update(payload).eq(key,existing[key]).eq('version',existing.version).select());if(rows?.length!==1){const error=new Error('El registro cambió o perdió permisos. Conserve su texto, actualice los datos y vuelva a revisar antes de guardar.');error.code='CONFLICT';throw error;}return rows[0];}
    return await checked(client.from(table).insert(payload).select().single());
  }
  function modal(content,title='Formulario') {
    const root=document.querySelector('#modal-root')||document.body;
    const dialog=document.createElement('dialog');dialog.className='modal';dialog.setAttribute('aria-label',title);
    dialog.innerHTML=`<button type="button" class="close-btn" aria-label="Cerrar">×</button>${content}`;
    root.appendChild(dialog);
    const close=()=>{if(dialog.dataset.dirty==='true'&&!confirm('Hay cambios sin guardar en este formulario. ¿Descartarlos?'))return;dialog.close();};
    dialog.querySelector('.close-btn').onclick=close;
    dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
    dialog.addEventListener('input',()=>dialog.dataset.dirty='true');
    dialog.addEventListener('close',()=>dialog.remove(),{once:true});
    dialog.showModal();return dialog;
  }
  async function openPrivateFile(path,button) {
    const popup=window.open('about:blank','_blank');if(popup)popup.opener=null;
    await run(button,async()=>{try{const data=await checked(client.storage.from('deliverables').createSignedUrl(path,300));if(popup)popup.location.href=data.signedUrl;else modal(`<h2>Archivo preparado</h2><a class="primary-btn button-link" target="_blank" rel="noopener noreferrer" href="${escapeHtml(data.signedUrl)}">Abrir archivo privado</a>`,'Abrir archivo');}catch(error){popup?.close();throw error;}},'Preparando…');
  }
  async function listTeamFiles(teamId) {
    const paths=[];
    async function visit(prefix){for(let offset=0;;offset+=100){const items=await checked(client.storage.from('deliverables').list(prefix,{limit:100,offset,sortBy:{column:'name',order:'asc'}}));for(const item of items||[]){const path=`${prefix}/${item.name}`;if(item.id)paths.push(path);else await visit(path);}if(!items||items.length<100)break;}}
    await visit(teamId);return paths;
  }
  function setupPanel(){return '<section class="setup-panel"><h2>No se pudo conectar el portal</h2><p>Verifique la conexión, la configuración pública y la disponibilidad del servicio con el administrador.</p><button class="primary-btn" onclick="location.reload()">Intentar nuevamente</button></section>';}
  window.Portal={config,configured,libraryAvailable,supabase:client,escapeHtml,shortDate,money,uuid:()=>crypto.randomUUID(),toast,setBusy,run,checked,allRows,requireBackend,saveRow,modal,openPrivateFile,listTeamFiles,humanError,setupPanel};
})();
