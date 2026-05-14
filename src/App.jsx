import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ── NWA Brand ─────────────────────────────────────────────────
const BRAND = {
  nameEn: "National Water Alliance",
  nameAr: "التحالف الوطني للمياه",
  shortEn: "NWA",
  shortAr: "نواة",
  taglineEn: "IT Support Portal",
  taglineAr: "بوابة الدعم التقني",
  primary: "#1a5fa8",
  primaryDark: "#0d3d6e",
  primaryLight: "#e8f1fb",
  green: "#5a9e3f",
  navy: "#0d2137",
};

const CATEGORIES_EN = ["Hardware", "Software", "Network", "Access & Permissions", "Other"];
const CATEGORIES_AR = ["أجهزة", "برمجيات", "شبكة", "الصلاحيات والوصول", "أخرى"];
const PRIORITIES    = ["Low", "Medium", "High", "Critical"];
const PRIORITIES_AR = ["منخفض", "متوسط", "عالي", "حرج"];
const STATUSES      = ["Open", "In Progress", "Resolved", "Closed"];
const STATUSES_AR   = ["مفتوح", "قيد المعالجة", "محلول", "مغلق"];

const PRIORITY_COLOR = { Low: "#16a34a", Medium: "#d97706", High: "#ea580c", Critical: "#dc2626" };
const STATUS_COLOR   = { Open: "#1a5fa8", "In Progress": "#7c3aed", Resolved: "#16a34a", Closed: "#64748b" };

function genId(list) {
  const max = Math.max(...list.map(t => parseInt(t.id.replace("TK-", ""))), 0);
  return `TK-${String(max + 1).padStart(3, "0")}`;
}

function Badge({ label, color }) {
  return (
    <span style={{ background: color + "18", color, border: `1px solid ${color}30`, borderRadius: 5, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>
      {label}
    </span>
  );
}

function Toast({ msg, color }) {
  return (
    <div style={{ position: "fixed", top: 24, right: 24, zIndex: 9999, background: color || BRAND.primary, color: "#fff", padding: "12px 20px", borderRadius: 8, fontWeight: 600, fontSize: 14, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
      {msg}
    </div>
  );
}

function Spinner({ color }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
      <div style={{ width: 32, height: 32, border: `3px solid #e2e8f0`, borderTop: `3px solid ${color || BRAND.primary}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );
}

export default function App() {
  const [tab, setTab]             = useState("submit");
  const [toast, setToast]         = useState(null);
  const [loading, setLoading]     = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [foundTicket, setFoundTicket] = useState(null);
  const [trackError, setTrackError]   = useState("");
  const [trackInput, setTrackInput]   = useState("");
  const [dark, setDark]           = useState(false);
  const [lang, setLang]           = useState("en");

  const [form, setForm] = useState({
    name: "", email: "", title: "",
    category: CATEGORIES_EN[0], priority: "Medium", description: ""
  });

  const t  = (en, ar) => lang === "ar" ? ar : en;
  const isAr = lang === "ar";

  const bg      = dark ? "#0f172a" : "#f8fafc";
  const surface = dark ? "#1e293b" : "#ffffff";
  const border  = dark ? "#334155" : "#e2e8f0";
  const text    = dark ? "#f1f5f9" : "#0f172a";
  const muted   = dark ? "#94a3b8" : "#64748b";
  const inputBg = dark ? "#0f172a" : "#f8fafc";

  const inputStyle = {
    width: "100%", background: inputBg, border: `1px solid ${border}`,
    borderRadius: 8, padding: "11px 14px", color: text, fontSize: 14,
    outline: "none", boxSizing: "border-box", marginBottom: 14,
    fontFamily: "inherit", transition: "border 0.2s",
  };
  const labelStyle = {
    display: "block", marginBottom: 5, fontSize: 12,
    color: muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5,
  };

  function notify(msg, color) {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 4000);
  }

  async function submitTicket() {
    if (!form.name.trim() || !form.email.trim() || !form.title.trim()) {
      return notify(t("⚠️ Name, email and title are required.", "⚠️ الاسم والبريد الإلكتروني والعنوان مطلوبة."), "#d97706");
    }
    setLoading(true);
    const { data: existing } = await supabase.from("tickets").select("id");
    const newTicket = {
      id: genId(existing || []),
      title: form.title,
      email: form.email,
      category: form.category,
      priority: form.priority,
      description: form.description,
      status: "Open",
      agent: "Unassigned",
      created: new Date().toISOString().slice(0, 10),
      comments: [],
    };
    const { error } = await supabase.from("tickets").insert([newTicket]);
    if (error) {
      notify(t("❌ Failed to submit. Please try again.", "❌ فشل الإرسال. حاول مجدداً."), "#dc2626");
      setLoading(false);
      return;
    }
    try {
      await fetch("/api/send-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: form.email,
          ticketId: newTicket.id,
          title: newTicket.title,
          priority: newTicket.priority,
          category: newTicket.category,
          description: newTicket.description,
        }),
      });
    } catch (e) { console.log("Email error:", e); }
    setSubmitted(newTicket);
    setLoading(false);
  }

  async function trackTicket() {
    if (!trackInput.trim()) return;
    setLoading(true);
    setFoundTicket(null);
    setTrackError("");
    const isId = trackInput.toUpperCase().startsWith("TK-");
    const { data, error } = await supabase
      .from("tickets").select("*")
      .eq(isId ? "id" : "email", isId ? trackInput.toUpperCase() : trackInput.toLowerCase());
    if (error || !data || data.length === 0) {
      setTrackError(t("No ticket found. Please check your ticket ID or email.", "لم يتم العثور على تذكرة. تحقق من الرقم أو البريد الإلكتروني."));
    } else {
      setFoundTicket(isId ? data[0] : data);
    }
    setLoading(false);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Tajawal:wght@300;400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${bg}; color: ${text}; font-family: ${isAr ? "'Tajawal'" : "'Inter'"}, sans-serif; direction: ${isAr ? "rtl" : "ltr"}; min-height: 100vh; transition: background 0.2s; }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:none } }
        .tab-hover:hover { background: ${dark ? "rgba(255,255,255,0.06)" : "rgba(26,95,168,0.06)"} !important; }
        input:focus, select:focus, textarea:focus { border-color: ${BRAND.primary} !important; box-shadow: 0 0 0 3px ${BRAND.primary}18; }
        .track-input:focus { border-color: ${BRAND.primary} !important; }
      `}</style>

      {toast && <Toast msg={toast.msg} color={toast.color} />}

      {/* ── HEADER ── */}
      <header style={{ background: dark ? BRAND.navy : BRAND.primary, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px", height: 64, display: "flex", alignItems: "center", gap: 16 }}>

          {/* Logo + Name */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
            <div style={{ width: 40, height: 40, background: "#fff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
              <img src="/nwa-logo.png" alt="NWA" style={{ width: 36, height: 36, objectFit: "contain" }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
                {isAr ? BRAND.shortAr : BRAND.shortEn}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)" }}>
                {isAr ? BRAND.taglineAr : BRAND.taglineEn}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setLang(l => l === "en" ? "ar" : "en")} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.1)", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: "inherit" }}>
              {lang === "en" ? "عربي" : "English"}
            </button>
            <button onClick={() => setDark(d => !d)} style={{ width: 34, height: 34, borderRadius: 6, border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.1)", color: "#fff", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {dark ? "☀️" : "🌙"}
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <div style={{ background: dark ? "#162032" : BRAND.primaryLight, borderBottom: `1px solid ${border}`, padding: "48px 24px 40px", textAlign: "center" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: dark ? "rgba(26,95,168,0.3)" : "rgba(26,95,168,0.1)", border: `1px solid ${BRAND.primary}30`, borderRadius: 20, padding: "5px 14px", marginBottom: 16 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#16a34a", display: "inline-block" }} />
            <span style={{ fontSize: 12, color: BRAND.primary, fontWeight: 600 }}>{t("Support team is online", "فريق الدعم متاح الآن")}</span>
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 700, color: dark ? "#f1f5f9" : BRAND.navy, marginBottom: 10, lineHeight: 1.3 }}>
            {t("IT Support Center", "مركز الدعم التقني")}
          </h1>
          <p style={{ fontSize: 15, color: dark ? "#94a3b8" : "#475569", lineHeight: 1.7, maxWidth: 480, margin: "0 auto" }}>
            {t(
              "Submit a support request or track an existing ticket. Our IT team responds within 2-4 business hours.",
              "أرسل طلب دعم أو تتبع تذكرة موجودة. يستجيب فريقنا التقني خلال 2-4 ساعات عمل."
            )}
          </p>

          {/* Stats bar */}
          <div style={{ display: "flex", justifyContent: "center", gap: 32, marginTop: 28 }}>
            {[
              { label: t("Avg. Response", "متوسط الاستجابة"), value: "2h" },
              { label: t("Resolved Today", "محلول اليوم"), value: "94%" },
              { label: t("Team Online", "الفريق متاح"), value: "24/7" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: BRAND.primary }}>{s.value}</div>
                <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ maxWidth: 760, margin: "32px auto", padding: "0 24px 48px" }}>

        {/* Tabs */}
        <div style={{ display: "flex", background: surface, borderRadius: 10, padding: 4, marginBottom: 28, border: `1px solid ${border}`, boxShadow: dark ? "none" : "0 1px 4px rgba(0,0,0,0.06)" }}>
          {[
            { id: "submit", en: "🎫 Submit a Ticket", ar: "🎫 إرسال تذكرة" },
            { id: "track",  en: "🔍 Track My Ticket", ar: "🔍 تتبع تذكرتي" },
          ].map(tb => (
            <button key={tb.id} className="tab-hover" onClick={() => { setTab(tb.id); setSubmitted(null); setFoundTicket(null); setTrackError(""); }}
              style={{
                flex: 1, padding: "11px 0", border: "none", borderRadius: 8,
                cursor: "pointer", fontWeight: 600, fontSize: 14,
                fontFamily: "inherit", transition: "all 0.15s",
                background: tab === tb.id ? BRAND.primary : "transparent",
                color: tab === tb.id ? "#fff" : muted,
                boxShadow: tab === tb.id ? "0 2px 8px rgba(26,95,168,0.3)" : "none",
              }}>
              {isAr ? tb.ar : tb.en}
            </button>
          ))}
        </div>

        {/* ── SUBMIT TAB ── */}
        {tab === "submit" && (
          <div style={{ animation: "fadeUp 0.3s ease" }}>
            {submitted ? (
              // Success
              <div style={{ background: surface, borderRadius: 16, padding: 48, textAlign: "center", border: `1px solid ${border}`, boxShadow: dark ? "none" : "0 2px 12px rgba(0,0,0,0.06)" }}>
                <div style={{ width: 64, height: 64, background: "#dcfce7", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 28 }}>✅</div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: text, marginBottom: 8 }}>
                  {t("Request Submitted Successfully!", "تم إرسال الطلب بنجاح!")}
                </h2>
                <p style={{ color: muted, fontSize: 14, marginBottom: 28, lineHeight: 1.7 }}>
                  {t("A confirmation email has been sent to", "تم إرسال بريد تأكيد إلى")} <strong style={{ color: text }}>{submitted.email}</strong>
                </p>

                {/* Ticket ID box */}
                <div style={{ background: dark ? "#0f172a" : BRAND.primaryLight, border: `2px solid ${BRAND.primary}30`, borderRadius: 12, padding: "20px 32px", display: "inline-block", marginBottom: 28, minWidth: 240 }}>
                  <div style={{ fontSize: 12, color: muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                    {t("Your Ticket Number", "رقم تذكرتك")}
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: BRAND.primary, letterSpacing: 1 }}>{submitted.id}</div>
                  <div style={{ fontSize: 12, color: muted, marginTop: 6 }}>
                    {t("Save this to track your request", "احفظ هذا الرقم لتتبع طلبك")}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 32 }}>
                  <Badge label={submitted.priority} color={PRIORITY_COLOR[submitted.priority]} />
                  <Badge label={submitted.category} color={muted} />
                  <Badge label="Open" color={STATUS_COLOR["Open"]} />
                </div>

                {/* What happens next */}
                <div style={{ background: dark ? "#0f172a" : "#f8fafc", borderRadius: 10, padding: 20, marginBottom: 28, textAlign: isAr ? "right" : "left", border: `1px solid ${border}` }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: text, marginBottom: 12 }}>{t("What happens next?", "ماذا يحدث بعد ذلك؟")}</div>
                  {[
                    t("Our team will review your request shortly", "سيراجع فريقنا طلبك قريباً"),
                    t("You'll receive updates via email", "ستتلقى تحديثات عبر البريد الإلكتروني"),
                    t("Use your ticket number to track progress", "استخدم رقم تذكرتك لتتبع التقدم"),
                  ].map((step, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, fontSize: 13, color: muted }}>
                      <span style={{ width: 20, height: 20, background: BRAND.primary, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                      {step}
                    </div>
                  ))}
                </div>

                <button onClick={() => { setSubmitted(null); setForm({ name: "", email: "", title: "", category: CATEGORIES_EN[0], priority: "Medium", description: "" }); }}
                  style={{ padding: "11px 28px", background: BRAND.primary, border: "none", borderRadius: 8, color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>
                  {t("Submit Another Request", "إرسال طلب آخر")}
                </button>
              </div>
            ) : (
              // Form
              <div style={{ background: surface, borderRadius: 16, padding: 36, border: `1px solid ${border}`, boxShadow: dark ? "none" : "0 2px 12px rgba(0,0,0,0.06)" }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: text, marginBottom: 4 }}>
                  {t("Submit a Support Request", "إرسال طلب دعم")}
                </h2>
                <p style={{ color: muted, fontSize: 13, marginBottom: 28, lineHeight: 1.6 }}>
                  {t("Please fill in the details below and our IT team will get back to you shortly.", "يرجى ملء التفاصيل أدناه وسيتواصل معك فريقنا التقني قريباً.")}
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>{t("Full Name *", "الاسم الكامل *")}</label>
                    <input style={inputStyle} placeholder={t("John Smith", "أحمد محمد")} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t("Email Address *", "البريد الإلكتروني *")}</label>
                    <input style={inputStyle} type="email" placeholder="you@nwa.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                </div>

                <label style={labelStyle}>{t("Issue Title *", "عنوان المشكلة *")}</label>
                <input style={inputStyle} placeholder={t("Brief description of your issue", "وصف مختصر للمشكلة")} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>{t("Category", "الفئة")}</label>
                    <select style={inputStyle} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                      {CATEGORIES_EN.map((c, i) => <option key={c} value={c}>{isAr ? CATEGORIES_AR[i] : c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>{t("Priority", "الأولوية")}</label>
                    <select style={inputStyle} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                      {PRIORITIES.map((p, i) => <option key={p} value={p}>{isAr ? PRIORITIES_AR[i] : p}</option>)}
                    </select>
                  </div>
                </div>

                {/* Priority guide */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 16 }}>
                  {PRIORITIES.map((p, i) => (
                    <div key={p} style={{ background: dark ? "#0f172a" : "#f8fafc", borderRadius: 6, padding: "8px 10px", border: `1px solid ${form.priority === p ? PRIORITY_COLOR[p] : border}`, cursor: "pointer", transition: "border 0.15s" }} onClick={() => setForm(f => ({ ...f, priority: p }))}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: PRIORITY_COLOR[p], marginBottom: 2 }}>{isAr ? PRIORITIES_AR[i] : p}</div>
                      <div style={{ fontSize: 10, color: muted, lineHeight: 1.3 }}>
                        {p === "Low" && t("Minor issue", "مشكلة بسيطة")}
                        {p === "Medium" && t("Normal issue", "مشكلة عادية")}
                        {p === "High" && t("Affects work", "يؤثر على العمل")}
                        {p === "Critical" && t("Work stopped", "العمل متوقف")}
                      </div>
                    </div>
                  ))}
                </div>

                <label style={labelStyle}>{t("Description", "الوصف")}</label>
                <textarea style={{ ...inputStyle, minHeight: 110, resize: "vertical" }}
                  placeholder={t("Please describe your issue in detail. Include any error messages or steps to reproduce.", "يرجى وصف مشكلتك بالتفصيل. أضف أي رسائل خطأ أو خطوات لإعادة المشكلة.")}
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />

                <button onClick={submitTicket} disabled={loading} style={{
                  width: "100%", padding: "13px 0", border: "none", borderRadius: 8,
                  color: "#fff", cursor: loading ? "not-allowed" : "pointer",
                  fontWeight: 600, fontSize: 15, fontFamily: "inherit",
                  background: BRAND.primary, opacity: loading ? 0.7 : 1,
                  boxShadow: "0 4px 12px rgba(26,95,168,0.3)",
                  transition: "opacity 0.2s, box-shadow 0.2s",
                }}>
                  {loading ? t("Submitting...", "جارٍ الإرسال...") : t("Submit Support Request →", "إرسال طلب الدعم ←")}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── TRACK TAB ── */}
        {tab === "track" && (
          <div style={{ animation: "fadeUp 0.3s ease" }}>
            <div style={{ background: surface, borderRadius: 16, padding: 36, border: `1px solid ${border}`, boxShadow: dark ? "none" : "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: text, marginBottom: 4 }}>
                {t("Track Your Request", "تتبع طلبك")}
              </h2>
              <p style={{ color: muted, fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
                {t("Enter your ticket number (e.g. TK-001) or the email you used to submit.", "أدخل رقم تذكرتك (مثال: TK-001) أو البريد الإلكتروني الذي استخدمته.")}
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <input className="track-input" style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                  placeholder={t("TK-001 or your@email.com", "TK-001 أو بريدك الإلكتروني")}
                  value={trackInput} onChange={e => setTrackInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && trackTicket()} />
                <button onClick={trackTicket} disabled={loading} style={{
                  padding: "11px 24px", background: BRAND.primary, border: "none",
                  borderRadius: 8, color: "#fff", fontWeight: 600, cursor: "pointer",
                  fontSize: 14, fontFamily: "inherit", whiteSpace: "nowrap",
                  boxShadow: "0 4px 12px rgba(26,95,168,0.3)",
                }}>
                  {loading ? "..." : t("Search", "بحث")}
                </button>
              </div>
            </div>

            {loading && <Spinner color={BRAND.primary} />}

            {trackError && (
              <div style={{ background: surface, borderRadius: 12, padding: 32, textAlign: "center", border: `1px solid ${border}` }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: text, marginBottom: 6 }}>{t("Not Found", "غير موجود")}</div>
                <p style={{ color: muted, fontSize: 13 }}>{trackError}</p>
              </div>
            )}

            {/* Single ticket */}
            {foundTicket && !Array.isArray(foundTicket) && (
              <div style={{ background: surface, borderRadius: 16, padding: 32, border: `1px solid ${border}`, boxShadow: dark ? "none" : "0 2px 12px rgba(0,0,0,0.06)", animation: "fadeUp 0.3s ease" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, color: BRAND.primary, fontWeight: 700, marginBottom: 4, letterSpacing: 0.5 }}>{foundTicket.id}</div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: text }}>{foundTicket.title}</h3>
                  </div>
                  <Badge label={foundTicket.status} color={STATUS_COLOR[foundTicket.status]} />
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                  <Badge label={foundTicket.priority} color={PRIORITY_COLOR[foundTicket.priority]} />
                  <Badge label={foundTicket.category} color={muted} />
                </div>

                {foundTicket.description && (
                  <div style={{ background: dark ? "#0f172a" : "#f8fafc", borderRadius: 8, padding: 14, marginBottom: 18, fontSize: 14, color: muted, lineHeight: 1.7, border: `1px solid ${border}` }}>
                    {foundTicket.description}
                  </div>
                )}

                <div style={{ display: "flex", gap: 24, fontSize: 13, color: muted, marginBottom: 24, flexWrap: "wrap" }}>
                  <span>📅 {t("Submitted:", "تاريخ الإرسال:")} {foundTicket.created}</span>
                  <span>👤 {t("Agent:", "الموظف:")} {foundTicket.agent}</span>
                </div>

                {/* Progress tracker */}
                <div>
                  <div style={{ fontSize: 12, color: muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>
                    {t("Request Progress", "تقدم الطلب")}
                  </div>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    {STATUSES.map((s, i) => {
                      const steps = ["Open", "In Progress", "Resolved", "Closed"];
                      const currentIdx = steps.indexOf(foundTicket.status);
                      const active = i <= currentIdx;
                      const current = i === currentIdx;
                      return (
                        <div key={s} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                            {i > 0 && <div style={{ flex: 1, height: 2, background: active ? STATUS_COLOR[foundTicket.status] : border, transition: "background 0.3s" }} />}
                            <div style={{
                              width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                              background: active ? STATUS_COLOR[foundTicket.status] : (dark ? "#334155" : "#e2e8f0"),
                              display: "flex", alignItems: "center", justifyContent: "center",
                              border: current ? `3px solid ${STATUS_COLOR[foundTicket.status]}` : "none",
                              fontSize: 12, color: active ? "#fff" : muted, fontWeight: 700,
                              boxShadow: current ? `0 0 0 4px ${STATUS_COLOR[foundTicket.status]}20` : "none",
                              transition: "all 0.3s",
                            }}>
                              {active ? (current ? "●" : "✓") : i + 1}
                            </div>
                            {i < STATUSES.length - 1 && <div style={{ flex: 1, height: 2, background: i < currentIdx ? STATUS_COLOR[foundTicket.status] : border, transition: "background 0.3s" }} />}
                          </div>
                          <div style={{ fontSize: 10, color: active ? STATUS_COLOR[foundTicket.status] : muted, marginTop: 6, fontWeight: active ? 600 : 400, textAlign: "center" }}>
                            {isAr ? STATUSES_AR[i] : s}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Multiple tickets */}
            {foundTicket && Array.isArray(foundTicket) && (
              <div style={{ animation: "fadeUp 0.3s ease" }}>
                <div style={{ fontSize: 13, color: muted, marginBottom: 14, fontWeight: 500 }}>
                  {foundTicket.length} {t("tickets found for this email", "تذكرة تم العثور عليها لهذا البريد")}
                </div>
                {foundTicket.map(tk => (
                  <div key={tk.id} style={{ background: surface, borderRadius: 12, padding: 20, border: `1px solid ${border}`, marginBottom: 12, boxShadow: dark ? "none" : "0 1px 4px rgba(0,0,0,0.06)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 12, color: BRAND.primary, fontWeight: 700, marginBottom: 4 }}>{tk.id} · {tk.created}</div>
                        <div style={{ fontSize: 15, color: text, fontWeight: 600 }}>{tk.title}</div>
                        <div style={{ fontSize: 12, color: muted, marginTop: 3 }}>{tk.category}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <Badge label={tk.priority} color={PRIORITY_COLOR[tk.priority]} />
                        <Badge label={tk.status} color={STATUS_COLOR[tk.status]} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 48, paddingTop: 24, borderTop: `1px solid ${border}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, background: dark ? "#1e293b" : BRAND.primaryLight, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              <img src="/nwa-logo.png" alt="NWA" style={{ width: 24, height: 24, objectFit: "contain" }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: muted }}>
              {isAr ? BRAND.nameAr : BRAND.nameEn}
            </span>
          </div>
          <p style={{ fontSize: 12, color: dark ? "#475569" : "#94a3b8" }}>
            {t("© 2026 National Water Alliance. All rights reserved.", "© 2026 التحالف الوطني للمياه. جميع الحقوق محفوظة.")}
          </p>
        </div>
      </div>
    </>
  );
}