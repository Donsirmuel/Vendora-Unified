import React from "react";
import { Link } from "react-router-dom";

export default function Home(): JSX.Element {
  const root = { fontFamily: "Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif", background: "#0f172a", color: "#f1f5f9", minHeight: "100vh" };
  const header = { maxWidth: 1100, margin: "0 auto", padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" };
  const navLink = { color: "inherit", textDecoration: "none", fontSize: 14, marginLeft: 28, opacity: 0.85, transition: ".2s" };
  const badge = { background: "rgba(255,255,255,.08)", padding: "4px 10px", borderRadius: 999, fontSize: 12, marginLeft: 10, fontWeight: 500 };
  const hero = { maxWidth: 1100, margin: "40px auto 70px", padding: "0 28px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(420px,1fr))", alignItems: "center", gap: 56 };
  const h1 = { fontSize: "clamp(2.4rem,5.2vw,3.6rem)", lineHeight: 1.05, margin: 0, background: "linear-gradient(90deg,#fff,#7dd3fc)", WebkitBackgroundClip: "text" as any, backgroundClip: "text" as any, color: "transparent" };
  const lead = { fontSize: 20, lineHeight: 1.5, maxWidth: 600, margin: "0 0 32px", color: "#94a3b8" };
  const btn = { background: "#0ea5b7", color: "#041e28", padding: "14px 28px", fontWeight: 600, fontSize: 15, border: "none", borderRadius: 10, cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 4px 16px -4px rgba(14,165,183,.45)", transition: ".25s" };
  const btnSecondary = { background: "#1e293b", color: "#f1f5f9", padding: "14px 28px", fontWeight: 600, fontSize: 15, borderRadius: 10, textDecoration: "none", display: "inline-flex", alignItems: "center" };
  const screen = { background: "#0b1322", border: "1px solid #1e293b", padding: "26px", borderRadius: 18, boxShadow: "0 20px 50px -18px rgba(0,0,0,.55)", position: "relative", overflow: "hidden" };
  const featuresGrid = { listStyle: "none", padding: 0, margin: "56px auto 40px", maxWidth: 1050, display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))" };
  const feature = { background: "#101e33", border: "1px solid #1e2b42", padding: "20px", borderRadius: 14 };
  const footer = { maxWidth: 1100, margin: "80px auto 40px", padding: "0 28px", fontSize: 12.5, color: "#94a3b8", display: "flex", flexWrap: "wrap", gap: 18, alignItems: "center", justifyContent: "space-between" };

  return (
    <div style={root}>
      <header style={header}>
        <div style={{ fontWeight: 600, fontSize: 19, color: "#94a3b8", display: "flex", alignItems: "center" }}>
          Vendora <span style={badge}>Beta</span>
        </div>
        <nav>
          <a style={navLink} href="#features">Features</a>
          <a style={navLink} href="/terms">Terms</a>
          <a style={navLink} href="/privacy">Privacy</a>
          <a style={{ ...navLink, marginLeft: 16 }} href="/signup">Sign Up</a>
          <a style={{ ...navLink, marginLeft: 16 }} href="/login">Login</a>
        </nav>
      </header>

      <section style={hero}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: ".5px", textTransform: "uppercase", color: "#7dd3fc", marginBottom: 8 }}>Operate faster</div>
          <h1 style={h1}>All your vendor operations-orders, rates, deals-in one ultra‑light Progressive Web Application.</h1>
          <p style={lead}>Vendora centralizes P2P crypto vendor workflows: publish rates, accept customer orders, confirm transactions, push updates, answer queries & stream live activity-without heavyweight dashboards.</p>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <a style={btn} href="/signup">Start Free Trial →</a>
            <a style={btnSecondary} href="#features">See Features</a>
          </div>
          <div style={{ color: "#94a3b8", marginTop: 14 }}>No card required • 14‑day trial • Keep your data</div>
        </div>

        <div style={screen as React.CSSProperties}>
          <pre style={{ margin: 0 }}><code style={{ fontFamily: "Source Code Pro,monospace", fontSize: 13, color: "#7dd3fc" }}>
{`POST /api/v1/orders
201 Created  ⏱ 142ms

stream: vendor_events
  - order.created
  - rate.updated
  - transaction.completed`}
          </code></pre>
        </div>
      </section>

      <ul style={featuresGrid} id="features">
        {[
          ["Straightforward Rates", "Quickly publish buy & sell rates; prevent duplicates automatically."],
          ["Order Lifecycle", "Create, accept, complete or decline - with automatic expiry handling."],
          ["Transaction Proofs", "Attach and view confirmation proofs & export PDF summaries."],
          ["Live Event Stream", "Server-Sent Events push updates instantly to every open session."],
          ["Web Push", "Optional push notifications for critical order & transaction events."],
          ["Telegram Bot", "Get order alerts or resolve queries directly inside Telegram."],
          ["Customer Queries", "Track and close customer inquiries with vendor-scoped access."],
          ["Secure & Throttled", "JWT auth, per-user rate limits, structured logs and request IDs."]
        ].map(([title, desc]) => (
          <li key={title} style={feature}>
            <h3 style={{ margin: 0, marginBottom: 8 }}>{title}</h3>
            <p style={{ margin: 0, fontSize: 14, color: "#94a3b8" }}>{desc}</p>
          </li>
        ))}
      </ul>

      <section style={{ maxWidth: 900, margin: "30px auto 0", padding: "0 28px" }}>
        <span style={{ background: "#1e293b", display: "inline-block", padding: "4px 10px", borderRadius: 999, fontSize: 11, letterSpacing: ".5px", textTransform: "uppercase", fontWeight: 600, color: "#7dd3fc" }}>Pricing (Preview)</span>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: "#94a3b8", maxWidth: 720, marginTop: 10 }}>
          During beta your first <strong style={{ color: "#fff" }}>14 days are free</strong>. Afterwards choose a simple monthly plan (coming soon). Need volume pricing? <a style={{ color: "#7dd3fc" }} href="mailto:hello@vendora.page?subject=Vendora%20Early%20Access">Contact us</a>.
        </p>
      </section>

      <section style={{ maxWidth: 950, margin: "80px auto 20px", padding: "0 28px" }} id="faq" aria-labelledby="faq-heading">
        <h2 id="faq-heading" style={{ fontSize: 32, margin: "0 0 28px" }}>Frequently Asked Questions</h2>
        {[
          ["What is Vendora?", "Vendora is a lightweight platform for independent crypto vendors to manage rates, customer orders, transactions, proofs, and queries with optional Telegram notifications & real‑time streaming updates."],
          ["How does the free trial work?", "You get access to all core features during the trial (no card required). Near expiry you’ll see reminders. After it ends, actions that create new orders may be gated until you activate a plan."],
          ["Do I need to install anything?", "No. Vendora runs as a progressive web app in your browser. You can optionally “Install” it from your browser menu for an app‑like experience."],
          ["How do I receive notifications?", "Enable web push in the dashboard for browser alerts or connect your Telegram username to receive bot messages for key events like new orders or completed transactions."],
          ["Is my data secure?", "All API requests use JWT authentication, endpoints are rate‑limited, and structured logging plus health checks help monitor stability. Future updates will add stronger security headers & optional audit exports."]
        ].map(([q, a]) => (
          <div key={q} style={{ background: "#101e33", border: "1px solid #1e2b42", padding: "18px 20px 14px", borderRadius: 14, marginBottom: 14 }}>
            <h3 style={{ margin: "0 0 8px" }}>{q}</h3>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "#94a3b8" }}>{a}</p>
          </div>
        ))}
      </section>

      <footer style={footer as React.CSSProperties}>
        <div>© <span id="year">{new Date().getFullYear()}</span> Vendora. All rights reserved.</div>
        <div>
          <a style={{ color: "#7dd3fc", marginRight: 12 }} href="/terms">Terms</a>
          <a style={{ color: "#7dd3fc" }} href="/privacy">Privacy</a>
        </div>
      </footer>
    </div>
  );
}