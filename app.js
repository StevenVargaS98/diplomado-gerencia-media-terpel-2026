const USERS = [
  { email: "admin@maestria.test", password: "Brujula2026!", name: "Administrador Demo", role: "Administrador" },
  { email: "lider@maestria.test", password: "Lider2026!", name: "Líder Demo", role: "Líder" },
  { email: "equipo@maestria.test", password: "Equipo2026!", name: "Integrante Demo", role: "Integrante" },
];

const PERSPECTIVES = [
  ["TODAS", "Resumen general"], ["P1", "Capital estratégico"], ["P2", "Innovación"],
  ["P3", "Eficiencia"], ["P4", "Sostenibilidad"], ["P5", "Clientes / Mercado"], ["P6", "Financiera"],
];

const SEED = {
  objectives: [
    ["P1","P1O1","Fortalecer las capacidades estratégicas del equipo","Avance del plan de capacidades"],
    ["P2","P2O1","Impulsar iniciativas de innovación aplicada","Iniciativas validadas"],
    ["P3","P3O1","Mejorar la eficiencia de los procesos prioritarios","Eficiencia del proceso"],
    ["P4","P4O1","Integrar criterios de sostenibilidad en las decisiones","Acciones sostenibles"],
    ["P5","P5O1","Crear valor para clientes y mercado","Satisfacción y adopción"],
    ["P6","P6O1","Asegurar la viabilidad financiera del portafolio","Cumplimiento presupuestal"],
  ].map((item,index)=>({id:index+1,perspective:item[0],code:item[1],title:item[2],indicator:item[3],leader:"",target2026:25,updatedBy:"Sistema"})),
  projects: [],
};

let state = loadState();
let currentUser = JSON.parse(sessionStorage.getItem("brujula_user") || "null");
let active = "TODAS";
let search = "";
const expanded = new Set();

const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));

function loadState(){ try { return JSON.parse(localStorage.getItem("brujula_data")) || structuredClone(SEED); } catch { return structuredClone(SEED); } }
function saveState(){ localStorage.setItem("brujula_data", JSON.stringify(state)); }
function nextId(items){ return items.reduce((max,item)=>Math.max(max,item.id),0)+1; }
function money(value){ return value>=1e6 ? `${(value/1e6).toFixed(value>=1e7?0:1)} M` : Number(value).toLocaleString("es-CO"); }
function dateLabel(value){ return value ? new Date(`${value}T12:00:00`).toLocaleDateString("es-CO",{day:"2-digit",month:"short"}) : "Sin fecha"; }
function toast(message){ const el=$("#toast"); el.textContent=`✓ ${message}`;el.classList.remove("hidden");setTimeout(()=>el.classList.add("hidden"),2200); }

function showLogin(){ $("#login").classList.remove("hidden");$("#application").classList.add("hidden"); }
function showApp(){ $("#login").classList.add("hidden");$("#application").classList.remove("hidden");$("#current-user").textContent=currentUser.name;$("#role").textContent=currentUser.role;render(); }

$("#login-accounts").innerHTML = USERS.map(user=>`<div class="account-row"><span>${esc(user.email)}</span><code>${esc(user.password)}</code></div>`).join("");
$("#login-form").addEventListener("submit", event=>{ event.preventDefault();const user=USERS.find(item=>item.email.toLowerCase()===$("#email").value.trim().toLowerCase()&&item.password===$("#password").value);if(!user){$("#login-error").classList.remove("hidden");return;}currentUser={email:user.email,name:user.name,role:user.role};sessionStorage.setItem("brujula_user",JSON.stringify(currentUser));showApp(); });
$("#logout").addEventListener("click",()=>{sessionStorage.removeItem("brujula_user");currentUser=null;showLogin();});
$("#search").addEventListener("input",event=>{search=event.target.value.toLowerCase();renderObjectives();});
$("#new-objective").addEventListener("click",()=>openObjectiveModal());

function render(){ renderNavigation();renderStats();renderObjectives(); }
function renderNavigation(){ $("#navigation").innerHTML=PERSPECTIVES.map(([code,name])=>`<button class="nav-item ${active===code?"active":""}" data-perspective="${code}"><span>${name}</span><span class="nav-code">${code==="TODAS"?"6":code}</span></button>`).join("");document.querySelectorAll("[data-perspective]").forEach(button=>button.addEventListener("click",()=>{active=button.dataset.perspective;render();})); }
function renderStats(){ const budget=state.projects.reduce((sum,item)=>sum+Number(item.budget||0),0);const progress=state.projects.length?Math.round(state.projects.reduce((sum,item)=>sum+Number(item.progress||0),0)/state.projects.length):0;$("#stats").innerHTML=[stat("Objetivos",state.objectives.length,"en 6 perspectivas"),stat("Proyectos",state.projects.length,"iniciativas activas"),stat("Presupuesto",`$${money(budget)}`,"estimado COP"),stat("Avance global",`${progress}%`,"promedio",progress)].join(""); }
function stat(label,value,note,progress){ return `<div class="stat-card"><div class="stat-label"><span>${label}</span><span>↗</span></div><div class="stat-value">${value}<small>${note}</small></div>${progress!==undefined?`<div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>`:""}</div>`; }

function renderObjectives(){
  const visible=state.objectives.filter(item=>(active==="TODAS"||item.perspective===active)&&(!search||`${item.code} ${item.title} ${item.leader} ${item.indicator}`.toLowerCase().includes(search)));
  $("#panel-title").textContent=active==="TODAS"?"Portafolio estratégico":PERSPECTIVES.find(item=>item[0]===active)[1];
  $("#panel-detail").textContent=`${visible.length} objetivos · ${state.projects.filter(project=>visible.some(objective=>objective.id===project.objectiveId)).length} proyectos`;
  $("#objectives").innerHTML=visible.length?visible.map(objective=>objectiveHtml(objective)).join(""):'<div class="empty-state">No hay objetivos que coincidan con la búsqueda.</div>';
  document.querySelectorAll("[data-expand]").forEach(button=>button.addEventListener("click",()=>{const id=Number(button.dataset.expand);expanded.has(id)?expanded.delete(id):expanded.add(id);renderObjectives();}));
  document.querySelectorAll("[data-add-project]").forEach(button=>button.addEventListener("click",()=>openProjectModal(Number(button.dataset.addProject))));
  document.querySelectorAll("[data-progress]").forEach(input=>input.addEventListener("change",()=>{const project=state.projects.find(item=>item.id===Number(input.dataset.progress));project.progress=Number(input.value);project.updatedBy=currentUser.name;saveState();render();toast("Avance actualizado");}));
}

function objectiveHtml(objective){
  const projects=state.projects.filter(item=>item.objectiveId===objective.id);const progress=projects.length?Math.round(projects.reduce((sum,item)=>sum+item.progress,0)/projects.length):0;const open=expanded.has(objective.id);
  return `<article class="objective"><div class="objective-summary"><span class="code-badge">${esc(objective.code)}</span><div class="objective-title"><h4>${esc(objective.title)}</h4><p>${esc(objective.indicator||"Indicador por definir")} · ${projects.length} proyectos</p></div><div class="owner">Líder<strong>${esc(objective.leader||"Por asignar")}</strong></div><div class="mini-progress"><div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>${progress}%</div><button class="expand-btn ${open?"open":""}" data-expand="${objective.id}" aria-label="Ver proyectos">⌄</button></div>${open?`<div class="projects">${projects.length?projects.map(project=>projectHtml(project)).join(""):'<div class="empty-projects">Este objetivo todavía no tiene proyectos.</div>'}<button class="add-project" data-add-project="${objective.id}">＋ Agregar proyecto</button></div>`:""}</article>`;
}
function projectHtml(project){ return `<div class="project-row"><div><strong>${esc(project.name)}</strong><small>${esc(project.activity||"Actividad por definir")}</small></div><div class="owner">Responsable<strong>${esc(project.responsible||"Por asignar")}</strong></div><div class="date-range">${dateLabel(project.startDate)} → ${dateLabel(project.endDate)}</div><div class="project-progress"><input data-progress="${project.id}" aria-label="Avance" type="range" min="0" max="100" value="${project.progress}"></div><strong>${project.progress}%</strong></div>`; }

function openObjectiveModal(){ openModal("Nuevo objetivo estratégico",`<div class="form-grid"><div class="field"><label>Perspectiva</label><select name="perspective">${PERSPECTIVES.slice(1).map(item=>`<option value="${item[0]}">${item[0]} · ${item[1]}</option>`).join("")}</select></div><div class="field"><label>Código</label><input name="code" required placeholder="Ej. P2O2"></div><div class="field wide"><label>Objetivo estratégico</label><textarea name="title" required></textarea></div><div class="field wide"><label>Indicador</label><input name="indicator"></div><div class="field"><label>Líder</label><input name="leader"></div><div class="field"><label>Meta 2026 (%)</label><input name="target2026" type="number" min="0" max="100" value="0"></div></div>`,form=>{const value=Object.fromEntries(new FormData(form));state.objectives.push({id:nextId(state.objectives),...value,target2026:Number(value.target2026),updatedBy:currentUser.name});saveState();render();toast("Objetivo guardado");}); }
function openProjectModal(objectiveId){ openModal("Agregar proyecto",`<div class="form-grid"><div class="field wide"><label>Nombre del proyecto</label><input name="name" required></div><div class="field wide"><label>Actividad principal</label><textarea name="activity"></textarea></div><div class="field"><label>Responsable</label><input name="responsible"></div><div class="field"><label>Prioridad</label><select name="priority"><option>1er año</option><option>2do año</option><option>3er año</option><option>4to año</option></select></div><div class="field"><label>Fecha inicial</label><input name="startDate" type="date"></div><div class="field"><label>Fecha final</label><input name="endDate" type="date"></div><div class="field wide"><label>Equipo de soporte</label><input name="team"></div><div class="field wide"><label>Recursos requeridos</label><textarea name="resources"></textarea></div><div class="field"><label>Presupuesto (COP)</label><input name="budget" type="number" min="0" value="0"></div><div class="field"><label>Avance inicial (%)</label><input name="progress" type="number" min="0" max="100" value="0"></div></div>`,form=>{const value=Object.fromEntries(new FormData(form));state.projects.push({id:nextId(state.projects),objectiveId,...value,budget:Number(value.budget),progress:Number(value.progress),indicator:"% de avance",updatedBy:currentUser.name});saveState();expanded.add(objectiveId);render();toast("Proyecto guardado");}); }
function openModal(title,fields,onSave){ $("#modal-root").innerHTML=`<div class="modal-backdrop"><form class="modal"><div class="modal-head"><div><span class="eyebrow">Plan estratégico</span><h3>${title}</h3></div><button type="button" class="close-btn">×</button></div>${fields}<div class="modal-actions"><button type="button" class="ghost-btn cancel">Cancelar</button><button class="primary-btn">Guardar</button></div></form></div>`;const root=$("#modal-root");const close=()=>root.innerHTML="";root.querySelector(".close-btn").onclick=close;root.querySelector(".cancel").onclick=close;root.querySelector(".modal-backdrop").onclick=event=>{if(event.target===event.currentTarget)close();};root.querySelector("form").onsubmit=event=>{event.preventDefault();onSave(event.currentTarget);close();}; }

if(currentUser) showApp(); else showLogin();
