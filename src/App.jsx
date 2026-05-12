import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const BRAND = {
  name: "HelpDesk Pro",
  tagline: "IT Support Portal",
  primaryColor: "#0ea5e9",
  accentColor: "#f59e0b",
};

const CATEGORIES = ["Hardware", "Software", "Network", "Access & Permissions", "Other"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const PRIORITY_COLOR = { Low: "#22c55e", Medium: "#f59e0b", High: "#f97316", Critical: "#ef4444" };
const STATUS_COLOR = { Open: "#0ea5e9", "In Progress": "#a855f7", Resolved: "#22c55e", Closed: "#64748b" };

function genId(list) {
  const max = Math.max(...list.map(t => parseInt(t.id.replace("TK-", ""))), 0);
  return `TK-${String(max + 1).padStart(3, "0")}`;
}

function Badge({ label, color }) {
  return (
    <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 6, padding: "3px 12px", fontSize: 13, fontWeight: 700 }}>
      {label}
    </span>
  );
}

function Toast({ msg, color }) {
  return (
    <div style={{ position: "fixed", top: 24, right: 24, zIndex: 9999, background: color || "#0ea5e9", color: "#fff", padding: "12px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14, boxShadow: "0 8px 24px #0006" }}>
      {msg}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
      <div style={{ width: 32, height: 32, border: "3px solid #1e293b", borderTop: "3px solid #0ea5e9", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );
}

const inputStyle = { width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "12px 16px", color: "#f1f5f9", fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 16, fontFamily: "inherit" };
const labelStyle = { display: "block", marginBottom: 6, fontSize: 13, color: "#94a3b8", fontWeight: 600 };

export default function App() {
  const [tab, setTab] = useState("submit");
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [foundTicket, setFoundTicket] = useState(null);
  const [trackError, setTrackError] = useState("");
  const [trackInput, setTrackInput] = useState("");
  const [form, setForm] = useState({
    name: "", email: "", title: "", category: CATEGORIES[0], priority: "Medium", description: ""
  });

  function notify(msg, color) {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 4000);
  }

  async function submitTicket() {
    if (!form.name.trim() || !form.email.trim() || !form.title.trim()) {
      return notify("⚠️ Name, email and issue title are required.", "#f59e0b");
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
      notify("❌ Failed to submit. Please try again.", "#ef4444");
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
      .from("tickets")
      .select("*")
      .eq(isId ? "id" : "email", isId ? trackInput.toUpperCase() : trackInput.toLowerCase());
    if (error || !data || data.length === 0) {
      setTrackError("No ticket found. Please check your ticket ID or email.");
    } else {
      setFoundTicket(isId ? data[0] : data);
    }
    setLoading(false);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0f172a; color: #e2e8f0; font-family: 'DM Sans', sans-serif; min-height: 100vh; }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:none } }
        .tab-btn:hover { background: #1e293b !important; }
        .submit-btn:hover { filter: brightness(1.1); }
        input:focus, select:focus, textarea:focus { border-color: #0ea5e9 !important; }
      `}</style>

      {toast && <Toast msg={toast.msg} color={toast.color} />}

      <header style={{ background: "#0f172a", borderBottom: "1px solid #1e293b", padding: "0 24px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: "linear-gradient(135deg,#0ea5e9,#f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne',sans-serif", fontWeight: 800, color: "#fff", fontSize: 13 }}>HD</div>
            <div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: "#f1f5f9" }}>HelpDesk Pro</div>
              <div style={{ fontSize: 10, color: "#475569" }}>IT Support Portal</div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: "#475569" }}>We're here to help 👋</div>
        </div>
      </header>

      <div style={{ background: "linear-gradient(135deg,#0ea5e918,#f59e0b10)", borderBottom: "1px solid #1e293b", padding: "40px 24px", textAlign: "center" }}>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 32, fontWeight: 800, color: "#f1f5f9", marginBottom: 8 }}>IT Support Center</h1>
        <p style={{ color: "#64748b", fontSize: 15, maxWidth: 480, margin: "0 auto" }}>Submit a request or track your existing ticket. We respond within 2-4 business hours.</p>
      </div>

      <div style={{ maxWidth: 680, margin: "32px auto 0", padding: "0 24px" }}>
        <div style={{ display: "flex", background: "#1e293b", borderRadius: 12, padding: 4, marginBottom: 28, border: "1px solid #334155" }}>
          {[{ id: "submit", label: "🎫 Submit a Ticket" }, { id: "track", label: "🔍 Track My Ticket" }].map(t => (
            <button key={t.id} className="tab-btn" onClick={() => { setTab(t.id); setSubmitted(null); setFoundTicket(null); setTrackError(""); }}
              style={{ flex: 1, padding: "11px 0", border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 600, fontSize: 14, fontFamily: "inherit", transition: "all 0.15s", background: tab === t.id ? "#0ea5e9" : "transparent", color: tab === t.id ? "#fff" : "#64748b" }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "submit" && (
          <div style={{ animation: "fadeUp 0.3s ease" }}>
            {submitted ? (
              <div style={{ background: "#1e293b", borderRadius: 18, padding: 40, textAlign: "center", border: "1px solid #334155" }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
                <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, color: "#f1f5f9", marginBottom: 8 }}>Ticket Submitted!</h2>
                <p style={{ color: "#64748b", marginBottom: 24, fontSize: 14 }}>Confirmation sent to <strong style={{ color: "#94a3b8" }}>{submitted.email}</strong></p>
                <div style={{ background: "#0f172a", borderRadius: 12, padding: 20, marginBottom: 24, display: "inline-block", minWidth: 260 }}>
                  <div style={{ fontSize: 13, color: "#64748b", marginBottom: 6 }}>Your Ticket ID</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#0ea5e9", fontFamily: "'Syne',sans-serif" }}>{submitted.id}</div>
                  <div style={{ fontSize: 12, color: "#475569", marginTop: 6 }}>Save this to track your ticket</div>
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 28 }}>
                  <Badge label={submitted.priority} color={PRIORITY_COLOR[submitted.priority]} />
                  <Badge label={submitted.category} color="#64748b" />
                  <Badge label="Open" color="#0ea5e9" />
                </div>
                <button onClick={() => { setSubmitted(null); setForm({ name: "", email: "", title: "", category: CATEGORIES[0], priority: "Medium", description: "" }); }}
                  style={{ padding: "11px 28px", background: "#0ea5e9", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                  Submit Another Ticket
                </button>
              </div>
            ) : (
              <div style={{ background: "#1e293b", borderRadius: 18, padding: 32, border: "1px solid #334155" }}>
                <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, color: "#f1f5f9", marginBottom: 4 }}>Submit a Support Request</h2>
                <p style={{ color: "#475569", fontSize: 13, marginBottom: 28 }}>Fill in the details and we'll get back to you shortly.</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Your Name *</label>
                    <input style={inputStyle} placeholder="John Smith" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelStyle}>Your Email *</label>
                    <input style={inputStyle} type="email" placeholder="you@company.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                </div>
                <label style={labelStyle}>Issue Title *</label>
                <input style={inputStyle} placeholder="Brief description of your issue" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Category</label>
                    <select style={inputStyle} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Priority</label>
                    <select style={inputStyle} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                      {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <label style={labelStyle}>Description</label>
                <textarea style={{ ...inputStyle, minHeight: 100, resize: "vertical" }} placeholder="Describe your issue in detail..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                <button className="submit-btn" onClick={submitTicket} disabled={loading}
                  style={{ width: "100%", padding: "14px 0", border: "none", borderRadius: 10, color: "#fff", cursor: loading ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 15, fontFamily: "'Syne',sans-serif", background: "linear-gradient(135deg,#0ea5e9,#f59e0b)", opacity: loading ? 0.7 : 1, transition: "filter 0.2s" }}>
                  {loading ? "Submitting…" : "Submit Support Request →"}
                </button>
              </div>
            )}
          </div>
        )}

        {tab === "track" && (
          <div style={{ animation: "fadeUp 0.3s ease" }}>
            <div style={{ background: "#1e293b", borderRadius: 18, padding: 32, border: "1px solid #334155", marginBottom: 20 }}>
              <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, color: "#f1f5f9", marginBottom: 4 }}>Track Your Ticket</h2>
              <p style={{ color: "#475569", fontSize: 13, marginBottom: 24 }}>Enter your ticket ID (e.g. TK-001) or email address.</p>
              <div style={{ display: "flex", gap: 10 }}>
                <input style={{ ...inputStyle, marginBottom: 0, flex: 1 }} placeholder="TK-001 or your@email.com" value={trackInput} onChange={e => setTrackInput(e.target.value)} onKeyDown={e => e.key === "Enter" && trackTicket()} />
                <button onClick={trackTicket} disabled={loading} style={{ padding: "12px 24px", background: "#0ea5e9", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14, whiteSpace: "nowrap" }}>
                  {loading ? "…" : "Search"}
                </button>
              </div>
            </div>
            {loading && <Spinner />}
            {trackError && (
              <div style={{ background: "#1e293b", borderRadius: 14, padding: 24, textAlign: "center", border: "1px solid #334155", color: "#64748b" }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
                <p>{trackError}</p>
              </div>
            )}
            {foundTicket && !Array.isArray(foundTicket) && (
              <div style={{ background: "#1e293b", borderRadius: 18, padding: 28, border: "1px solid #334155", animation: "fadeUp 0.3s ease" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 13, color: "#0ea5e9", fontWeight: 700, marginBottom: 4 }}>{foundTicket.id}</div>
                    <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, color: "#f1f5f9" }}>{foundTicket.title}</h3>
                  </div>
                  <Badge label={foundTicket.status} color={STATUS_COLOR[foundTicket.status]} />
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                  <Badge label={foundTicket.priority} color={PRIORITY_COLOR[foundTicket.priority]} />
                  <Badge label={foundTicket.category} color="#64748b" />
                </div>
                <div style={{ background: "#0f172a", borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 14, color: "#94a3b8", lineHeight: 1.7 }}>
                  {foundTicket.description || "No description provided."}
                </div>
                <div style={{ display: "flex", gap: 20, fontSize: 13, color: "#475569", marginBottom: 20 }}>
                  <span>📅 {foundTicket.created}</span>
                  <span>👤 {foundTicket.agent}</span>
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>Ticket Progress</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {["Open", "In Progress", "Resolved", "Closed"].map((s, i) => {
                    const steps = ["Open", "In Progress", "Resolved", "Closed"];
                    const active = i <= steps.indexOf(foundTicket.status);
                    return (
                      <div key={s} style={{ flex: 1 }}>
                        <div style={{ height: 4, borderRadius: 2, background: active ? STATUS_COLOR[foundTicket.status] : "#334155" }} />
                        <div style={{ fontSize: 10, color: active ? STATUS_COLOR[foundTicket.status] : "#334155", marginTop: 4, textAlign: "center" }}>{s}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {foundTicket && Array.isArray(foundTicket) && (
              <div style={{ animation: "fadeUp 0.3s ease" }}>
                <p style={{ color: "#64748b", fontSize: 13, marginBottom: 14 }}>{foundTicket.length} ticket{foundTicket.length !== 1 ? "s" : ""} found</p>
                {foundTicket.map(t => (
                  <div key={t.id} style={{ background: "#1e293b", borderRadius: 14, padding: 20, border: "1px solid #334155", marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 12, color: "#0ea5e9", fontWeight: 700, marginBottom: 3 }}>{t.id} · {t.created}</div>
                        <div style={{ fontSize: 15, color: "#f1f5f9", fontWeight: 600 }}>{t.title}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Badge label={t.priority} color={PRIORITY_COLOR[t.priority]} />
                        <Badge label={t.status} color={STATUS_COLOR[t.status]} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div style={{ textAlign: "center", padding: "32px 0", color: "#334155", fontSize: 12 }}>
          HelpDesk Pro — IT Support Portal
        </div>
      </div>
    </>
  );
}