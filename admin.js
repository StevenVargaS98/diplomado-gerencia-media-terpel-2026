(() => {
const { config, configured, supabase, escapeHtml: esc, shortDate, toast, setBusy, setupPanel } = window.Portal;
const adminState = { user: null, profile: null, section: "overview", cohorts: [], teams: [], people: [], projects: [], reviews: [] };
const $ = (selector) => document.querySelector(selector);

document.addEventListener("DOMContentLoaded", initializeAdmin);

async function initializeAdmin() {
  if (!configured) { $("#admin-config").innerHTML = setupPanel(); $("#admin-config").classList.remove("hidden"); return; }
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return deny();
  adminState.user = session.user;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
  if (!profile || !["admin", "docente"].includes(profile.global_role)) return deny();
  adminState.profile = profile; $("#admin-name").textContent = profile.full_name || profile.email;
  wireAdmin();
  try {
    await loadAdminData(); $("#admin-app").classList.remove("hidden"); renderAdmin();
  } catch (error) {
    $("#admin-app").classList.remove("hidden");
    $("#admin-content").innerHTML = `${head("Conexión de datos", "No se pudo cargar la administración", "Las cuentas no fueron borradas por esta pantalla.")}<section class="admin-table-card"><div class="empty-state"><strong>Supabase rechazó una consulta</strong><p>${esc(error.message || "Error desconocido")}</p><button class="primary-btn" type="button" onclick="location.reload()">Intentar nuevamente</button></div></section>`;
    toast("No se pudieron cargar los datos administrativos.", "error");
  }
}

function deny() { $("#admin-denied").classList.remove("hidden"); }
function wireAdmin() {
  $("#admin-nav").addEventListener("click", (event) => { const button = event.target.closest("[data-admin-section]"); if (!button) return; adminState.section = button.dataset.adminSection; document.querySelectorAll("[data-admin-section]").forEach((item) => item.classList.toggle("active", item === button)); renderAdmin(); });
  $("#admin-content").addEventListener("click", handleAdminClick);
  $("#admin-content").addEventListener("submit", handleAdminSubmit);
  $("#admin-content").addEventListener("change", handleAdminChange);
  document.querySelector("[data-signout]").addEventListener("click", async () => { await supabase.auth.signOut(); window.location.href = "index.html"; });
}

async function loadAdminData() {
  const results = await Promise.all([
    supabase.from("cohorts").select("*").order("year", { ascending: false }),
    supabase.from("academic_teams").select("*,cohort:cohorts(name,year),members:team_members(user_id,role,status,profile:profiles(full_name,email))").order("created_at"),
    supabase.from("profiles").select("*").order("full_name"),
    supabase.from("projects").select("*,team:academic_teams(name,modality),deliverables(*)").order("updated_at", { ascending: false }),
    supabase.from("jury_reviews").select("*,reviewer:profiles(full_name,email),project:projects(title)").order("submitted_at", { ascending: false }),
  ]);
  const labels = ["cohortes", "equipos", "participantes", "proyectos", "evaluaciones"];
  const failures = results.flatMap((result, index) => result.error ? [`${labels[index]}: ${result.error.message}`] : []);
  if (failures.length) throw new Error(failures.join(" | "));
  const [cohorts, teams, people, projects, reviews] = results.map((result) => result.data || []);
  adminState.cohorts = cohorts; adminState.teams = teams;
  adminState.people = people.filter((person) => !person.deleted_at);
  adminState.projects = projects; adminState.reviews = reviews;
}

function renderAdmin() { const renders = { overview: overview, teams: teams, people: people, deliverables: deliverables, reviews: reviews }; $("#admin-content").innerHTML = renders[adminState.section](); }
function head(kicker, title, description, action = "") { return `<header class="section-head admin-section-head"><div><span class="eyebrow">${kicker}</span><h1>${title}</h1><p>${description}</p></div>${action}</header>`; }
function overview() {
  const members = adminState.teams.reduce((sum, team) => sum + (team.members || []).filter((item) => item.status === "active").length, 0);
  const submitted = adminState.projects.flatMap((project) => project.deliverables || []).filter((item) => item.status === "submitted").length;
  return `${head("Panel académico", "Visión general", "Seguimiento del diplomado, sus equipos y entregas.")}<section class="admin-stats"><article><span>Equipos</span><strong>${adminState.teams.length}</strong><small>${adminState.teams.filter((item) => item.modality === "presencial").length} presenciales</small></article><article><span>Participantes</span><strong>${members}</strong><small>Miembros activos</small></article><article><span>Proyectos</span><strong>${adminState.projects.length}</strong><small>${adminState.projects.filter((item) => item.status === "in_review").length} en revisión</small></article><article><span>Entregas por revisar</span><strong>${submitted}</strong><small>Requieren retroalimentación</small></article></section><section class="deadline-board"><div><span>18 AGO</span><strong>Definición de equipos</strong><small>Presencial y remoto</small></div><div><span>17 SEP</span><strong>Formulación</strong><small>Ítems 1 y 2</small></div><div><span>27 OCT</span><strong>Guía completa</strong><small>Ítems 3 al 7</small></div><div><span>26 NOV</span><strong>Shark tank</strong><small>7 minutos por equipo</small></div></section><section class="admin-table-card"><div class="table-header"><h3>Proyectos recientes</h3><span>Actualización colaborativa</span></div>${projectRows(adminState.projects.slice(0, 8))}</section>`;
}
function teams() {
  return `${head("Organización académica", "Equipos de trabajo", "Cree equipos, genere invitaciones y supervise su conformación.", '<button class="primary-btn" data-modal="team">＋ Crear equipo</button>')}<div class="team-admin-grid">${adminState.teams.map((team) => { const active = (team.members || []).filter((m) => m.status === "active"); return `<article class="team-admin-card"><div><span class="modality ${team.modality}">${esc(team.modality)}</span><strong>${esc(team.name)}</strong><small>${active.length}/${team.max_members} integrantes · ${team.cohort?.year || ""}</small></div><div class="member-stack">${active.slice(0, 4).map((member) => `<span title="${esc(member.profile?.full_name || member.profile?.email)}">${esc((member.profile?.full_name || member.profile?.email || "U")[0])}</span>`).join("")}</div>${adminState.profile.global_role === "admin" ? `<a class="ghost-btn button-link team-open-link" href="index.html?team=${encodeURIComponent(team.id)}">Entrar al espacio</a>` : ""}<button class="ghost-btn" data-invite="${team.id}" data-name="${esc(team.name)}">Generar invitación</button><button class="text-btn" data-team-detail="${team.id}">Ver integrantes</button>${adminState.profile.global_role === "admin" ? `<button class="danger-btn admin-delete-action" data-delete-team="${team.id}" data-name="${esc(team.name)}">Eliminar equipo</button>` : ""}</article>`; }).join("") || empty("Cree el primer equipo del diplomado.")}</div>`;
}
function people() {
  const rows = adminState.people.map((person) => `<div class="tr"><span><strong>${esc(person.full_name || "Sin nombre")}</strong><small>${esc(person.email)}</small>${adminState.profile.global_role === "admin" && person.id !== adminState.user.id ? `<button class="danger-btn person-delete-action" data-delete-person="${person.id}" data-email="${esc(person.email)}" data-name="${esc(person.full_name || person.email)}">Eliminar persona</button>` : ""}</span><span>${profileRoleSelect(person)}</span><span><select data-profile-status="${person.id}" ${adminState.profile.global_role !== "admin" ? "disabled" : ""}><option value="active" ${person.status === "active" ? "selected" : ""}>Activo</option><option value="pending" ${person.status === "pending" ? "selected" : ""}>Pendiente</option><option value="blocked" ${person.status === "blocked" ? "selected" : ""}>Bloqueado</option></select></span><span>${shortDate(person.created_at)}</span></div>`).join("");
  return `${head("Comunidad", "Participantes y roles", "Asigne Líder habilitado a quien podrá crear un equipo. Los demás solo podrán aceptar invitaciones.")}<section class="leader-permission-note"><strong>Flujo de conformación</strong><span>1. La persona crea su cuenta sin código.</span><span>2. El profesor la habilita como líder, si corresponde.</span><span>3. El líder crea el equipo y comparte invitaciones con sus integrantes.</span></section><section class="admin-table-card"><div class="people-table table"><div class="tr th"><span>Persona</span><span>Rol global</span><span>Estado</span><span>Registro</span></div>${rows || empty("No hay perfiles visibles. Verifique las cuentas en Authentication → Users.")}</div></section>`;
}

function profileRoleSelect(person) {
  if (adminState.profile.global_role === "admin") {
    const roles = [["participante", "Participante"], ["lider", "Líder habilitado"], ["docente", "Docente"], ["jurado", "Jurado"], ["admin", "Administrador"]];
    return `<select data-profile-role="${person.id}">${roles.map(([value, label]) => `<option value="${value}" ${person.global_role === value ? "selected" : ""}>${label}</option>`).join("")}</select>`;
  }
  if (["participante", "lider"].includes(person.global_role)) {
    return `<select data-profile-role="${person.id}"><option value="participante" ${person.global_role === "participante" ? "selected" : ""}>Participante</option><option value="lider" ${person.global_role === "lider" ? "selected" : ""}>Líder habilitado</option></select>`;
  }
  return `<span class="role-badge">${esc(person.global_role)}</span>`;
}
function deliverables() {
  const rows = adminState.projects.flatMap((project) => (project.deliverables || []).map((item) => ({ ...item, project })));
  return `${head("Seguimiento", "Entregables académicos", "Revise archivos privados, solicite ajustes o apruebe cada hito.")}<section class="deliverable-admin-list">${rows.sort((a, b) => new Date(a.due_at) - new Date(b.due_at)).map((item) => `<article><div><span class="status ${item.status}">${statusName(item.status)}</span><strong>${esc(item.title)}</strong><small>${esc(item.project.title)} · ${esc(item.project.team?.name)}</small></div><time>${shortDate(item.due_at)}</time>${item.file_path ? `<button class="ghost-btn" data-open-file="${esc(item.file_path)}">Abrir archivo</button>` : "<span class=\"missing\">Sin archivo</span>"}<button class="text-btn" data-review-deliverable="${item.id}" data-title="${esc(item.title)}" data-status="${item.status}" data-feedback="${esc(item.reviewer_feedback)}">Retroalimentar</button></article>`).join("") || empty("No hay entregables creados.")}</section>`;
}
function reviews() {
  const jurors = adminState.people.filter((person) => person.global_role === "jurado");
  return `${head("Panel de jurados", "Evaluación de impacto", "Asigne jurados y consolide la valoración del pitch final.")}<section class="admin-table-card"><div class="table-header"><h3>Asignaciones</h3><span>Criterios de 1 a 5</span></div>${adminState.projects.map((project) => `<article class="review-project"><div><strong>${esc(project.title)}</strong><small>${esc(project.team?.name)} · ${stageName(project.stage)}</small></div><form data-form="jury"><input type="hidden" name="project_id" value="${project.id}"><select name="reviewer_id" required><option value="">Seleccionar jurado…</option>${jurors.map((juror) => `<option value="${juror.id}">${esc(juror.full_name || juror.email)}</option>`).join("")}</select><button class="ghost-btn">Asignar</button></form></article>`).join("")}</section><section class="review-summary"><h3>Evaluaciones recibidas</h3>${adminState.reviews.map((review) => `<article><strong>${esc(review.project?.title)}</strong><span>${esc(review.reviewer?.full_name || review.reviewer?.email)}</span><b>${averageReview(review)}/5</b><p>${esc(review.comments)}</p></article>`).join("") || empty("Aún no se han enviado evaluaciones.")}</section>`;
}

function projectRows(projects) { return projects.length ? `<div class="project-admin-rows">${projects.map((project) => `<article><div><strong>${esc(project.title)}</strong><small>${esc(project.team?.name)} · ${esc(project.team?.modality)}</small></div><span class="status ${project.status}">${esc(project.status)}</span><b>${project.progress}%</b><time>${shortDate(project.updated_at)}</time></article>`).join("")}</div>` : empty("Aún no hay proyectos."); }

async function handleAdminSubmit(event) {
  event.preventDefault(); const form = event.target; const values = Object.fromEntries(new FormData(form)); const button = event.submitter; setBusy(button, true);
  let result;
  if (form.dataset.form === "jury") result = await supabase.from("jury_assignments").insert(values);
  setBusy(button, false); if (result?.error) return toast(result.error.message, "error"); if (result) { toast("Jurado asignado."); await reload(); }
}

async function handleAdminClick(event) {
  const button = event.target.closest("button"); if (!button) return;
  if (button.dataset.deleteTeam) return deleteTeamModal(button.dataset.deleteTeam, button.dataset.name);
  if (button.dataset.deletePerson) return deletePersonModal(button.dataset.deletePerson, button.dataset.email, button.dataset.name);
  if (button.dataset.modal === "team") return teamModal();
  if (button.dataset.invite) return invitationModal(button.dataset.invite, button.dataset.name);
  if (button.dataset.teamDetail) return teamDetailModal(button.dataset.teamDetail);
  if (button.dataset.reviewDeliverable) return reviewModal(button.dataset);
  if (button.dataset.openFile) {
    const { data, error } = await supabase.storage.from("deliverables").createSignedUrl(button.dataset.openFile, 300);
    if (error) return toast(error.message, "error"); window.open(data.signedUrl, "_blank", "noopener");
  }
}

async function handleAdminChange(event) {
  const input = event.target;
  if (input.dataset.profileRole) {
    const response = adminState.profile.global_role === "admin"
      ? await supabase.from("profiles").update({ global_role: input.value }).eq("id", input.dataset.profileRole)
      : await supabase.rpc("set_team_leader_permission", { p_profile: input.dataset.profileRole, p_enabled: input.value === "lider" });
    if (response.error) return toast(response.error.message, "error");
    await reload(); toast(input.value === "lider" ? "Participante habilitado como líder." : "Rol actualizado.");
  }
  if (input.dataset.profileStatus) { const { error } = await supabase.from("profiles").update({ status: input.value }).eq("id", input.dataset.profileStatus); if (error) return toast(error.message, "error"); toast("Estado actualizado."); }
}

function teamModal() {
  modal(`<span class="eyebrow">Nuevo equipo</span><h2>Crear equipo académico</h2><form id="team-create" class="modal-form"><label>Nombre<input name="name" required placeholder="Equipo Presencial 1"></label><label>Cohorte<select name="cohort_id" required>${adminState.cohorts.map((cohort) => `<option value="${cohort.id}">${esc(config.siteName || cohort.name)} ${cohort.year}</option>`).join("")}</select></label><div class="two-cols"><label>Modalidad<select name="modality"><option value="presencial">Presencial</option><option value="remoto">Remoto</option></select></label><label>Máximo de integrantes<input name="max_members" type="number" min="3" max="8" value="4"></label></div><button class="primary-btn">Crear equipo</button></form>`);
  $("#team-create").onsubmit = async (event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); values.max_members = Number(values.max_members); values.created_by = adminState.user.id; const { error } = await supabase.from("academic_teams").insert(values); if (error) return toast(error.message, "error"); closeModal(); await reload(); toast("Equipo creado."); };
}

function invitationModal(teamId, name) {
  const suggested = permanentInviteCode();
  modal(`<span class="eyebrow">${esc(name)}</span><h2>Crear código permanente</h2><p>Este código no vence y podrá reutilizarse mientras el equipo tenga cupos. Se mostrará una sola vez: cópielo y guárdelo en un lugar seguro.</p><form id="invite-create" class="modal-form"><label>Código permanente<input name="code" value="${suggested}" minlength="8" readonly required></label><button class="primary-btn">Activar código permanente</button></form><div id="created-code"></div>`);
  $("#invite-create").onsubmit = async (event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); const { error } = await supabase.rpc("create_invitation", { p_team: teamId, raw_code: values.code, p_role: "integrante", p_max_uses: 2147483647, p_expires_at: null }); if (error) return toast(error.message, "error"); const code = values.code.trim().toUpperCase(); event.currentTarget.classList.add("hidden"); $("#created-code").innerHTML = `<div class="one-time-code"><span>Código permanente del equipo</span><strong>${esc(code)}</strong><button class="ghost-btn" id="copy-code" type="button">Copiar código</button><small>No vence. Funcionará mientras haya cupos y la invitación no sea revocada.</small></div>`; $("#copy-code").onclick = async () => { await navigator.clipboard.writeText(code); toast("Código permanente copiado."); }; };
}

function teamDetailModal(teamId) {
  const team = adminState.teams.find((item) => item.id === teamId); const members = (team?.members || []).filter((item) => item.status === "active");
  modal(`<span class="eyebrow">${esc(team?.modality)}</span><h2>${esc(team?.name)}</h2><div class="modal-member-list">${members.map((member) => `<div><span class="avatar">${esc((member.profile?.full_name || "U")[0])}</span><div><strong>${esc(member.profile?.full_name || "Sin nombre")}</strong><small>${esc(member.profile?.email)}</small></div><b>${esc(member.role)}</b></div>`).join("") || empty("Este equipo todavía no tiene integrantes.")}</div>`);
}

function deletePersonModal(profileId, email, name) {
  modal(`<span class="eyebrow danger-eyebrow">Acción administrativa</span><h2>Eliminar persona</h2><p><strong>${esc(name)}</strong> perderá inmediatamente el acceso y dejará de aparecer en el panel. Sus aportes académicos se conservan para no romper la trazabilidad.</p><p>Escriba el correo <strong>${esc(email)}</strong> para confirmar.</p><form id="person-delete-form" class="modal-form"><label>Correo de confirmación<input name="confirmation" type="email" autocomplete="off" required></label><button class="danger-solid-btn">Eliminar persona</button></form>`);
  $("#person-delete-form").onsubmit = async (event) => {
    event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); const button = event.submitter;
    if (values.confirmation.trim().toLowerCase() !== email.trim().toLowerCase()) return toast("El correo de confirmación no coincide.", "error");
    setBusy(button, true, "Eliminando…");
    const { error } = await supabase.rpc("admin_remove_person", { p_profile: profileId });
    setBusy(button, false); if (error) return toast(adminRpcError(error), "error");
    closeModal(); await reload(); toast("Persona eliminada y acceso bloqueado.");
  };
}

function deleteTeamModal(teamId, name) {
  const projects = adminState.projects.filter((project) => project.team_id === teamId);
  const filePaths = projects.flatMap((project) => project.deliverables || []).map((item) => item.file_path).filter(Boolean);
  modal(`<span class="eyebrow danger-eyebrow">Acción irreversible</span><h2>Eliminar equipo</h2><p>Se eliminarán <strong>${esc(name)}</strong>, sus integrantes, invitaciones, proyecto, formularios, comentarios, evaluaciones y ${filePaths.length} archivo(s) entregado(s).</p><p>Escriba exactamente <strong>${esc(name)}</strong> para confirmar.</p><form id="team-delete-form" class="modal-form"><label>Nombre del equipo<input name="confirmation" autocomplete="off" required></label><button class="danger-solid-btn">Eliminar equipo definitivamente</button></form>`);
  $("#team-delete-form").onsubmit = async (event) => {
    event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); const button = event.submitter;
    if (values.confirmation.trim() !== name) return toast("El nombre de confirmación no coincide.", "error");
    setBusy(button, true, "Eliminando…");
    if (filePaths.length) {
      const { error: storageError } = await supabase.storage.from("deliverables").remove(filePaths);
      if (storageError) { setBusy(button, false); return toast(`No se eliminaron los archivos: ${storageError.message}`, "error"); }
    }
    const { error } = await supabase.rpc("admin_delete_team", { p_team: teamId, p_confirmation: values.confirmation });
    setBusy(button, false); if (error) return toast(adminRpcError(error), "error");
    closeModal(); await reload(); toast("Equipo eliminado definitivamente.");
  };
}

function reviewModal(data) {
  modal(`<span class="eyebrow">Revisión académica</span><h2>${esc(data.title)}</h2><form id="deliverable-review" class="modal-form"><label>Resultado<select name="status"><option value="in_review">En revisión</option><option value="changes_requested">Solicitar cambios</option><option value="approved">Aprobar</option></select></label><label>Retroalimentación<textarea name="reviewer_feedback">${esc(data.feedback || "")}</textarea></label><button class="primary-btn">Guardar revisión</button></form>`);
  $("#deliverable-review").elements.status.value = data.status === "submitted" ? "in_review" : data.status;
  $("#deliverable-review").onsubmit = async (event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); const { error } = await supabase.from("deliverables").update({ ...values, reviewed_by: adminState.user.id, reviewed_at: new Date().toISOString() }).eq("id", data.reviewDeliverable); if (error) return toast(error.message, "error"); closeModal(); await reload(); toast("Retroalimentación guardada."); };
}

function modal(content) { $("#modal-root").innerHTML = `<div class="modal-backdrop"><section class="modal"><button class="close-btn" aria-label="Cerrar">×</button>${content}</section></div>`; $(".close-btn").onclick = closeModal; $(".modal-backdrop").onclick = (event) => { if (event.target === event.currentTarget) closeModal(); }; }
function closeModal() { $("#modal-root").innerHTML = ""; }
async function reload() { await loadAdminData(); renderAdmin(); }
function empty(message) { return `<div class="empty-state">${esc(message)}</div>`; }
function permanentInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `GM26-${Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("")}`;
}
function adminRpcError(error) {
  const message = error?.message || "Error administrativo inesperado.";
  if (/schema cache|could not find the function/i.test(message)) return "Falta instalar o recargar las funciones administrativas en Supabase. Ejecute supabase/migracion-admin-eliminaciones.sql en el SQL Editor.";
  return message;
}
function statusName(value) { return ({ pending: "Pendiente", submitted: "Entregado", in_review: "En revisión", changes_requested: "Requiere cambios", approved: "Aprobado" })[value] || value; }
function stageName(value) { return ({ formulacion: "Formulación", prototipo: "Prototipo", shark_tank: "Shark tank", completed: "Finalizado" })[value] || value; }
function averageReview(review) { const values = [review.strategic_impact, review.feasibility, review.innovation, review.evidence_quality, review.presentation].filter((item) => item != null); return values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : "—"; }
})();
