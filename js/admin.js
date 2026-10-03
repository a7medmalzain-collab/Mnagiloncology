const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let token = sessionStorage.getItem("tk"), S = {}, D = {}, cur = "overview", editing = null;
const api = async (url, method = "GET", body) => {
  const r = await fetch("/api/" + url, { method, headers: { "content-type": "application/json", authorization: "Bearer " + token }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && url !== "login") { logout(); throw new Error("انتهت الجلسة"); }
  if (!r.ok) throw new Error(d.error || "خطأ");
  return d;
};
function logout() { sessionStorage.removeItem("tk"); location.reload(); }
$("#out").onclick = logout;
$("#lf").onsubmit = async (e) => {
  e.preventDefault();
  try { token = (await api("login", "POST", Object.fromEntries(new FormData(e.target)))).token; sessionStorage.setItem("tk", token); start(); }
  catch (x) { $("#lm").innerHTML = `<div class="msg err">${esc(x.message)}</div>`; }
};
async function start() {
  S = await api("schema");
  await Promise.all(Object.keys(S).map(async (k) => (D[k] = await api(k))));
  $("#login").hidden = true; $("#app").hidden = false;
  $("#menu").innerHTML = '<button data-k="overview">الرئيسية</button>' + Object.entries(S).map(([k, v]) => `<button data-k="${k}">${esc(v.l)}</button>`).join("");
  show(cur);
}
$("#menu").onclick = (e) => { if (e.target.dataset.k) { show(e.target.dataset.k); $("#side").classList.remove("open"); } };
$("#mb").onclick = () => $("#side").classList.toggle("open");
const label = (f, v) => { if (f[2] === "ref") { const r = (D[f[4]] || []).find((x) => x.id === v); return r ? r.name || r.patient_name : "-"; } if (f[2] === "bool") return v ? "نعم" : "لا"; return v ?? ""; };
function show(k) {
  cur = k;
  document.querySelectorAll("#menu button").forEach((b) => b.classList.toggle("on", b.dataset.k === k));
  const ov = k === "overview";
  $("#ov").hidden = !ov; $("#list").hidden = ov; $("#add").hidden = ov;
  if (ov) return overview();
  $("#title").textContent = S[k].l; $("#q").value = "";
  const sf = S[k].f.find((f) => f[0] === "status");
  $("#flt").hidden = !sf;
  if (sf) $("#flt").innerHTML = '<option value="">كل الحالات</option>' + sf[4].map((o) => `<option>${esc(o)}</option>`).join(""); 
  render();
}
function overview() {
  $("#title").textContent = "الرئيسية";
  const today = new Date().toISOString().slice(0, 10), A = D.appointments || [];
  const cards = [
    ["طلبات حجز جديدة", A.filter((x) => x.status === "جديد").length, "appointments", "جديد"],
    ["مواعيد اليوم", A.filter((x) => x.date === today && x.status !== "ملغي").length, "appointments", ""],
    ["رسائل جديدة", (D.messages || []).filter((x) => x.status === "جديد").length, "messages", "جديد"],
    ["متابعات متأخرة", (D.follow_ups || []).filter((x) => x.status === "متأخر" || (x.status === "نشط" && x.next_visit && x.next_visit < today)).length, "follow_ups", ""],
    ["المرضى", (D.patients || []).length, "patients", ""],
    ["الأطباء", (D.doctors || []).length, "doctors", ""],
  ];
  $("#ov").innerHTML = cards.map(([l, n, k, st]) => `<button class="card stat" data-k="${k}" data-st="${st}"><b>${n}</b>${esc(l)}</button>`).join("");
}
$("#ov").onclick = (e) => { const b = e.target.closest("[data-k]"); if (b) { show(b.dataset.k); if (b.dataset.st) { $("#flt").value = b.dataset.st; render(); } } };
function render() {
  const f = S[cur].f, cols = f.filter((x) => x[2] !== "textarea").slice(0, 5), q = $("#q").value.trim().toLowerCase(), st = $("#flt").value;
  let rows = D[cur].filter((r) => (!st || r.status === st) && (!q || JSON.stringify(f.map((x) => label(x, r[x[0]]))).toLowerCase().includes(q)));
  $("#th").innerHTML = "<tr>" + cols.map((c) => `<th>${esc(c[1])}</th>`).join("") + "<th></th></tr>";
  $("#tb").innerHTML = rows.length ? rows.map((r) => "<tr>" + cols.map((c) => c[0] === "status" ? `<td><select data-id="${r.id}" class="st">${c[4].map((o) => `<option${o === r.status ? " selected" : ""}>${esc(o)}</option>`).join("")}</select></td>` : `<td>${esc(label(c, r[c[0]]))}</td>`).join("") + `<td><div class="row"><button class="btn sm ghost" data-e="${r.id}">تعديل</button><button class="btn sm danger" data-d="${r.id}">حذف</button></div></td></tr>`).join("") : `<tr><td colspan="${cols.length + 1}">لا توجد بيانات. اضغط "إضافة" لإنشاء أول سجل.</td></tr>`;
}
$("#q").oninput = render; $("#flt").onchange = render;
$("#tb").onchange = async (e) => {
  if (!e.target.classList.contains("st")) return;
  try { const r = await api(`${cur}/${e.target.dataset.id}`, "PUT", { status: e.target.value }); D[cur] = D[cur].map((x) => (x.id === r.id ? r : x)); } catch (x) { alert(x.message); render(); }
};
$("#tb").onclick = async (e) => {
  if (e.target.dataset.e) openForm(D[cur].find((x) => x.id === e.target.dataset.e));
  if (e.target.dataset.d && confirm("هل تريد حذف هذا السجل نهائيًا؟")) {
    try { await api(`${cur}/${e.target.dataset.d}`, "DELETE"); D[cur] = D[cur].filter((x) => x.id !== e.target.dataset.d); render(); } catch (x) { alert(x.message); }
  }
};
$("#add").onclick = () => openForm(null);
function openForm(rec) {
  editing = rec;
  $("#ef").innerHTML = `<h3>${rec ? "تعديل" : "إضافة"} — ${esc(S[cur].l)}</h3>` + S[cur].f.map(([k, l, t, req, o]) => {
    const v = rec ? rec[k] : "", r = req ? " required" : "";
    let inp;
    if (t === "textarea") inp = `<textarea name="${k}"${r}>${esc(v)}</textarea>`;
    else if (t === "bool") return `<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="${k}" style="width:auto;min-height:0"${v || (!rec && k !== "public") ? " checked" : ""}>${esc(l)}</label>`;
    else if (t === "select") inp = `<select name="${k}"${r}><option value=""></option>${o.map((x) => `<option${x === v ? " selected" : ""}>${esc(x)}</option>`).join("")}</select>`;
    else if (t === "ref") inp = `<select name="${k}"${r}><option value=""></option>${(D[o] || []).map((x) => `<option value="${x.id}"${x.id === v ? " selected" : ""}>${esc(x.name || x.patient_name)}</option>`).join("")}</select>`;
    else inp = `<input name="${k}" type="${t === "num" ? "number" : t}"${r} value="${esc(v)}">`;
    return `<label>${esc(l)}${inp}</label>`;
  }).join("") + '<div id="em"></div><div class="row"><button class="btn">حفظ</button><button type="button" class="btn ghost" id="cl">إلغاء</button></div>';
  $("#cl").onclick = () => $("#dlg").close();
  $("#dlg").showModal();
}
$("#ef").onsubmit = async (e) => {
  e.preventDefault();
  const d = {}; S[cur].f.forEach(([k, , t]) => { const el = e.target.elements[k]; d[k] = t === "bool" ? el.checked : el.value; });
  try {
    const r = editing ? await api(`${cur}/${editing.id}`, "PUT", d) : await api(cur, "POST", d);
    D[cur] = editing ? D[cur].map((x) => (x.id === r.id ? r : x)) : [r, ...D[cur]];
    $("#dlg").close(); render();
  } catch (x) { $("#em").innerHTML = `<div class="msg err">${esc(x.message)}</div>`; }
};
if (token) start().catch(() => {});
