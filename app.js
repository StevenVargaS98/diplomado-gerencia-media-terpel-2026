(() => {
const { configured, libraryAvailable, supabase, escapeHtml: esc, shortDate, money, toast, setBusy, setupPanel } = window.Portal;

const SECTIONS = [
  ["overview", "Inicio", "00"], ["diagnosis", "Diagnóstico", "01"], ["objectives", "Objetivos SMART", "02"],
  ["alternatives", "Alternativas", "03"], ["action", "Plan de acción", "04"], ["people", "Involucrados", "05"],
  ["indicators", "Indicadores", "06"], ["prototype", "Prototipo", "P"], ["deliverables", "Entregables", "E"], ["comments", "Comentarios", "C"],
];

const state = { user: null, profile: null, membership: null, team: null, project: null, section: "overview", perspectives: [], diagnosis: null, objectives: [], alternatives: [], actions: [], stakeholders: [], resources: [], indicators: [], prototype: null, deliverables: [], comments: [], realtime: null };
let recoveryMode = recoveryRedirectPresent();

const el = (selector) => document.querySelector(selector);
const show = (selector) => el(selector)?.classList.remove("hidden");
const hide = (selector) => el(selector)?.classList.add("hidden");
const formData = (form) => Object.fromEntries(new FormData(form));
document.addEventListener("DOMContentLoaded", initialize);

async function initialize() {
  try {
    if (!configured || !supabase) {
      el("#config-view").innerHTML = libraryAvailable ? setupPanel() : fatalPanel("No se pudo cargar el componente seguro de conexión. Compruebe su acceso a cdn.jsdelivr.net y recargue la página.");
      hide("#boot-view"); show("#config-view"); return;
    }
    wireAuth();
    supabase.auth.onAuthStateChange((event, sessionValue) => {
      if (event === "PASSWORD_RECOVERY") {
        recoveryMode = true; showPasswordReset(); return;
      }
      if (!sessionValue && !recoveryMode) showAuth();
    });
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (recoveryMode && session) showPasswordReset();
    else if (session) await enterPortal(session.user);
    else showAuth();
  } catch (error) {
    showFatal(error);
  }
}

function wireAuth() {
  document.querySelectorAll("[data-auth-tab]").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll("[data-auth-tab]").forEach((item) => item.classList.toggle("active", item === button));
    el("#login-form").classList.toggle("hidden", button.dataset.authTab !== "login");
    el("#signup-form").classList.toggle("hidden", button.dataset.authTab !== "signup");
  }));
  el("#login-form").addEventListener("submit", login);
  el("#signup-form").addEventListener("submit", signup);
  el("#password-reset-form").addEventListener("submit", updatePassword);
  el("#join-form").addEventListener("submit", joinTeam);
  el("#leader-team-form").addEventListener("submit", createTeamAsLeader);
  el("#team-invite-btn").addEventListener("click", teamInvitationModal);
  el("#forgot-password").addEventListener("click", forgotPassword);
  document.querySelectorAll("[data-signout]").forEach((button) => button.addEventListener("click", async () => { await supabase.auth.signOut(); window.location.href = "index.html"; }));
  el("#print-project").addEventListener("click", () => window.print());
  el("#course-nav").addEventListener("click", (event) => { const button = event.target.closest("[data-section]"); if (!button) return; state.section = button.dataset.section; renderNavigation(); renderSection(); });
  el("#project-content").addEventListener("submit", handleSectionSubmit);
  el("#project-content").addEventListener("click", handleSectionClick);
  el("#project-content").addEventListener("change", handleSectionChange);
}

function showAuth() { hide("#boot-view"); hide("#config-view"); hide("#app-view"); hide("#join-view"); hide("#password-reset-view"); show("#auth-view"); }

function showPasswordReset() {
  hide("#boot-view"); hide("#config-view"); hide("#auth-view"); hide("#app-view"); hide("#join-view");
  show("#password-reset-view");
  window.setTimeout(() => el('#password-reset-form [name="password"]')?.focus(), 50);
}

function fatalPanel(message) {
  return `<section class="setup-panel"><div class="setup-icon">!</div><span class="eyebrow">No se pudo iniciar</span><h2>El portal encontró un inconveniente</h2><p>${esc(message)}</p><button class="primary-btn" onclick="location.reload()">Intentar nuevamente</button><a class="text-btn button-link" href="preview.html">Abrir la demostración</a></section>`;
}

function showFatal(error) {
  hide("#auth-view"); hide("#app-view"); hide("#join-view"); hide("#password-reset-view"); hide("#config-view");
  const message = error?.message || "Error inesperado al conectar el portal.";
  el("#boot-view").innerHTML = fatalPanel(message); show("#boot-view");
}

async function login(event) {
  event.preventDefault(); const button = event.submitter; setBusy(button, true, "Ingresando…");
  const values = formData(event.currentTarget);
  const { data, error } = await supabase.auth.signInWithPassword({ email: values.email.trim(), password: values.password });
  setBusy(button, false); if (error) return toast(humanError(error), "error");
  await enterPortal(data.user);
}

async function signup(event) {
  event.preventDefault(); const button = event.submitter; setBusy(button, true, "Creando cuenta…");
  const values = formData(event.currentTarget);
  const { data, error } = await supabase.auth.signUp({ email: values.email.trim(), password: values.password, options: { data: { full_name: values.full_name.trim() }, emailRedirectTo: new URL("index.html", window.location.href).href } });
  setBusy(button, false); if (error) return toast(humanError(error), "error");
  if (data.session) await enterPortal(data.user); else toast("Revise su correo y confirme la cuenta antes de ingresar.");
}

async function updatePassword(event) {
  event.preventDefault(); const button = event.submitter; const values = formData(event.currentTarget);
  if (values.password !== values.confirmation) return toast("Las contraseñas no coinciden.", "error");
  if (values.password.length < 8) return toast("La contraseña debe tener al menos 8 caracteres.", "error");
  setBusy(button, true, "Cambiando…");
  const { error } = await supabase.auth.updateUser({ password: values.password });
  if (error) { setBusy(button, false); return toast(humanError(error), "error"); }
  recoveryMode = false;
  window.history.replaceState({}, "", new URL("index.html", window.location.href).href);
  await supabase.auth.signOut();
  event.currentTarget.reset(); showAuth();
  toast("Contraseña actualizada. Ya puede ingresar con la nueva contraseña.");
}

async function forgotPassword() {
  const email = el('#login-form [name="email"]').value.trim();
  if (!email) return toast("Escriba primero su correo electrónico.", "error");
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: new URL("index.html", window.location.href).href });
  if (error) return toast(humanError(error), "error"); toast("Enviamos las instrucciones de recuperación.");
}

async function enterPortal(user) {
  state.user = user; hide("#boot-view"); hide("#auth-view"); hide("#password-reset-view");
  const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (profileError || !profile) return showFatal(profileError || new Error("No se encontró el perfil de esta cuenta.")); state.profile = profile;
  if (profile.global_role === "jurado") { window.location.href = "jury.html"; return; }
  const { data: membership } = await supabase.from("team_members").select("role,status,team:academic_teams(id,name,modality,max_members,cohort:cohorts(name,year))").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (!membership?.team) {
    renderMembershipCenter();
    show("#join-view"); return;
  }
  state.membership = membership; state.team = membership.team;
  await loadWorkspace(); hide("#join-view"); show("#app-view");
}

function renderMembershipCenter() {
  hide("#app-view");
  el("#membership-name").textContent = state.profile.full_name || "Cuenta académica";
  el("#membership-email").textContent = state.profile.email;
  el("#membership-role").textContent = roleName(state.profile.global_role);
  const canCreate = state.profile.global_role === "lider";
  el("#leader-create-card").classList.toggle("hidden", !canCreate);
  el("#leader-wait-card").classList.toggle("hidden", canCreate);
  el("#membership-admin-link").classList.toggle("hidden", !["admin", "docente"].includes(state.profile.global_role));
}

async function joinTeam(event) {
  event.preventDefault(); const button = event.submitter; const values = formData(event.currentTarget); setBusy(button, true);
  const { error } = await supabase.rpc("join_with_invitation", { raw_code: values.invitation, participant_name: state.profile.full_name || state.profile.email });
  setBusy(button, false); if (error) return toast(humanError(error), "error"); toast("Ya hace parte del equipo."); await enterPortal(state.user);
}

async function createTeamAsLeader(event) {
  event.preventDefault(); const button = event.submitter; const values = formData(event.currentTarget);
  setBusy(button, true, "Creando equipo…");
  const { error } = await supabase.rpc("create_team_as_leader", {
    p_name: values.name,
    p_modality: values.modality,
    p_max_members: Number(values.max_members),
  });
  setBusy(button, false);
  if (error) return toast(humanError(error), "error");
  toast("Equipo creado. Ahora puede invitar a sus integrantes.");
  await enterPortal(state.user);
}

async function loadWorkspace() {
  const [{ data: perspectives }, { data: project }] = await Promise.all([
    supabase.from("strategic_perspectives").select("*").order("sort_order"),
    supabase.from("projects").select("*").eq("team_id", state.team.id).maybeSingle(),
  ]);
  state.perspectives = perspectives || []; state.project = project;
  el("#profile-name").textContent = state.profile.full_name || state.profile.email;
  el("#team-label").textContent = `${state.team.name} · ${state.team.modality}`;
  el("#admin-link").classList.toggle("hidden", !["admin", "docente"].includes(state.profile.global_role));
  el("#team-invite-btn").classList.toggle("hidden", state.membership.role !== "lider");
  renderNavigation();
  if (!project) { renderCreateProject(); return; }
  await loadProjectData(); subscribeRealtime(); renderShell(); renderSection();
}

async function loadProjectData() {
  const id = state.project.id;
  const queries = await Promise.all([
    supabase.from("problem_diagnosis").select("*").eq("project_id", id).maybeSingle(),
    supabase.from("project_objectives").select("*").eq("project_id", id).order("sort_order"),
    supabase.from("solution_alternatives").select("*").eq("project_id", id).order("created_at"),
    supabase.from("action_plan").select("*").eq("project_id", id).order("sort_order"),
    supabase.from("stakeholders").select("*").eq("project_id", id).order("created_at"),
    supabase.from("project_resources").select("*").eq("project_id", id).order("created_at"),
    supabase.from("indicators").select("*").eq("project_id", id).order("created_at"),
    supabase.from("prototype").select("*").eq("project_id", id).maybeSingle(),
    supabase.from("deliverables").select("*").eq("project_id", id).order("due_at"),
    supabase.from("project_comments").select("*,author:profiles(full_name,email)").eq("project_id", id).order("created_at", { ascending: false }),
  ]);
  [state.diagnosis, state.objectives, state.alternatives, state.actions, state.stakeholders, state.resources, state.indicators, state.prototype, state.deliverables, state.comments] = queries.map((result, index) => index === 0 || index === 7 ? result.data : result.data || []);
}

function renderCreateProject() {
  show("#project-empty"); hide("#project-content");
  el("#project-empty").innerHTML = `<section class="project-welcome"><span class="eyebrow">${esc(state.team.name)}</span><h1>Comiencen por definir el reto estratégico</h1><p>El proyecto debe responder a una necesidad real y aplicar las competencias desarrolladas en el diplomado.</p><form id="create-project-form" class="form-card"><label>Nombre del proyecto<input name="title" required placeholder="Un nombre claro y memorable"></label><label>Perspectiva estratégica<select name="perspective_id"><option value="">Seleccione…</option>${state.perspectives.map((item) => `<option value="${item.id}">${item.code} · ${esc(item.name)}</option>`).join("")}</select></label><label class="wide">Alineación estratégica<textarea name="strategic_alignment" required placeholder="¿Con qué necesidad u objetivo de la organización se conecta?"></textarea></label><button class="primary-btn">Crear espacio de proyecto →</button></form></section>`;
  el("#create-project-form").addEventListener("submit", createProject);
}

async function createProject(event) {
  event.preventDefault(); const values = formData(event.currentTarget); const button = event.submitter; setBusy(button, true);
  const payload = { team_id: state.team.id, title: values.title, perspective_id: values.perspective_id || null, strategic_alignment: values.strategic_alignment, created_by: state.user.id, updated_by: state.user.id };
  const { data, error } = await supabase.from("projects").insert(payload).select().single();
  if (error) { setBusy(button, false); return toast(humanError(error), "error"); }
  state.project = data;
  await Promise.all([
    supabase.from("problem_diagnosis").insert({ project_id: data.id, updated_by: state.user.id }),
    supabase.from("prototype").insert({ project_id: data.id, updated_by: state.user.id }),
    supabase.from("deliverables").insert([
      { project_id: data.id, stage: "formulacion", title: "Formulación: diagnóstico y objetivos", due_at: "2026-09-17T23:59:00-05:00" },
      { project_id: data.id, stage: "guia_completa", title: "Guía completa: ítems 3 al 7", due_at: "2026-10-27T23:59:00-05:00" },
      { project_id: data.id, stage: "prototipo", title: "Prototipo validado", due_at: "2026-11-19T23:59:00-05:00" },
      { project_id: data.id, stage: "shark_tank", title: "Presentación tipo shark tank", due_at: "2026-11-26T08:00:00-05:00" },
    ]),
  ]);
  await loadWorkspace(); hide("#project-empty"); show("#project-content"); toast("Proyecto creado para todo el equipo.");
}

function renderNavigation() {
  el("#course-nav").innerHTML = SECTIONS.map(([key, label, number]) => `<button class="${state.section === key ? "active" : ""}" data-section="${key}"><span>${number}</span>${label}${sectionCheck(key) ? "<i>✓</i>" : ""}</button>`).join("");
}
function sectionCheck(key) { if (!state.project) return false; return ({ diagnosis: !!state.diagnosis?.current_situation, objectives: state.objectives.length > 1, alternatives: state.alternatives.length > 0, action: state.actions.length > 0, people: state.stakeholders.length > 0, indicators: state.indicators.length > 0, prototype: !!state.prototype?.description, deliverables: state.deliverables.some((d) => d.status === "submitted" || d.status === "approved") })[key] || false; }
function renderShell() { const progress = calculateProgress(); el("#overall-progress").textContent = `${progress}%`; el("#overall-bar").style.width = `${progress}%`; }
function calculateProgress() { const checks = [state.diagnosis?.current_situation, state.objectives.length >= 2, state.alternatives.length, state.actions.length, state.stakeholders.length, state.indicators.length, state.prototype?.description]; return Math.round((checks.filter(Boolean).length / checks.length) * 100); }

function renderSection() {
  if (!state.project) return;
  const renderers = { overview: renderOverview, diagnosis: renderDiagnosis, objectives: renderObjectives, alternatives: renderAlternatives, action: renderActions, people: renderPeople, indicators: renderIndicators, prototype: renderPrototype, deliverables: renderDeliverables, comments: renderComments };
  el("#project-content").innerHTML = renderers[state.section](); renderShell();
}

function sectionHead(kicker, title, description) { return `<header class="section-head"><div><span class="eyebrow">${kicker}</span><h1>${title}</h1><p>${description}</p></div><span class="autosave-badge">Colaborativo</span></header>`; }
function renderOverview() {
  const next = state.deliverables.find((item) => item.status === "pending" || item.status === "changes_requested");
  return `${sectionHead("Proyecto de aplicación", esc(state.project.title), "Un espacio compartido para convertir una necesidad estratégica en una solución validada.")}<div class="project-metrics"><article><span>Etapa actual</span><strong>${stageName(state.project.stage)}</strong><small>${esc(state.project.status)}</small></article><article><span>Avance académico</span><strong>${calculateProgress()}%</strong><small>7 componentes de la guía</small></article><article><span>Próxima entrega</span><strong>${next ? shortDate(next.due_at) : "Completado"}</strong><small>${next ? esc(next.title) : "Sin pendientes"}</small></article></div><div class="journey"><div class="journey-step active"><b>1</b><div><strong>Formulación</strong><span>Diagnóstico y guía de proyecto</span></div></div><div class="journey-line"></div><div class="journey-step ${state.project.stage !== "formulacion" ? "active" : ""}"><b>2</b><div><strong>Prototipo</strong><span>Diseño, prueba y validación</span></div></div><div class="journey-line"></div><div class="journey-step ${["shark_tank", "completed"].includes(state.project.stage) ? "active" : ""}"><b>3</b><div><strong>Shark tank</strong><span>Pitch de 7 minutos ante jurados</span></div></div></div><form class="section-card project-summary-form" data-form="project"><h3>Presentación general</h3><label>Título<input name="title" required value="${esc(state.project.title)}"></label><label>Alineación estratégica<textarea name="strategic_alignment">${esc(state.project.strategic_alignment)}</textarea></label><label>Resumen ejecutivo<textarea name="executive_summary" placeholder="Explique el propósito y el impacto esperado del proyecto.">${esc(state.project.executive_summary)}</textarea></label><button class="primary-btn">Guardar presentación</button></form>`;
}
function renderDiagnosis() { const d = state.diagnosis || {}; return `${sectionHead("Componente 01", "Diagnóstico y situación actual", "Delimite el problema en impacto, ubicación, involucrados, magnitud y perspectiva cronológica.")}<form class="section-card structured-form" data-form="diagnosis"><div class="form-intro"><strong>Problema identificado</strong><span>Use datos, costos, servicio y calidad para sustentar la brecha.</span></div>${area("Situación actual", "current_situation", d.current_situation, "¿Qué ocurre y cuál es la brecha frente al estándar?", true)}${area("Justificación de la mejora", "justification", d.justification)}<div class="dimension-grid">${area("Impacto", "impact", d.impact, "Comparación contra un estándar")}${area("Ubicación física", "physical_location", d.physical_location, "Áreas, unidades, regiones o relaciones afectadas")}${area("Involucrados", "people_involved", d.people_involved, "Personas afectadas o con interés")}${area("Magnitud", "magnitude", d.magnitude, "Impacto absoluto o relativo")}${area("Perspectiva cronológica", "chronology", d.chronology, "Desde cuándo existe y evolución")}${area("Causas raíz", "root_causes", d.root_causes, "Factores que originan y mantienen el problema")}</div>${area("Datos y métricas relevantes", "relevant_data", d.relevant_data)}<div class="three-cols"><label>Impacto económico (COP)<input name="cost_impact" type="number" min="0" value="${d.cost_impact || ""}"></label>${area("Impacto en servicio", "service_impact", d.service_impact)}${area("Impacto en calidad", "quality_impact", d.quality_impact)}</div>${area("Capacidades para efectuar el cambio", "organizational_capabilities", d.organizational_capabilities)}<button class="primary-btn">Guardar diagnóstico</button></form>`; }
function renderObjectives() { return `${sectionHead("Componente 02", "Objetivos SMART", "Defina un objetivo general y objetivos específicos cuantificables, alcanzables y con fecha.")}<div class="section-grid"><form class="section-card" data-form="objective"><h3>Agregar objetivo</h3><label>Tipo<select name="objective_type"><option value="general">General</option><option value="specific">Específico</option></select></label>${area("Redacción SMART", "statement", "", "Verbo + resultado + medida + fecha", true)}<div class="three-cols"><label>Métrica<input name="metric"></label><label>Meta<input name="target" type="number" step="any"></label><label>Unidad<input name="unit" placeholder="%, días, COP…"></label></div><label>Fecha límite<input name="deadline" type="date"></label><button class="primary-btn">Agregar objetivo</button></form><div class="records-card"><h3>Objetivos del proyecto</h3>${recordList(state.objectives, (item) => `<div><span class="record-type">${item.objective_type === "general" ? "General" : "Específico"}</span><strong>${esc(item.statement)}</strong><small>${item.target ?? "—"} ${esc(item.unit)} · ${shortDate(item.deadline)}</small></div>`, "objective")}</div></div>`; }
function renderAlternatives() { return `${sectionHead("Componente 03", "Alternativas de solución", "Compare propuestas concretas y documente por qué seleccionan la de mayor valor.")}<div class="section-grid"><form class="section-card" data-form="alternative"><h3>Nueva alternativa</h3><label>Título<input name="title" required></label>${area("Descripción", "description", "", "¿Cómo resolvería el problema?", true)}${area("Impacto esperado", "expected_impact", "")}<div class="three-cols"><label>Factibilidad (1–5)<input name="feasibility_score" type="number" min="1" max="5"></label><label>Impacto (1–5)<input name="impact_score" type="number" min="1" max="5"></label><label>Costo favorable (1–5)<input name="cost_score" type="number" min="1" max="5"></label></div><button class="primary-btn">Agregar alternativa</button></form><div class="records-card"><h3>Matriz de alternativas</h3>${recordList(state.alternatives, (item) => `<div><span class="score-pill">${Number(item.feasibility_score || 0) + Number(item.impact_score || 0) + Number(item.cost_score || 0)}/15</span><strong>${esc(item.title)}</strong><small>${esc(item.description)}</small></div>`, "alternative")}</div></div>`; }
function renderActions() { return `${sectionHead("Componente 04", "Plan de acción y cronograma", "Conecte cada objetivo con acciones, método, responsable, fechas y avance.")}<form class="section-card inline-create" data-form="action"><label>Qué va a hacer<input name="action" required></label><label>Cómo lo hará<input name="method"></label><label>Responsable<input name="owner_name"></label><label>Inicio<input name="start_date" type="date"></label><label>Fin<input name="end_date" type="date"></label><button class="primary-btn">Agregar acción</button></form><div class="gantt-card"><div class="table-header"><h3>Cronograma colaborativo</h3><span>${state.actions.length} acciones</span></div>${state.actions.length ? state.actions.map((item) => `<article class="action-row"><div><strong>${esc(item.action)}</strong><small>${esc(item.owner_name || "Sin responsable")} · ${shortDate(item.start_date)} → ${shortDate(item.end_date)}</small></div><select data-progress-id="${item.id}" data-field="status"><option value="pending" ${item.status === "pending" ? "selected" : ""}>Pendiente</option><option value="in_progress" ${item.status === "in_progress" ? "selected" : ""}>En curso</option><option value="blocked" ${item.status === "blocked" ? "selected" : ""}>Bloqueada</option><option value="completed" ${item.status === "completed" ? "selected" : ""}>Completada</option></select><input data-progress-id="${item.id}" data-field="progress" type="range" min="0" max="100" value="${item.progress}"><b>${item.progress}%</b><button class="delete-record" data-delete="action" data-id="${item.id}">×</button></article>`).join("") : empty("Agregue la primera acción del proyecto.")}</div>`; }
function renderPeople() { return `${sectionHead("Componente 05", "Involucrados y recursos", "Asigne roles, funciones y dedicación; identifique los recursos para ejecutar la solución.")}<div class="section-grid"><form class="section-card" data-form="stakeholder"><h3>Agregar involucrado</h3><label>Persona<input name="person_name" required></label><label>Rol en el proyecto<input name="project_role" required></label>${area("Funciones", "functions", "", "Responsabilidades concretas", true)}<div class="two-cols"><label>Dedicación<input name="dedication_hours" type="number" step="0.5"></label><label>Área<input name="area"></label></div><button class="primary-btn">Agregar persona</button></form><form class="section-card" data-form="resource"><h3>Agregar recurso</h3><label>Tipo<select name="resource_type"><option value="humano">Humano</option><option value="tecnologico">Tecnológico</option><option value="financiero">Financiero</option><option value="fisico">Físico</option><option value="informacion">Información</option><option value="otro">Otro</option></select></label>${area("Descripción", "description", "", "Qué se necesita y para qué", true)}<label>Costo estimado<input name="estimated_cost" type="number" min="0"></label><button class="primary-btn">Agregar recurso</button></form></div><div class="people-grid">${state.stakeholders.map((item) => `<article><span>${esc(item.project_role)}</span><strong>${esc(item.person_name)}</strong><p>${esc(item.functions)}</p><small>${item.dedication_hours || "—"} horas ${esc(item.dedication_period)}</small><button class="delete-record" data-delete="stakeholder" data-id="${item.id}">×</button></article>`).join("") || empty("Aún no hay involucrados.")}</div><div class="resource-strip">${state.resources.map((item) => `<div><span>${esc(item.resource_type)}</span><strong>${esc(item.description)}</strong><small>${money(item.estimated_cost)}</small><button class="delete-record" data-delete="resource" data-id="${item.id}">×</button></div>`).join("")}</div>`; }
function renderIndicators() { return `${sectionHead("Componente 06", "Indicadores de eficacia y eficiencia", "Defina cómo evidenciarán el cumplimiento de los objetivos y el impacto esperado.")}<div class="section-grid"><form class="section-card" data-form="indicator"><h3>Nuevo indicador</h3><label>Nombre<input name="name" required></label><label>Tipo<select name="indicator_type"><option value="eficacia">Eficacia</option><option value="eficiencia">Eficiencia</option><option value="impacto">Impacto</option></select></label><label>Fórmula<input name="formula" required placeholder="Numerador / denominador × 100"></label><div class="three-cols"><label>Línea base<input name="baseline" type="number" step="any"></label><label>Meta<input name="target" type="number" step="any"></label><label>Unidad<input name="unit"></label></div><label>Fuente de datos<input name="data_source"></label><button class="primary-btn">Agregar indicador</button></form><div class="indicator-board">${state.indicators.map((item) => `<article><div><span>${esc(item.indicator_type)}</span><strong>${esc(item.name)}</strong><small>${esc(item.formula)}</small></div><div class="indicator-values"><span>Base <b>${item.baseline ?? "—"}</b></span><span>Meta <b>${item.target ?? "—"} ${esc(item.unit)}</b></span></div><button class="delete-record" data-delete="indicator" data-id="${item.id}">×</button></article>`).join("") || empty("Defina al menos un indicador de eficacia y uno de eficiencia.")}</div></div>`; }
function renderPrototype() { const p = state.prototype || {}; return `${sectionHead("Entregable 02", "Diseño y validación del prototipo", "Materialice la solución, pruebe sus hipótesis y documente la evidencia.")}<form class="section-card structured-form" data-form="prototype"><div class="two-cols"><label>Tipo de prototipo<input name="prototype_type" value="${esc(p.prototype_type)}" placeholder="Proceso, servicio, interfaz, piloto…"></label><label>Estado<select name="status"><option value="idea">Idea</option><option value="design" ${p.status === "design" ? "selected" : ""}>Diseño</option><option value="testing" ${p.status === "testing" ? "selected" : ""}>Pruebas</option><option value="validated" ${p.status === "validated" ? "selected" : ""}>Validado</option></select></label></div>${area("Propuesta de valor", "value_proposition", p.value_proposition, "Para quién, qué resuelve y por qué es valiosa", true)}${area("Descripción del prototipo", "description", p.description)}${area("Hipótesis a validar", "hypothesis", p.hypothesis)}${area("Método de validación", "validation_method", p.validation_method)}${area("Resultados de prueba", "test_results", p.test_results)}<label>Enlace a evidencia<input name="evidence_url" type="url" value="${esc(p.evidence_url)}" placeholder="https://…"></label><button class="primary-btn">Guardar prototipo</button></form>`; }
function renderDeliverables() { return `${sectionHead("Seguimiento académico", "Entregables y fechas clave", "Presente la guía, el prototipo y el pitch final para revisión de docentes y jurados.")}<div class="deliverable-list">${state.deliverables.map((item) => `<article><div class="date-block"><b>${new Date(item.due_at).getDate()}</b><span>${new Date(item.due_at).toLocaleDateString("es-CO", { month: "short" })}</span></div><div><span class="status ${item.status}">${statusName(item.status)}</span><strong>${esc(item.title)}</strong><small>${item.reviewer_feedback ? `Retroalimentación: ${esc(item.reviewer_feedback)}` : `Fecha límite: ${shortDate(item.due_at)}`}</small></div><form class="upload-form" data-deliverable="${item.id}" data-stage="${item.stage}"><input name="file" type="file" accept=".pdf,.ppt,.pptx,.doc,.docx,.xlsx,.png,.jpg,.jpeg" required><button class="ghost-btn">${item.file_path ? "Reemplazar" : "Entregar"}</button></form></article>`).join("")}</div><div class="pitch-card"><span>Presentación final</span><h3>Shark tank · 7 minutos</h3><p>Panel de directivos de Terpel y docentes de la Universidad Javeriana.</p><div><b>Impacto estratégico</b><b>Factibilidad</b><b>Innovación</b><b>Evidencia</b><b>Presentación</b></div></div>`; }
function renderComments() { return `${sectionHead("Conversación del equipo", "Comentarios y retroalimentación", "Registre decisiones, preguntas y aportes de participantes y docentes.")}<form class="comment-form" data-form="comment"><select name="section"><option value="general">General</option>${SECTIONS.slice(1, 8).map(([key, name]) => `<option value="${key}">${name}</option>`).join("")}</select><textarea name="body" required placeholder="Escriba un comentario…"></textarea><button class="primary-btn">Publicar</button></form><div class="comment-list">${state.comments.map((item) => `<article><span class="avatar">${esc((item.author?.full_name || item.author?.email || "U").slice(0, 1).toUpperCase())}</span><div><div><strong>${esc(item.author?.full_name || item.author?.email)}</strong><span>${esc(item.section)} · ${shortDate(item.created_at)}</span></div><p>${esc(item.body)}</p></div></article>`).join("") || empty("Todavía no hay comentarios.")}</div>`; }

async function handleSectionSubmit(event) {
  event.preventDefault(); const form = event.target; if (form.matches(".upload-form")) return uploadDeliverable(form, event.submitter);
  const type = form.dataset.form; if (!type) return; const values = formData(form); const button = event.submitter; setBusy(button, true);
  let response;
  if (type === "project") response = await supabase.from("projects").update({ ...values, updated_by: state.user.id, updated_at: new Date().toISOString() }).eq("id", state.project.id);
  if (type === "diagnosis") response = await supabase.from("problem_diagnosis").upsert({ project_id: state.project.id, ...emptyToNull(values, ["cost_impact"]), updated_by: state.user.id, updated_at: new Date().toISOString() });
  if (type === "objective") response = await supabase.from("project_objectives").insert({ project_id: state.project.id, ...values, target: values.target === "" ? null : Number(values.target), deadline: values.deadline || null, created_by: state.user.id, sort_order: state.objectives.length });
  if (type === "alternative") response = await supabase.from("solution_alternatives").insert({ project_id: state.project.id, ...numeric(values, ["feasibility_score", "impact_score", "cost_score"]), created_by: state.user.id });
  if (type === "action") response = await supabase.from("action_plan").insert({ project_id: state.project.id, ...values, start_date: values.start_date || null, end_date: values.end_date || null, created_by: state.user.id, sort_order: state.actions.length });
  if (type === "stakeholder") response = await supabase.from("stakeholders").insert({ project_id: state.project.id, ...emptyToNull(values, ["dedication_hours"]), created_by: state.user.id });
  if (type === "resource") response = await supabase.from("project_resources").insert({ project_id: state.project.id, ...numeric(values, ["estimated_cost"]), created_by: state.user.id });
  if (type === "indicator") response = await supabase.from("indicators").insert({ project_id: state.project.id, ...emptyToNull(values, ["baseline", "target"]), created_by: state.user.id });
  if (type === "prototype") response = await supabase.from("prototype").upsert({ project_id: state.project.id, ...values, updated_by: state.user.id, updated_at: new Date().toISOString() });
  if (type === "comment") response = await supabase.from("project_comments").insert({ project_id: state.project.id, ...values, author_id: state.user.id });
  setBusy(button, false); if (response?.error) return toast(humanError(response.error), "error");
  toast("Cambios guardados para el equipo."); await refreshProject();
}

async function handleSectionClick(event) {
  const button = event.target.closest("[data-delete]"); if (!button) return;
  const map = { objective: "project_objectives", alternative: "solution_alternatives", action: "action_plan", stakeholder: "stakeholders", resource: "project_resources", indicator: "indicators" };
  if (!confirm("¿Eliminar este registro?")) return;
  const { error } = await supabase.from(map[button.dataset.delete]).delete().eq("id", button.dataset.id);
  if (error) return toast(humanError(error), "error"); await refreshProject(); toast("Registro eliminado.");
}

async function handleSectionChange(event) {
  const input = event.target.closest("[data-progress-id]"); if (!input) return;
  const payload = { [input.dataset.field]: input.dataset.field === "progress" ? Number(input.value) : input.value, updated_at: new Date().toISOString() };
  const { error } = await supabase.from("action_plan").update(payload).eq("id", input.dataset.progressId);
  if (error) return toast(humanError(error), "error"); await refreshProject();
}

async function uploadDeliverable(form, button) {
  const file = form.elements.file.files[0]; if (!file) return; setBusy(button, true, "Subiendo…");
  const safeName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${state.team.id}/${state.project.id}/${form.dataset.stage}/${Date.now()}-${safeName}`;
  const { error: uploadError } = await supabase.storage.from("deliverables").upload(path, file, { upsert: false });
  if (uploadError) { setBusy(button, false); return toast(humanError(uploadError), "error"); }
  const { error } = await supabase.from("deliverables").update({ file_path: path, status: "submitted", submitted_at: new Date().toISOString(), submitted_by: state.user.id }).eq("id", form.dataset.deliverable);
  setBusy(button, false); if (error) return toast(humanError(error), "error"); await refreshProject(); toast("Entregable cargado de forma privada.");
}

async function refreshProject() {
  const { data } = await supabase.from("projects").select("*").eq("id", state.project.id).single(); state.project = data || state.project; await loadProjectData(); renderNavigation(); renderSection();
}

function subscribeRealtime() {
  if (state.realtime) supabase.removeChannel(state.realtime);
  let timer;
  const refresh = () => { clearTimeout(timer); timer = setTimeout(async () => { await refreshProject(); toast("El equipo realizó cambios; la vista fue actualizada."); }, 700); };
  state.realtime = supabase.channel(`project-${state.project.id}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "projects", filter: `id=eq.${state.project.id}` }, refresh)
    .on("postgres_changes", { event: "*", schema: "public", table: "action_plan", filter: `project_id=eq.${state.project.id}` }, refresh)
    .on("postgres_changes", { event: "*", schema: "public", table: "project_comments", filter: `project_id=eq.${state.project.id}` }, refresh)
    .subscribe();
}

function teamInvitationModal() {
  if (state.membership?.role !== "lider") return toast("Solo el líder puede generar invitaciones.", "error");
  const suggested = `GM26-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  openModal(`<span class="eyebrow">${esc(state.team.name)}</span><h2>Invitar integrantes</h2><p>El código se muestra una sola vez. Compártalo únicamente con las personas que formarán parte del equipo.</p><form id="team-invite-form" class="modal-form"><label>Código privado<input name="code" value="${suggested}" minlength="8" required></label><label>Número máximo de integrantes que pueden usarlo<input name="max_uses" type="number" min="1" max="7" value="${Math.max(1, state.team.max_members - 1)}" required></label><label>Fecha de vencimiento<input name="expires_at" type="datetime-local"></label><button class="primary-btn">Crear invitación</button></form><div id="team-created-code"></div>`);
  el("#team-invite-form").addEventListener("submit", async (event) => {
    event.preventDefault(); const button = event.submitter; const values = formData(event.currentTarget);
    setBusy(button, true, "Creando…");
    const { error } = await supabase.rpc("create_invitation", {
      p_team: state.team.id,
      raw_code: values.code,
      p_role: "integrante",
      p_max_uses: Number(values.max_uses),
      p_expires_at: values.expires_at ? new Date(values.expires_at).toISOString() : null,
    });
    setBusy(button, false);
    if (error) return toast(humanError(error), "error");
    const code = values.code.trim().toUpperCase();
    event.currentTarget.classList.add("hidden");
    el("#team-created-code").innerHTML = `<div class="one-time-code"><span>Código para integrantes</span><strong>${esc(code)}</strong><button class="ghost-btn" id="copy-team-code" type="button">Copiar código</button><small>El código no puede recuperarse después porque la base solamente guarda su hash.</small></div>`;
    el("#copy-team-code").addEventListener("click", async () => {
      await navigator.clipboard.writeText(code); toast("Código copiado.");
    });
  });
}

function openModal(content) {
  el("#modal-root").innerHTML = `<div class="modal-backdrop"><section class="modal"><button class="close-btn" aria-label="Cerrar">×</button>${content}</section></div>`;
  el(".close-btn").addEventListener("click", closeModal);
  el(".modal-backdrop").addEventListener("click", (event) => { if (event.target === event.currentTarget) closeModal(); });
}
function closeModal() { el("#modal-root").innerHTML = ""; }

function area(label, name, value = "", placeholder = "", wide = false) { return `<label class="${wide ? "wide" : ""}">${label}<textarea name="${name}" placeholder="${esc(placeholder)}">${esc(value)}</textarea></label>`; }
function recordList(items, render, type) { return items.length ? `<div class="record-list">${items.map((item) => `<article>${render(item)}<button class="delete-record" data-delete="${type}" data-id="${item.id}">×</button></article>`).join("")}</div>` : empty("Aún no hay registros en este componente."); }
function empty(message) { return `<div class="empty-state">${esc(message)}</div>`; }
function stageName(value) { return ({ formulacion: "Formulación", prototipo: "Prototipo", shark_tank: "Shark tank", completed: "Finalizado" })[value] || value; }
function statusName(value) { return ({ pending: "Pendiente", submitted: "Entregado", in_review: "En revisión", changes_requested: "Requiere cambios", approved: "Aprobado" })[value] || value; }
function emptyToNull(object, names) { const copy = { ...object }; names.forEach((name) => copy[name] = copy[name] === "" ? null : Number(copy[name])); return copy; }
function numeric(object, names) { const copy = { ...object }; names.forEach((name) => copy[name] = copy[name] === "" ? null : Number(copy[name])); return copy; }
function roleName(value) { return ({ admin: "Administrador", docente: "Docente", participante: "Participante", jurado: "Jurado", lider: "Líder habilitado" })[value] || value; }
function recoveryRedirectPresent() { const hash = new URLSearchParams(window.location.hash.slice(1)); const query = new URLSearchParams(window.location.search); return window.portalRecoveryRedirect === true || hash.get("type") === "recovery" || query.get("type") === "recovery"; }
function humanError(error) { const message = error?.message || "No fue posible completar la operación."; if (/Invalid login/i.test(message)) return "Correo o contraseña incorrectos."; if (/Email not confirmed/i.test(message)) return "Confirme primero su correo electrónico."; if (/duplicate key/i.test(message)) return "Ese registro ya existe."; return message; }
})();
