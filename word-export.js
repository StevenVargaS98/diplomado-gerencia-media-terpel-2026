(function (global) {
  "use strict";

  const TEMPLATE_PATH = "assets/plantilla-borrador-terpel.docx";
  const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const FONT = "Terpel-Sans-Regular";
  const BODY_SIZE = 18;
  const COLORS = { danger: "B00020", muted: "526575", table: "E7E6E6", border: "B7C4CE" };

  const stageLabels = { formulacion: "Formulación", prototipo: "Prototipo", shark_tank: "Shark tank", completed: "Completado" };
  const projectStatusLabels = { draft: "Borrador", in_review: "En revisión", changes_requested: "Cambios solicitados", approved: "Aprobado", presented: "Presentado" };
  const actionStatusLabels = { pending: "Pendiente", in_progress: "En curso", blocked: "Bloqueada", completed: "Completada" };
  const prototypeStatusLabels = { idea: "Idea", design: "Diseño", testing: "Pruebas", validated: "Validado" };
  const deliverableStatusLabels = { pending: "Pendiente", submitted: "Entregado", in_review: "En revisión", changes_requested: "Cambios solicitados", approved: "Aprobado" };
  const memberRoleLabels = { lider: "Líder", integrante: "Integrante", administrador: "Administrador" };

  function escapeXml(input) {
    return String(input ?? "").replace(/[<>&"']/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[char]));
  }

  function hasValue(input) {
    return input !== null && input !== undefined && String(input).trim() !== "";
  }

  function value(input, fallback = "Por completar.") {
    return hasValue(input) ? String(input).trim() : fallback;
  }

  function formatDate(input) {
    if (!hasValue(input)) return "Por definir";
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) return value(input);
    return date.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
  }

  function formatDateTime(input) {
    if (!hasValue(input)) return "Por definir";
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) return value(input);
    return date.toLocaleString("es-CO", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function formatMoney(input) {
    if (!hasValue(input)) return "Por completar";
    return Number(input).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
  }

  function run(text, options = {}) {
    const lines = value(text, options.fallback ?? "").split(/\r?\n/);
    const properties = [
      `<w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:cs="${FONT}"/>`,
      `<w:sz w:val="${options.size || BODY_SIZE}"/><w:szCs w:val="${options.size || BODY_SIZE}"/>`,
      options.bold ? "<w:b/><w:bCs/>" : "",
      options.italic ? "<w:i/><w:iCs/>" : "",
      options.color ? `<w:color w:val="${options.color}"/>` : "",
    ].join("");
    const content = lines.map((line, index) => `${index ? "<w:br/>" : ""}<w:t xml:space="preserve">${escapeXml(line)}</w:t>`).join("");
    return `<w:r><w:rPr>${properties}</w:rPr>${content}</w:r>`;
  }

  function paragraph(runs, options = {}) {
    const spacing = `<w:spacing w:before="${options.before ?? 0}" w:after="${options.after ?? 80}" w:line="240" w:lineRule="auto"/>`;
    const properties = [
      options.keepNext ? "<w:keepNext/><w:keepLines/>" : "",
      spacing,
      `<w:jc w:val="${options.align || "both"}"/>`,
      options.pageBreakBefore ? "<w:pageBreakBefore/>" : "",
    ].join("");
    return `<w:p><w:pPr>${properties}</w:pPr>${Array.isArray(runs) ? runs.join("") : runs}</w:p>`;
  }

  function title(text) {
    return paragraph(run(text, { bold: true }), { align: "center", after: 100 });
  }

  function heading(text) {
    return paragraph(run(String(text).toUpperCase(), { bold: true }), { before: 180, after: 50, keepNext: true });
  }

  function labelParagraph(label, content, options = {}) {
    const completed = hasValue(content);
    return paragraph([
      run(`${label}: `, { bold: true }),
      run(value(content), completed ? {} : { italic: true, color: COLORS.muted }),
    ], options);
  }

  function cell(text, options = {}) {
    const fill = options.header ? `<w:shd w:val="clear" w:color="auto" w:fill="${COLORS.table}"/>` : "";
    const margins = "<w:tcMar><w:top w:w=\"80\" w:type=\"dxa\"/><w:left w:w=\"90\" w:type=\"dxa\"/><w:bottom w:w=\"80\" w:type=\"dxa\"/><w:right w:w=\"90\" w:type=\"dxa\"/></w:tcMar>";
    const textOptions = { bold: options.header, size: BODY_SIZE, italic: !options.header && !hasValue(text), color: !options.header && !hasValue(text) ? COLORS.muted : "" };
    return `<w:tc><w:tcPr>${fill}${margins}</w:tcPr>${paragraph(run(value(text), textOptions), { align: options.align || "left", after: 0 })}</w:tc>`;
  }

  function table(headers, rows) {
    if (!rows.length) return paragraph(run("Por completar.", { italic: true, color: COLORS.muted }));
    const borders = `<w:tblBorders><w:top w:val="single" w:sz="4" w:color="${COLORS.border}"/><w:left w:val="single" w:sz="4" w:color="${COLORS.border}"/><w:bottom w:val="single" w:sz="4" w:color="${COLORS.border}"/><w:right w:val="single" w:sz="4" w:color="${COLORS.border}"/><w:insideH w:val="single" w:sz="4" w:color="${COLORS.border}"/><w:insideV w:val="single" w:sz="4" w:color="${COLORS.border}"/></w:tblBorders>`;
    const headerRow = `<w:tr><w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>${headers.map((item) => cell(item, { header: true })).join("")}</w:tr>`;
    const bodyRows = rows.map((row) => `<w:tr><w:trPr><w:cantSplit/></w:trPr>${headers.map((_, index) => cell(row[index])).join("")}</w:tr>`).join("");
    return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblLayout w:type="autofit"/>${borders}</w:tblPr>${headerRow}${bodyRows}</w:tbl>${paragraph(run("", { fallback: "" }), { after: 20 })}`;
  }

  function sectionGeneral(data) {
    const { state } = data;
    const perspective = (state.perspectives || []).find((item) => item.id === state.project?.perspective_id);
    return [
      heading("1. Información general"),
      labelParagraph("Nombre del proyecto", state.project?.title),
      labelParagraph("Equipo", state.team?.name),
      labelParagraph("Modalidad", state.team?.modality),
      labelParagraph("Perspectiva estratégica", perspective ? `${perspective.code} · ${perspective.name}` : ""),
      labelParagraph("Etapa", stageLabels[state.project?.stage] || state.project?.stage),
      labelParagraph("Estado", projectStatusLabels[state.project?.status] || state.project?.status),
      labelParagraph("Avance académico", `${data.progress}%`),
      labelParagraph("Alineación estratégica", state.project?.strategic_alignment),
      labelParagraph("Resumen ejecutivo", state.project?.executive_summary),
      heading("1.1. Integrantes del equipo"),
      table(["Nombre", "Correo", "Rol", "Acceso"], (state.participants || []).map((item) => [
        item.full_name || item.email,
        item.email,
        memberRoleLabels[item.member_role] || item.member_role,
        item.can_edit ? "Edición colaborativa" : "Solo lectura",
      ])),
    ].join("");
  }

  function sectionDiagnosis(state) {
    const d = state.diagnosis || {};
    return [
      heading("2. Diagnóstico y situación actual"),
      labelParagraph("Situación actual", d.current_situation),
      labelParagraph("Justificación de la mejora", d.justification),
      labelParagraph("Impacto", d.impact),
      labelParagraph("Ubicación física", d.physical_location),
      labelParagraph("Involucrados", d.people_involved),
      labelParagraph("Magnitud", d.magnitude),
      labelParagraph("Perspectiva cronológica", d.chronology),
      labelParagraph("Causas raíz", d.root_causes),
      labelParagraph("Datos y métricas relevantes", d.relevant_data),
      labelParagraph("Impacto económico", hasValue(d.cost_impact) ? formatMoney(d.cost_impact) : ""),
      labelParagraph("Impacto en servicio", d.service_impact),
      labelParagraph("Impacto en calidad", d.quality_impact),
      labelParagraph("Capacidades para efectuar el cambio", d.organizational_capabilities),
    ].join("");
  }

  function sectionObjectives(state) {
    return [heading("3. Objetivos SMART"), table(["Tipo", "Objetivo", "Métrica", "Meta", "Fecha límite"], (state.objectives || []).map((item) => [
      item.objective_type === "general" ? "General" : "Específico",
      item.statement,
      item.metric,
      hasValue(item.target) ? `${item.target} ${value(item.unit, "")}`.trim() : "",
      formatDate(item.deadline),
    ]))].join("");
  }

  function sectionAlternatives(state) {
    return [heading("4. Alternativas de solución"), table(["Alternativa", "Descripción", "Impacto esperado", "Valoración", "Selección"], (state.alternatives || []).map((item) => [
      item.title,
      item.description,
      item.expected_impact,
      `Factibilidad ${value(item.feasibility_score, "—")}/5 · Impacto ${value(item.impact_score, "—")}/5 · Costo ${value(item.cost_score, "—")}/5`,
      item.selected ? `Seleccionada. ${value(item.selection_rationale, "")}` : "No seleccionada",
    ]))].join("");
  }

  function sectionActions(state) {
    return [heading("5. Plan de acción y cronograma"), table(["Acción", "Método", "Responsable", "Fechas", "Estado y avance"], (state.actions || []).map((item) => [
      item.action,
      item.method,
      item.owner_name,
      `${formatDate(item.start_date)} → ${formatDate(item.end_date)}`,
      `${actionStatusLabels[item.status] || value(item.status)} · ${item.progress || 0}%`,
    ]))].join("");
  }

  function sectionPeople(state) {
    return [
      heading("6. Involucrados y recursos"),
      heading("6.1. Involucrados"),
      table(["Persona", "Rol", "Funciones", "Dedicación", "Área"], (state.stakeholders || []).map((item) => [
        item.person_name,
        item.project_role,
        item.functions,
        hasValue(item.dedication_hours) ? `${item.dedication_hours} horas ${value(item.dedication_period, "")}`.trim() : "",
        item.area,
      ])),
      heading("6.2. Recursos"),
      table(["Tipo", "Descripción", "Costo estimado", "Disponibilidad"], (state.resources || []).map((item) => [
        item.resource_type,
        item.description,
        formatMoney(item.estimated_cost),
        item.availability,
      ])),
    ].join("");
  }

  function sectionIndicators(state) {
    return [heading("7. Indicadores de eficacia y eficiencia"), table(["Indicador", "Tipo", "Fórmula", "Línea base", "Meta", "Fuente"], (state.indicators || []).map((item) => [
      item.name,
      item.indicator_type,
      item.formula,
      hasValue(item.baseline) ? `${item.baseline} ${value(item.unit, "")}`.trim() : "",
      hasValue(item.target) ? `${item.target} ${value(item.unit, "")}`.trim() : "",
      item.data_source,
    ]))].join("");
  }

  function sectionPrototype(state) {
    const p = state.prototype || {};
    return [
      heading("8. Diseño y validación del prototipo"),
      labelParagraph("Tipo de prototipo", p.prototype_type),
      labelParagraph("Estado", prototypeStatusLabels[p.status] || p.status),
      labelParagraph("Propuesta de valor", p.value_proposition),
      labelParagraph("Descripción del prototipo", p.description),
      labelParagraph("Hipótesis a validar", p.hypothesis),
      labelParagraph("Método de validación", p.validation_method),
      labelParagraph("Resultados de prueba", p.test_results),
      labelParagraph("Enlace a evidencia", p.evidence_url),
    ].join("");
  }

  function sectionDeliverables(state) {
    return [heading("9. Entregables y seguimiento académico"), table(["Entregable", "Fecha límite", "Estado", "Fecha de entrega", "Retroalimentación"], (state.deliverables || []).map((item) => [
      item.title,
      formatDateTime(item.due_at),
      deliverableStatusLabels[item.status] || item.status,
      formatDateTime(item.submitted_at),
      item.reviewer_feedback,
    ]))].join("");
  }

  function sectionComments(state) {
    return [heading("10. Registro colaborativo"), table(["Fecha", "Sección", "Autor", "Comentario"], (state.comments || []).slice().reverse().map((item) => [
      formatDateTime(item.created_at),
      item.section,
      item.author?.full_name || item.author?.email,
      item.body,
    ]))].join("");
  }

  function buildDocumentXml(data) {
    const state = data.state || {};
    const programName = data.config?.siteName || "Diplomado en Habilidades de Gerencia Media - Organización Terpel";
    const generatedAt = new Date();
    const body = [
      title(programName),
      title(value(state.project?.title, "BORRADOR DEL PROYECTO")),
      paragraph(run("BORRADOR PRELIMINAR — DOCUMENTO ACADÉMICO COLABORATIVO", { bold: true, color: COLORS.danger }), { align: "center", after: 50 }),
      paragraph(run("Se genera con la información guardada en el portal y permanece sujeto a revisión del equipo y los docentes.", { bold: true, color: COLORS.danger }), { align: "center", after: 50 }),
      paragraph(run(`Generado el ${formatDateTime(generatedAt)} · Estado: ${projectStatusLabels[state.project?.status] || "Borrador"}`, { color: COLORS.muted }), { align: "center", after: 180 }),
      sectionGeneral(data),
      sectionDiagnosis(state),
      sectionObjectives(state),
      sectionAlternatives(state),
      sectionActions(state),
      sectionPeople(state),
      sectionIndicators(state),
      sectionPrototype(state),
      sectionDeliverables(state),
      sectionComments(state),
    ].join("");
    const sectionProperties = '<w:sectPr><w:headerReference w:type="default" r:id="rId11"/><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1800" w:bottom="1440" w:left="1800" w:header="720" w:footer="720" w:gutter="0"/><w:cols w:space="720"/><w:docGrid w:linePitch="360"/></w:sectPr>';
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body}${sectionProperties}</w:body></w:document>`;
  }

  function buildCoreProperties(data) {
    const now = new Date().toISOString();
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${escapeXml(value(data.state?.project?.title, "Borrador académico"))}</dc:title><dc:subject>${escapeXml(data.config?.siteName || "Diplomado en Habilidades de Gerencia Media")}</dc:subject><dc:creator>${escapeXml(value(data.state?.team?.name, "Equipo del diplomado"))}</dc:creator><cp:lastModifiedBy>Portal académico colaborativo</cp:lastModifiedBy><cp:revision>1</cp:revision><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`;
  }

  function slug(input) {
    return value(input, "proyecto").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "proyecto";
  }

  async function createDraftBlob(data, options = {}) {
    if (typeof global.JSZip !== "function") throw new Error("No se pudo cargar el generador de documentos Word.");
    const response = await fetch(new URL(options.templatePath || TEMPLATE_PATH, document.baseURI), { cache: "no-store" });
    if (!response.ok) throw new Error("No se pudo cargar la plantilla institucional.");
    const zip = await global.JSZip.loadAsync(await response.arrayBuffer());
    zip.file("word/document.xml", buildDocumentXml(data));
    zip.file("docProps/core.xml", buildCoreProperties(data));
    return zip.generateAsync({ type: "blob", mimeType: DOCX_MIME, compression: "DEFLATE", compressionOptions: { level: 6 } });
  }

  async function downloadDraft(data, options = {}) {
    const blob = await createDraftBlob(data, options);
    const date = new Date().toISOString().slice(0, 10);
    const filename = `Borrador-${slug(data.state?.project?.title)}-${date}.docx`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    return filename;
  }

  global.WordExporter = { buildDocumentXml, buildCoreProperties, createDraftBlob, downloadDraft };
})(typeof window !== "undefined" ? window : globalThis);
