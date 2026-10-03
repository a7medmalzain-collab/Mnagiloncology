const WA = "249905759443";
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const waLink = (t) => `https://wa.me/${WA}?text=${encodeURIComponent(t)}`;
document.querySelectorAll("[data-wa]").forEach((a) => { a.href = waLink(a.dataset.wa); a.target = "_blank"; a.rel = "noopener"; });
$("#menu").onclick = () => { const n = $("#nav"); const o = n.classList.toggle("open"); $("#menu").setAttribute("aria-expanded", o); };
$("#nav").onclick = (e) => { if (e.target.tagName === "A") $("#nav").classList.remove("open"); };
const msg = (el, t, ok) => { el.innerHTML = `<div class="msg ${ok ? "ok" : "err"}">${t}</div>`; };
const api = async (url, opt) => { const r = await fetch(url, opt); const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || "تعذر إتمام الطلب"); return d; };
const post = (url, body) => api(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const form = (f) => Object.fromEntries(new FormData(f));

document.querySelector('[name="date"]').min = new Date().toISOString().slice(0, 10);

api("/api/public").then((d) => {
  $("#services-list").innerHTML = d.services.map((s) => `<div class="card"><h3>${esc(s.title)}</h3><p class="note" style="margin:0">${esc(s.description)}</p></div>`).join("");
  $("#doctors-list").innerHTML = d.doctors.map((x) => `<div class="card"><h3>${esc(x.name)}</h3><span class="tag">${esc(x.specialty)}</span><p class="note">${esc(x.bio)}</p></div>`).join("");
  $("#docSel").innerHTML = '<option value="">أي طبيب متاح</option>' + d.doctors.map((x) => `<option>${esc(x.name)}</option>`).join("");
  const cls = { "متوفر": "ok", "غير متوفر": "bad", "قيد التأكيد": "warn" };
  $("#meds").innerHTML = d.medications.length ? d.medications.map((m) => `<tr><td>${esc(m.name)}</td><td>${esc(m.type)}</td><td>${esc(m.use)}</td><td>${esc(m.route)}</td><td>${esc(m.notes)}</td><td><span class="tag ${cls[m.availability] || ""}">${esc(m.availability)}</span></td></tr>`).join("") : '<tr><td colspan="6">ستتم إضافة الأدوية المعتمدة من المركز قريبًا.</td></tr>';
  $("#faqs").innerHTML = d.faqs.map((f) => `<details><summary>${esc(f.question)}</summary><p>${esc(f.answer)}</p></details>`).join("");
}).catch(() => { $("#meds").innerHTML = '<tr><td colspan="6">تعذر تحميل البيانات. حاول لاحقًا.</td></tr>'; });

$("#bookForm").onsubmit = async (e) => {
  e.preventDefault();
  const f = e.target, d = form(f), out = $("#bookMsg"), b = f.querySelector("button");
  if (!f.checkValidity()) { f.reportValidity(); return; }
  b.disabled = true;
  try {
    const r = await post("/api/book", d);
    const t = `طلب حجز موعد - مركز المناقل لعلاج الأورام\nرمز الحجز: ${r.code}\nالاسم: ${d.patient_name}\nالهاتف: ${d.phone}\nالعمر: ${d.age || "-"}\nنوع الزيارة: ${d.visit_type}\nالطبيب: ${d.doctor || "أي طبيب"}\nالتاريخ: ${d.date}\nالوقت: ${d.time}\nملاحظات: ${d.notes || "-"}`;
    out.innerHTML = `<div class="msg ok">تم استلام طلبك. رمز الحجز: <b dir="ltr">${esc(r.code)}</b> — احتفظ به لمتابعة الموعد.<div class="row" style="margin-top:10px"><a class="btn wa" target="_blank" rel="noopener" href="${waLink(t)}">أرسل التفاصيل عبر WhatsApp</a></div></div>`;
    f.reset();
  } catch (x) { msg(out, esc(x.message), false); }
  b.disabled = false;
};
$("#trackForm").onsubmit = async (e) => {
  e.preventDefault();
  const d = form(e.target), out = $("#trackMsg");
  try {
    const r = await api(`/api/track?code=${encodeURIComponent(d.code)}&phone=${encodeURIComponent(d.phone)}`);
    msg(out, `الحالة: <b>${esc(r.status)}</b> — ${esc(r.visit_type)} بتاريخ ${esc(r.date)} الساعة ${esc(r.time)}`, true);
  } catch (x) { msg(out, esc(x.message), false); }
};
$("#contactForm").onsubmit = async (e) => {
  e.preventDefault();
  try { await post("/api/contact", form(e.target)); msg($("#contactMsg"), "تم إرسال رسالتك. سنتواصل معك قريبًا.", true); e.target.reset(); }
  catch (x) { msg($("#contactMsg"), esc(x.message), false); }
};
