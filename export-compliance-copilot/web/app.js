const $ = (selector) => document.querySelector(selector);
let cases = [];
let selectedId = null;
const labels = {
  INFORMATION_REQUIRED: "INFORMATIONEN OFFEN",
  HUMAN_REVIEW_REQUIRED: "MENSCHLICHE PRÜFUNG",
  READY_FOR_HUMAN_REVIEW: "BEREIT FÜR PRÜFUNG",
  approved_by_reviewer: "MENSCHLICH FREIGEGEBEN",
  rejected_by_reviewer: "MENSCHLICH ABGELEHNT",
  more_information_requested: "RÜCKFRAGE GESTELLT",
};
const outcomeClass = (c) => c.status !== "open" ? "reviewed" : c.evaluation.outcome === "READY_FOR_HUMAN_REVIEW" ? "ready" : c.evaluation.outcome === "HUMAN_REVIEW_REQUIRED" ? "review" : "information";

async function request(path, options = {}) {
  const response = await fetch(path, { headers: { "Content-Type": "application/json" }, ...options });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Anfrage fehlgeschlagen");
  return result;
}
const esc = (value) => String(value ?? "–").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

async function refresh() {
  cases = await request("/api/cases");
  renderMetrics();
  renderCases();
  if (selectedId && cases.some((c) => c.id === selectedId)) renderDetail(cases.find((c) => c.id === selectedId));
}
function renderMetrics() {
  const open = cases.filter((c) => c.status === "open").length;
  const questions = cases.filter((c) => c.status === "open" && c.evaluation.outcome === "INFORMATION_REQUIRED").length;
  const review = cases.filter((c) => c.status === "open" && c.evaluation.outcome === "HUMAN_REVIEW_REQUIRED").length;
  const done = cases.filter((c) => c.status !== "open").length;
  $("#metrics").innerHTML = [["Offene Fälle", open, "lime"], ["Rückfragen", questions, ""], ["Eskalationen", review, ""], ["Menschlich geprüft", done, ""]].map(([label, n, cls]) => `<div class="metric"><small>${label}</small><strong class="${cls}">${n}</strong></div>`).join("");
}
function renderCases() {
  const filter = $("#filter").value;
  const visible = cases.filter((c) => filter === "all" || (filter === "open" && c.status === "open") || (filter === "reviewed" && c.status !== "open"));
  $("#cases").innerHTML = visible.length ? visible.map((c) => `<article class="case-card ${selectedId === c.id ? "active" : ""}" data-id="${esc(c.id)}"><div class="card-top"><span class="case-ref">${esc(c.reference)}</span><span class="badge ${outcomeClass(c)}">${labels[c.status !== "open" ? c.status : c.evaluation.outcome]}</span></div><h3>${esc(c.product)}</h3><p>${esc(c.company)} · ${esc(c.destination)}</p></article>`).join("") : `<p class="muted">Keine Fälle in dieser Ansicht.</p>`;
  document.querySelectorAll(".case-card").forEach((card) => card.addEventListener("click", () => { selectedId = card.dataset.id; renderCases(); renderDetail(cases.find((c) => c.id === selectedId)); }));
}
function renderDetail(c) {
  if (!c) return;
  const e = c.evaluation;
  const review = c.review ? `<div class="review-record"><strong>${esc(labels[c.review.decision])}</strong><div>${esc(c.review.reviewer)} · ${new Date(c.review.at).toLocaleString("de-DE")}</div><p>${esc(c.review.note || "Keine Notiz")}</p></div>` : "";
  const facts = [["UNTERNEHMEN", c.company], ["PRODUKT", c.product], ["ZIELREGION", c.destination], ["ENDNUTZER", c.end_user], ["VERWENDUNGSZWECK", c.end_use], ["KLASSIFIZIERUNG", c.classification], ["SCREENING", c.restricted_party_screening], ["ZIELRISIKO", c.destination_risk], ["GENEHMIGUNG NÖTIG?", c.license_required == null ? "Noch offen" : c.license_required ? "Ja (Angabe)" : "Nein (Angabe)"], ["GENEHMIGUNGSSTATUS", c.license_status]].map(([k,v]) => `<div class="fact"><small>${k}</small><p>${esc(v || "Noch offen")}</p></div>`).join("");
  const checks = e.checks.map((check) => `<div class="check"><span class="check-result ${check.result}">${check.result}</span><div><strong>${esc(check.title)}</strong><p>${esc(check.explanation)}</p></div><span class="basis">${esc(check.basis)}</span></div>`).join("");
  const questions = e.questions.length ? `<div class="questions"><strong>Offene Rückfragen</strong><ul>${e.questions.map((q) => `<li>${esc(q)}</li>`).join("")}</ul></div>` : "";
  const audit = [...c.audit_log].reverse().map((item) => `<div class="audit-item"><time>${new Date(item.at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</time><div><strong>${esc(item.action)} · ${esc(item.actor)}</strong><p>${esc(item.detail)}</p></div></div>`).join("");
  $("#detail").innerHTML = `<div class="detail-head"><div><div class="case-ref">${esc(c.reference)} · Angelegt ${new Date(c.created_at).toLocaleDateString("de-DE")}</div><h2>${esc(c.product)}</h2><p>${esc(c.company)} · ${esc(c.destination)}</p></div><span class="badge ${outcomeClass(c)}">${labels[c.status !== "open" ? c.status : e.outcome]}</span></div><div class="outcome ${outcomeClass(c)}"><strong>${esc(labels[c.status !== "open" ? c.status : e.outcome])}</strong><p>${esc(e.summary)}</p></div><div class="detail-grid">${facts}</div><div class="block-title"><h3>Regelbasierte Prüfung</h3><small>${esc(e.ruleset_version)}</small></div><div class="checks">${checks}</div>${questions}<div class="block-title audit"><h3>Audit-Log</h3><small>${c.audit_log.length} Ereignisse</small></div><div>${audit}</div>${review}${c.status === "open" ? `<div class="review-panel"><p>Die Regeln bereiten die Prüfung vor. Eine berechtigte Person dokumentiert die Entscheidung.</p><div class="detail-actions"><button id="open-review" class="primary">Menschliche Prüfung erfassen</button></div></div>` : ""}`;
  $("#open-review")?.addEventListener("click", () => $("#review-dialog").showModal());
}
function toast(message) { const el = document.createElement("div"); el.className = "toast"; el.textContent = message; document.body.append(el); setTimeout(() => el.remove(), 2800); }

$("#new-case").addEventListener("click", () => $("#case-dialog").showModal());
$("#close-dialog").addEventListener("click", () => $("#case-dialog").close());
$("#cancel-dialog").addEventListener("click", () => $("#case-dialog").close());
$("#close-review").addEventListener("click", () => $("#review-dialog").close());
$("#cancel-review").addEventListener("click", () => $("#review-dialog").close());
$("#filter").addEventListener("change", renderCases);
$("#case-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const payload = Object.fromEntries(form.entries());
  payload.license_required = payload.license_required === "unknown" ? null : payload.license_required === "true";
  payload.license_status = payload.license_status || null;
  try { const created = await request("/api/cases", { method: "POST", body: JSON.stringify(payload) }); selectedId = created.id; event.currentTarget.reset(); $("#case-dialog").close(); await refresh(); toast("Demo-Fall angelegt und geprüft"); }
  catch (error) { toast(error.message); }
});
$("#review-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
  try { await request(`/api/cases/${selectedId}/review`, { method: "POST", body: JSON.stringify(payload) }); $("#review-dialog").close(); await refresh(); toast("Menschliche Prüfung im Audit-Log gespeichert"); }
  catch (error) { toast(error.message); }
});
refresh().catch((error) => { $("#detail").innerHTML = `<p class="error">${esc(error.message)}</p>`; });
