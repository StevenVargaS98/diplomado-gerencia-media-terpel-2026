const { configured, supabase, escapeHtml: esc, toast, setBusy, setupPanel } = window.Portal;
const juryState = { user: null, profile: null, assignments: [], reviews: [] };
const $j = (selector) => document.querySelector(selector);

document.addEventListener("DOMContentLoaded", initializeJury);

async function initializeJury() {
  if (!configured) { $j("#jury-config").innerHTML = setupPanel(); $j("#jury-config").classList.remove("hidden"); return; }
  const { data: { session } } = await supabase.auth.getSession(); if (!session) return denyJury();
  juryState.user = session.user;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
  if (!profile || !["jurado", "admin", "docente"].includes(profile.global_role)) return denyJury();
  juryState.profile = profile; $j("#jury-name").textContent = profile.full_name || profile.email;
  document.querySelector("[data-signout]").onclick = async () => { await supabase.auth.signOut(); window.location.href = "index.html"; };
  $j("#jury-projects").addEventListener("submit", submitReview);
  await loadJury(); $j("#jury-app").classList.remove("hidden"); renderJury();
}

function denyJury() { $j("#jury-denied").classList.remove("hidden"); }
async function loadJury() {
  const [{ data: assignments }, { data: reviews }] = await Promise.all([
    supabase.from("jury_assignments").select("project_id,project:projects(id,title,executive_summary,strategic_alignment,stage,team:academic_teams(name),problem_diagnosis(current_situation,impact,root_causes),prototype(description,test_results,status),indicators(name,indicator_type,target,current_value,unit))").eq("reviewer_id", juryState.user.id),
    supabase.from("jury_reviews").select("*").eq("reviewer_id", juryState.user.id),
  ]);
  juryState.assignments = assignments || []; juryState.reviews = reviews || [];
}

function renderJury() {
  $j("#jury-projects").innerHTML = juryState.assignments.length ? juryState.assignments.map((assignment) => {
    const project = assignment.project; const review = juryState.reviews.find((item) => item.project_id === assignment.project_id) || {};
    return `<article class="jury-card"><header><div><span>${esc(project.team?.name || "Equipo")}</span><h2>${esc(project.title)}</h2><p>${esc(project.executive_summary || project.strategic_alignment || "Sin resumen ejecutivo")}</p></div><b>${review.submitted_at ? "Evaluado" : "Pendiente"}</b></header><details><summary>Ver evidencia del proyecto</summary><div class="jury-evidence"><section><strong>Problema</strong><p>${esc(project.problem_diagnosis?.current_situation || "Por completar")}</p></section><section><strong>Impacto</strong><p>${esc(project.problem_diagnosis?.impact || "Por completar")}</p></section><section><strong>Prototipo</strong><p>${esc(project.prototype?.description || "Por completar")}</p><small>${esc(project.prototype?.test_results || "Sin resultados de prueba")}</small></section><section><strong>Indicadores</strong>${(project.indicators || []).map((item) => `<p>${esc(item.name)} · Meta ${item.target ?? "—"} ${esc(item.unit)}</p>`).join("") || "<p>Sin indicadores</p>"}</section></div></details><form data-review-project="${project.id}" class="jury-form"><div class="rubric-grid">${score("Impacto estratégico", "strategic_impact", review.strategic_impact)}${score("Factibilidad", "feasibility", review.feasibility)}${score("Innovación", "innovation", review.innovation)}${score("Calidad de evidencia", "evidence_quality", review.evidence_quality)}${score("Presentación", "presentation", review.presentation)}</div><label>Comentarios<textarea name="comments" required>${esc(review.comments || "")}</textarea></label><label>Recomendación<textarea name="recommendation">${esc(review.recommendation || "")}</textarea></label><button class="primary-btn">${review.submitted_at ? "Actualizar evaluación" : "Enviar evaluación"}</button></form></article>`;
  }).join("") : '<div class="empty-state">No tiene proyectos asignados.</div>';
}

function score(label, name, value) { return `<label>${label}<select name="${name}" required><option value="">—</option>${[1,2,3,4,5].map((number) => `<option value="${number}" ${Number(value) === number ? "selected" : ""}>${number}</option>`).join("")}</select></label>`; }
async function submitReview(event) {
  event.preventDefault(); const button = event.submitter; setBusy(button, true); const values = Object.fromEntries(new FormData(event.currentTarget));
  ["strategic_impact", "feasibility", "innovation", "evidence_quality", "presentation"].forEach((key) => values[key] = Number(values[key]));
  const { error } = await supabase.from("jury_reviews").upsert({ project_id: event.currentTarget.dataset.reviewProject, reviewer_id: juryState.user.id, ...values, submitted_at: new Date().toISOString() }, { onConflict: "project_id,reviewer_id" });
  setBusy(button, false); if (error) return toast(error.message, "error"); await loadJury(); renderJury(); toast("Evaluación guardada.");
}
