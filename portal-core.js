(function () {
  const config = window.PORTAL_CONFIG || {};
  const configured = /^https:\/\/.+\.supabase\.co$/.test(config.supabaseUrl || "") && !String(config.supabasePublishableKey || "").includes("REEMPLAZAR");
  const client = configured ? window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  }) : null;

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  const shortDate = (value) => value ? new Date(value).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) : "Por definir";
  const money = (value) => Number(value || 0).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
  const uuid = () => crypto.randomUUID();

  function toast(message, tone = "success") {
    let element = document.querySelector("#global-toast");
    if (!element) {
      element = document.createElement("div");
      element.id = "global-toast";
      element.className = "toast hidden";
      document.body.appendChild(element);
    }
    element.className = `toast ${tone}`;
    element.textContent = `${tone === "error" ? "!" : "✓"} ${message}`;
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => element.classList.add("hidden"), 3300);
  }

  function setBusy(button, busy, label = "Guardando…") {
    if (!button) return;
    if (busy) { button.dataset.label = button.textContent; button.textContent = label; button.disabled = true; }
    else { button.textContent = button.dataset.label || button.textContent; button.disabled = false; }
  }

  function setupPanel() {
    return `<section class="setup-panel"><div class="setup-icon">DB</div><span class="eyebrow">Configuración requerida</span><h2>Conecte la base académica</h2><p>El portal está construido, pero todavía no tiene un proyecto Supabase asociado. Configure la <strong>Project URL</strong> y la <strong>Publishable key</strong> en <code>config.js</code>.</p><div class="security-note"><strong>Importante:</strong> la publishable key puede estar en GitHub Pages. La seguridad está en las políticas RLS. Nunca use aquí la clave <code>service_role</code>.</div><a class="primary-btn button-link" href="CONFIGURAR-SUPABASE.md">Ver instrucciones</a></section>`;
  }

  window.Portal = { config, configured, supabase: client, escapeHtml, shortDate, money, uuid, toast, setBusy, setupPanel };
})();
