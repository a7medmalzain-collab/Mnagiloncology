import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

// [key, label, type, required, options]
const S = {
  patients: { l: "المرضى", f: [["name","اسم المريض","text",1],["phone","الهاتف","tel"],["age","العمر","num"],["gender","النوع","select",0,["ذكر","أنثى"]],["diagnosis","التشخيص","text"],["notes","ملاحظات","textarea"]] },
  appointments: { l: "المواعيد وطلبات الحجز", f: [["patient_name","اسم المريض","text",1],["phone","الهاتف","tel",1],["age","العمر","num"],["visit_type","نوع الزيارة","select",1,["كشف جديد","متابعة","استشارة","جلسة علاج"]],["doctor","الطبيب","text"],["date","التاريخ","date",1],["time","الوقت","time",1],["status","الحالة","select",0,["جديد","مؤكد","مكتمل","ملغي"]],["notes","ملاحظات","textarea"]] },
  doctors: { l: "الأطباء", f: [["name","الاسم","text",1],["specialty","التخصص","text"],["bio","نبذة","textarea"],["active","ظاهر للعامة","bool"]] },
  medications: { l: "الأدوية", f: [["name","اسم الدواء","text",1],["type","نوع العلاج","text"],["use","الاستخدام العام","textarea"],["route","طريقة الإعطاء","text"],["notes","ملاحظات","textarea"],["availability","حالة التوفر","select",0,["متوفر","غير متوفر","قيد التأكيد"]],["public","ظاهر للعامة","bool"]] },
  protocols: { l: "بروتوكولات العلاج", f: [["name","اسم البروتوكول","text",1],["medication_id","الدواء","ref",0,"medications"],["details","التفاصيل والجرعات (بيانات المركز المعتمدة فقط)","textarea"],["approved_by","جهة الاعتماد","text"],["status","الحالة","select",0,["مسودة","معتمد"]]] },
  follow_ups: { l: "المتابعات", f: [["patient_id","المريض","ref",1,"patients"],["last_visit","آخر زيارة","date"],["next_visit","الموعد القادم","date"],["tests","الفحوصات","textarea"],["plan","خطة المتابعة","textarea"],["notes","ملاحظات","textarea"],["status","حالة المتابعة","select",0,["نشط","متأخر","مكتمل"]]] },
  faqs: { l: "الأسئلة الشائعة", f: [["question","السؤال","text",1],["answer","الإجابة","textarea",1],["active","ظاهر للعامة","bool"]] },
  services: { l: "الخدمات", f: [["title","اسم الخدمة","text",1],["description","الوصف","textarea"],["active","ظاهرة للعامة","bool"]] },
  messages: { l: "رسائل التواصل", f: [["name","الاسم","text",1],["phone","الهاتف","tel"],["message","الرسالة","textarea",1],["status","الحالة","select",0,["جديد","تمت القراءة"]]] },
};

const J = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const sign = (p) => { const b = Buffer.from(JSON.stringify(p)).toString("base64url"); return b + "." + crypto.createHmac("sha256", process.env.JWT_SECRET).update(b).digest("base64url"); };
const authed = (req) => {
  if (!process.env.JWT_SECRET) return false;
  const t = (req.headers.get("authorization") || "").replace("Bearer ", "");
  const [b, s] = t.split(".");
  if (!b || !s) return false;
  const e = crypto.createHmac("sha256", process.env.JWT_SECRET).update(b).digest("base64url");
  if (s.length !== e.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(e))) return false;
  try { return JSON.parse(Buffer.from(b, "base64url")).exp > Date.now(); } catch { return false; }
};

function clean(col, body, partial) {
  const out = {};
  for (const [k, , t, req, o] of S[col].f) {
    let v = body[k];
    if (v === undefined || v === null || v === "") {
      if (req && !partial) throw new Error("حقل مطلوب: " + k);
      if (t === "bool") out[k] = false; else if (!partial) out[k] = "";
      continue;
    }
    if (t === "bool") { out[k] = v === true || v === "true"; continue; }
    v = String(v).trim();
    if (v.length > (t === "textarea" ? 2000 : 200)) throw new Error("نص طويل: " + k);
    if (t === "tel" && !/^[0-9+\s-]{6,20}$/.test(v)) throw new Error("رقم هاتف غير صحيح");
    if (t === "num" && !(/^\d{1,3}$/.test(v) && +v <= 120)) throw new Error("قيمة رقمية غير صحيحة: " + k);
    if (t === "date" && !/^\d{4}-\d\d-\d\d$/.test(v)) throw new Error("تاريخ غير صحيح");
    if (t === "time" && !/^\d\d:\d\d$/.test(v)) throw new Error("وقت غير صحيح");
    if (t === "select" && !o.includes(v)) throw new Error("خيار غير صحيح: " + k);
    out[k] = v;
  }
  return out;
}
async function list(col) {
  const st = getStore(col);
  const { blobs } = await st.list();
  const rows = await Promise.all(blobs.map((b) => st.get(b.key, { type: "json" })));
  return rows.filter(Boolean).sort((a, b) => (b.created || "").localeCompare(a.created || ""));
}
async function save(col, id, data) {
  const rec = { ...data, id, created: data.created || new Date().toISOString() };
  await getStore(col).setJSON(id, rec);
  return rec;
}
async function seed() {
  const meta = getStore("meta");
  if (await meta.get("seeded")) return;
  await meta.set("seeded", "1");
  await save("doctors", "d1", { name: "د. عبد الكريم وداعة إبراهيم", specialty: "طبيب مختص بعلاج الأورام", bio: "يقدم الكشف والمتابعة ووضع الخطة العلاجية لمرضى الأورام. (عدّل هذه النبذة من لوحة التحكم)", active: true });
  const sv = [["الكشف والاستشارة","تقييم الحالة ومناقشة الخطة العلاجية."],["العلاج الكيميائي","جلسات العلاج تحت إشراف الفريق الطبي."],["المتابعة الدورية","مواعيد وفحوصات متابعة بعد العلاج."],["التوعية والتثقيف","معلومات مبسطة للمرضى وأسرهم."]];
  for (const [i, [title, description]] of sv.entries()) await save("services", "s" + i, { title, description, active: true });
  await save("faqs", "f1", { question: "كيف أحجز موعدًا؟", answer: "عبر نموذج الحجز في الموقع أو عبر WhatsApp، وسيتواصل معك المركز لتأكيد الموعد.", active: true });
}

export default async (req) => {
  const u = new URL(req.url);
  const p = u.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  const m = req.method;
  try {
    let body = {};
    if (m === "POST" || m === "PUT") {
      const t = await req.text();
      if (t.length > 20000) return J({ error: "الطلب كبير" }, 413);
      try { body = JSON.parse(t || "{}"); } catch { return J({ error: "بيانات غير صالحة" }, 400); }
    }
    if (p[0] === "login" && m === "POST") {
      const pw = String(body.password || "");
      const ap = process.env.ADMIN_PASSWORD;
      const ok = ap && process.env.JWT_SECRET && pw.length === ap.length && crypto.timingSafeEqual(Buffer.from(pw), Buffer.from(ap));
      if (!ok) { await new Promise((r) => setTimeout(r, 800)); return J({ error: "كلمة المرور غير صحيحة" }, 401); }
      return J({ token: sign({ exp: Date.now() + 12 * 3600e3 }) });
    }
    if (p[0] === "public" && m === "GET") {
      await seed();
      const [doctors, services, faqs, meds] = await Promise.all(["doctors", "services", "faqs", "medications"].map(list));
      return J({
        doctors: doctors.filter((x) => x.active),
        services: services.filter((x) => x.active).reverse(),
        faqs: faqs.filter((x) => x.active).reverse(),
        medications: meds.filter((x) => x.public).map(({ name, type, use, route, notes, availability }) => ({ name, type, use, route, notes, availability })),
      });
    }
    if (p[0] === "book" && m === "POST") {
      const d = clean("appointments", body);
      d.status = "جديد";
      const code = "MO-" + new Date().getFullYear() + "-" + String(crypto.randomInt(0, 10000)).padStart(4, "0");
      await save("appointments", code, { ...d, code });
      return J({ ok: true, code }, 201);
    }
    if (p[0] === "contact" && m === "POST") {
      const d = clean("messages", body);
      d.status = "جديد";
      await save("messages", crypto.randomUUID(), d);
      return J({ ok: true }, 201);
    }
    if (p[0] === "track" && m === "GET") {
      const code = (u.searchParams.get("code") || "").trim().toUpperCase();
      const phone = (u.searchParams.get("phone") || "").replace(/\D/g, "");
      const r = /^MO-\d{4}-\d{4}$/.test(code) ? await getStore("appointments").get(code, { type: "json" }) : null;
      if (!r || !phone || r.phone.replace(/\D/g, "") !== phone) return J({ error: "لم يتم العثور على الطلب. تحقق من الرمز ورقم الهاتف." }, 404);
      return J({ code: r.code, status: r.status, date: r.date, time: r.time, visit_type: r.visit_type, doctor: r.doctor });
    }
    // ---- Admin only ----
    if (!authed(req)) return J({ error: "غير مصرح" }, 401);
    if (p[0] === "schema") return J(S);
    const c = p[0];
    if (!S[c]) return J({ error: "غير موجود" }, 404);
    if (m === "GET") return J(await list(c));
    if (m === "POST") return J(await save(c, crypto.randomUUID(), clean(c, body)), 201);
    if (m === "PUT" && p[1]) {
      const old = await getStore(c).get(p[1], { type: "json" });
      if (!old) return J({ error: "غير موجود" }, 404);
      return J(await save(c, p[1], { ...old, ...clean(c, body, true) }));
    }
    if (m === "DELETE" && p[1]) { await getStore(c).delete(p[1]); return J({ ok: true }); }
    return J({ error: "طلب غير مدعوم" }, 405);
  } catch (e) {
    const known = /^(حقل|نص|رقم|قيمة|تاريخ|وقت|خيار)/.test(e.message);
    if (!known) console.error(e);
    return J({ error: known ? e.message : "خطأ في الخادم" }, known ? 400 : 500);
  }
};
export const config = { path: "/api/*" };
