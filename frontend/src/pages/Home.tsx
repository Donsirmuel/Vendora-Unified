import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./home.css";
import { promptInstall } from '@/main';

// Animated number counter (simple requestAnimationFrame based)
function AnimatedNumber({ value, duration = 1400 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef({ start: 0, startTime: 0 });

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    ref.current.start = display;
    ref.current.startTime = start;

    function step(now: number) {
      const elapsed = now - ref.current.startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(ref.current.start + (value - ref.current.start) * eased);
      setDisplay(next);
      if (progress < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <div className="stat" style={{ fontSize: 28 }}>{display.toLocaleString()}</div>;
}

function StatsCard({ className = '' }: { className?: string }) {
  // Auto-incrementing numbers for demo/swag: they slowly grow over time.
  // Small helper hook — returns a number that increases by a small random
  // amount every interval (keeps values lively for demo videos).
  function useGrowingNumber(initial: number, minStep: number, maxStep: number, interval = 1400) {
    const [n, setN] = useState(initial);
    useEffect(() => {
      let mounted = true;
      let timer: number | null = null;
      function step() {
        if (!mounted) return;
        const delta = Math.floor(Math.random() * (maxStep - minStep + 1)) + minStep;
        setN((v) => v + delta);
        timer = window.setTimeout(step, interval + Math.floor(Math.random() * 800));
      }
      timer = window.setTimeout(step, interval);
      return () => {
        mounted = false;
        if (timer) clearTimeout(timer);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return n;
  }

  const vendors = useGrowingNumber(93, 0, 1, 1800);
  const orders = useGrowingNumber(8734, 1, 6, 1200);
  const minutes = useGrowingNumber(28000, 8, 60, 1000);

  return (
    <div style={{ display: 'flex', gap: 18, alignItems: 'center', justifyContent: 'space-between', width: '100%' }} className={className}>
      <div style={{ flex: '1 1 0' }}>
        <div className="stat-label">Vendors onboarded</div>
        <AnimatedNumber value={vendors} />
      </div>
      <div style={{ flex: '1 1 0' }}>
        <div className="stat-label">Orders created</div>
        <AnimatedNumber value={orders} />
      </div>
      <div style={{ flex: '1 1 0' }}>
        <div className="stat-label">Minutes saved</div>
        <AnimatedNumber value={minutes} />
      </div>
    </div>
  );
}

export default function Home(): JSX.Element {
  // Demo mode: make animations much more visible for recordings/demos.
  // Enable via URL `?demo=1` or set localStorage.setItem('vendora_demo','1')
  const isDemo = typeof window !== 'undefined' && (
    new URLSearchParams(window.location.search).get('demo') === '1' ||
    localStorage.getItem('vendora_demo') === '1'
  );
  // Stagger feature reveal on mount
  useEffect(() => {
    const items = Array.from(document.querySelectorAll('#features .feature')) as HTMLElement[];
    items.forEach((el, i) => {
      setTimeout(() => el.classList.add('show'), 90 * i + 80);
    });
    return () => {
      items.forEach((el) => el.classList.remove('show'));
    };
  }, []);

  // Cursor parallax refs and handler
  const bgRadialRef = useRef<HTMLDivElement | null>(null);
  const bgGlowRef = useRef<HTMLDivElement | null>(null);
  const svgRightRef = useRef<SVGSVGElement | null>(null);
  const svgLeftRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    let mounted = true;
    let raf = 0;
    const state = { x: 0, y: 0, tx: 0, ty: 0 };

    function onPointer(e: PointerEvent) {
      const rect = document.documentElement.getBoundingClientRect();
      state.x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5..0.5
      state.y = (e.clientY - rect.top) / rect.height - 0.5;
      schedule();
    }

    function schedule() {
      if (raf) return;
      raf = requestAnimationFrame(tick);
    }

    function tick() {
      raf = 0;
      // ease towards pointer position
      state.tx += (state.x - state.tx) * 0.12;
      state.ty += (state.y - state.ty) * 0.12;

      const slowX = state.tx * 18; // px
      const slowY = state.ty * 12;
      const fastX = state.tx * 32;
      const fastY = state.ty * 22;

      if (bgRadialRef.current) bgRadialRef.current.style.transform = `translate3d(${slowX}px, ${slowY}px, 0)`;
      if (bgGlowRef.current) bgGlowRef.current.style.transform = `translate3d(${slowX * 0.6}px, ${slowY * 0.6}px, 0)`;
      if (svgRightRef.current) svgRightRef.current.style.transform = `translate3d(${fastX}px, ${fastY}px, 0)`;
      if (svgLeftRef.current) svgLeftRef.current.style.transform = `translate3d(${fastX * -0.6}px, ${fastY * -0.6}px, 0)`;

      if (mounted) raf = requestAnimationFrame(tick);
    }

    window.addEventListener('pointermove', onPointer);
    window.addEventListener('touchmove', onPointer, { passive: true } as any);

    return () => {
      mounted = false;
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('touchmove', onPointer as any);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

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

  <section style={hero} className={"home-hero" + (isDemo ? ' demo' : '')}>
        <div className="hero-zoom">
          <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: ".5px", textTransform: "uppercase", color: "#7dd3fc", marginBottom: 8 }}>Operate faster</div>
          <h1 style={h1}>All your vendor operations-orders, rates, deals-in one ultra‑light Progressive Web Application.</h1>
          <p style={lead}>Vendora centralizes P2P crypto vendor workflows: publish rates, accept customer orders, confirm transactions, push updates, answer queries & stream live activity-without heavyweight dashboards.</p>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <a className="cta" style={btn} href="/signup">Start Free Trial →</a>
            <a className="cta" style={btnSecondary} href="#features">See Features</a>
          </div>
          <div style={{ color: "#94a3b8", marginTop: 14 }}>No card required • 14‑day trial • Maximize your Productivity</div>
        </div>

        <div style={screen as React.CSSProperties}>
          {/* styles are now imported from ./home.css */}

          {/* Animated stats panel (replaces old stream/log block) */}
          <div style={{ display: 'flex', gap: 18, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <StatsCard className="fade-up float-slight" />
          </div>

          {/* Decorative animated background shapes and layered gradient for visual polish */}
          <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <div ref={bgRadialRef} className="bg-layer bg-radial parallax-slow" />
            <div ref={bgGlowRef} className="bg-layer bg-glow parallax-slow" />
            <svg ref={svgRightRef} width="100%" height="100%" preserveAspectRatio="none" style={{ position: 'absolute', right: -40, bottom: -10, width: 320, height: 320, opacity: 0.06, zIndex: 1 }}>
              <defs>
                <linearGradient id="g1" x1="0" x2="1">
                  <stop offset="0%" stopColor="#0ea5b7" />
                  <stop offset="100%" stopColor="#7dd3fc" />
                </linearGradient>
              </defs>
              <circle cx="160" cy="160" r="120" fill="url(#g1)"></circle>
            </svg>
            <svg ref={svgLeftRef} width="100%" height="100%" preserveAspectRatio="none" style={{ position: 'absolute', left: -20, top: -30, width: 220, height: 220, opacity: 0.04 }}>
              <circle cx="110" cy="110" r="90" fill="#7dd3fc"></circle>
            </svg>
          </div>
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
          <li key={title} style={feature} className="feature">
            <h3 style={{ margin: 0, marginBottom: 8 }}>{title}</h3>
            <p style={{ margin: 0, fontSize: 14, color: "#94a3b8" }}>{desc}</p>
          </li>
        ))}
      </ul>

      <section style={{ maxWidth: 1100, margin: "60px auto 0", padding: "0 28px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <span style={{ background: "#1e293b", display: "inline-block", padding: "4px 10px", borderRadius: 999, fontSize: 11, letterSpacing: ".5px", textTransform: "uppercase", fontWeight: 600, color: "#7dd3fc" }}>Simple Pricing</span>
          <h2 style={{ fontSize: 32, margin: "16px 0 8px", color: "#fff" }}>Choose Your Plan</h2>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: "#94a3b8", maxWidth: 600, margin: "0 auto" }}>
            Start with our <strong style={{ color: "#fff" }}>Free Plan</strong> (up to 10 orders/day) or upgrade for unlimited orders at just <strong style={{ color: "#0ea5b7" }}>$0.75/day</strong>.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, maxWidth: 1000, margin: "0 auto" }}>
          {/* Free Plan */}
          <div style={{ background: "#101e33", border: "1px solid #1e2b42", padding: "24px", borderRadius: 16, position: "relative" }}>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: "#fff" }}>Free Plan</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#0ea5b7", marginBottom: 4 }}>$0<span style={{ fontSize: 16, color: "#94a3b8" }}>/month</span></div>
            <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 20 }}>Perfect for getting started</p>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", color: "#94a3b8" }}>
              <li style={{ marginBottom: 8, display: "flex", alignItems: "center" }}>
                <span style={{ color: "#0ea5b7", marginRight: 8 }}>✓</span>
                Up to 10 orders per day
              </li>
              <li style={{ marginBottom: 8, display: "flex", alignItems: "center" }}>
                <span style={{ color: "#0ea5b7", marginRight: 8 }}>✓</span>
                Basic rate management
              </li>
              <li style={{ marginBottom: 8, display: "flex", alignItems: "center" }}>
                <span style={{ color: "#0ea5b7", marginRight: 8 }}>✓</span>
                Telegram bot integration
              </li>
              <li style={{ marginBottom: 8, display: "flex", alignItems: "center" }}>
                <span style={{ color: "#0ea5b7", marginRight: 8 }}>✓</span>
                Basic support
              </li>
            </ul>
            <a style={{ ...btn, width: "100%", justifyContent: "center", background: "#1e293b", color: "#f1f5f9" }} href="/signup">Get Started Free</a>
          </div>

          {/* Monthly Plan */}
          <div style={{ background: "linear-gradient(145deg, #0ea5b7, #0891b2)", border: "1px solid #0ea5b7", padding: "24px", borderRadius: 16, position: "relative", transform: "scale(1.05)" }}>
            <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: "#fbbf24", color: "#92400e", padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600 }}>MOST POPULAR</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: "#041e28" }}>Monthly Plan</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#041e28", marginBottom: 4 }}>$22.99<span style={{ fontSize: 16, color: "#164e63" }}>/month</span></div>
            <p style={{ color: "#164e63", fontSize: 14, marginBottom: 20 }}>$0.75 per day • Unlimited orders</p>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", color: "#164e63" }}>
              <li style={{ marginBottom: 8, display: "flex", alignItems: "center" }}>
                <span style={{ color: "#041e28", marginRight: 8 }}>✓</span>
                Unlimited orders per day
              </li>
              <li style={{ marginBottom: 8, display: "flex", alignItems: "center" }}>
                <span style={{ color: "#041e28", marginRight: 8 }}>✓</span>
                Advanced rate management
              </li>
              <li style={{ marginBottom: 8, display: "flex", alignItems: "center" }}>
                <span style={{ color: "#041e28", marginRight: 8 }}>✓</span>
                Full Telegram bot features
              </li>
              <li style={{ marginBottom: 8, display: "flex", alignItems: "center" }}>
                <span style={{ color: "#041e28", marginRight: 8 }}>✓</span>
                Priority support
              </li>
              <li style={{ marginBottom: 8, display: "flex", alignItems: "center" }}>
                <span style={{ color: "#041e28", marginRight: 8 }}>✓</span>
                Real-time notifications
              </li>
            </ul>
            <a style={{ ...btn, width: "100%", justifyContent: "center", background: "#041e28", color: "#0ea5b7" }} href="/upgrade">Upgrade Now</a>
          </div>

          {/* Quarterly Plan */}
          <div style={{ background: "#101e33", border: "1px solid #1e2b42", padding: "24px", borderRadius: 16, position: "relative" }}>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: "#fff" }}>3-Month Plan</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#0ea5b7", marginBottom: 4 }}>$68.97<span style={{ fontSize: 16, color: "#94a3b8" }}>/3 months</span></div>
            <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 20 }}>$0.75 per day • Save with longer commitment</p>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", color: "#94a3b8" }}>
              <li style={{ marginBottom: 8, display: "flex", alignItems: "center" }}>
                <span style={{ color: "#0ea5b7", marginRight: 8 }}>✓</span>
                Everything in Monthly
              </li>
              <li style={{ marginBottom: 8, display: "flex", alignItems: "center" }}>
                <span style={{ color: "#0ea5b7", marginRight: 8 }}>✓</span>
                Extended commitment savings
              </li>
              <li style={{ marginBottom: 8, display: "flex", alignItems: "center" }}>
                <span style={{ color: "#0ea5b7", marginRight: 8 }}>✓</span>
                Quarterly business reports
              </li>
            </ul>
            <a style={{ ...btn, width: "100%", justifyContent: "center", background: "#1e293b", color: "#f1f5f9" }} href="/upgrade">Choose Plan</a>
          </div>

          {/* 6-Month Plan */}
          <div style={{ background: "#101e33", border: "1px solid #1e2b42", padding: "24px", borderRadius: 16, position: "relative" }}>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: "#fff" }}>6-Month Plan</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#0ea5b7", marginBottom: 4 }}>$137.94<span style={{ fontSize: 16, color: "#94a3b8" }}>/6 months</span></div>
            <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 20 }}>$0.75 per day • Better value</p>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", color: "#94a3b8" }}>
              <li style={{ marginBottom: 8, display: "flex", alignItems: "center" }}>
                <span style={{ color: "#0ea5b7", marginRight: 8 }}>✓</span>
                Everything in Monthly
              </li>
              <li style={{ marginBottom: 8, display: "flex", alignItems: "center" }}>
                <span style={{ color: "#0ea5b7", marginRight: 8 }}>✓</span>
                Semi-annual savings
              </li>
              <li style={{ marginBottom: 8, display: "flex", alignItems: "center" }}>
                <span style={{ color: "#0ea5b7", marginRight: 8 }}>✓</span>
                Advanced analytics
              </li>
            </ul>
            <a style={{ ...btn, width: "100%", justifyContent: "center", background: "#1e293b", color: "#f1f5f9" }} href="/upgrade">Choose Plan</a>
          </div>

          {/* Annual Plan */}
          <div style={{ background: "#101e33", border: "1px solid #1e2b42", padding: "24px", borderRadius: 16, position: "relative" }}>
            <div style={{ position: "absolute", top: -10, right: 16, background: "#10b981", color: "#064e3b", padding: "4px 8px", borderRadius: 999, fontSize: 10, fontWeight: 600 }}>BEST VALUE</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: "#fff" }}>Annual Plan</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#0ea5b7", marginBottom: 4 }}>$275.88<span style={{ fontSize: 16, color: "#94a3b8" }}>/year</span></div>
            <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 20 }}>$0.75 per day • Maximum savings</p>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", color: "#94a3b8" }}>
              <li style={{ marginBottom: 8, display: "flex", alignItems: "center" }}>
                <span style={{ color: "#0ea5b7", marginRight: 8 }}>✓</span>
                Everything in Monthly
              </li>
              <li style={{ marginBottom: 8, display: "flex", alignItems: "center" }}>
                <span style={{ color: "#0ea5b7", marginRight: 8 }}>✓</span>
                Annual commitment savings
              </li>
              <li style={{ marginBottom: 8, display: "flex", alignItems: "center" }}>
                <span style={{ color: "#0ea5b7", marginRight: 8 }}>✓</span>
                Premium support & features
              </li>
              <li style={{ marginBottom: 8, display: "flex", alignItems: "center" }}>
                <span style={{ color: "#0ea5b7", marginRight: 8 }}>✓</span>
                Annual business insights
              </li>
            </ul>
            <a style={{ ...btn, width: "100%", justifyContent: "center", background: "#1e293b", color: "#f1f5f9" }} href="/upgrade">Choose Plan</a>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 32, color: "#94a3b8", fontSize: 14 }}>
          All plans include a <strong style={{ color: "#fff" }}>14-day free trial</strong>. Cancel anytime. <a style={{ color: "#7dd3fc" }} href="mailto:hello@vendora.page?subject=Vendora%20Pricing">Questions about pricing?</a>
        </div>
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

      {/* PWA install guide */}
      <section style={{ maxWidth: 950, margin: "40px auto 8px", padding: "20px 28px", background: '#071028', borderRadius: 12, border: '1px solid #122033' }} id="install-guide">
        <h2 style={{ fontSize: 28, margin: '0 0 12px' }}>Install Vendora on your device</h2>
        <p style={{ color: '#94a3b8', marginTop: 0 }}>For the best experience install Vendora as an app. Follow the steps for your device below.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12, marginTop: 16 }}>
          <div style={{ padding: 14, background: '#071a2b', borderRadius: 10, border: '1px solid #0f2434' }}>
            <strong>Android (Chrome)</strong>
            <ol style={{ marginTop: 8, color: '#94a3b8', paddingLeft: 16 }}>
              <li>Open Vendora in Chrome.</li>
              <li>Tap the three-dot menu → "Add to Home screen".</li>
              <li>Confirm to install — the PWA will appear on your launcher.</li>
            </ol>
          </div>

          <div style={{ padding: 14, background: '#071a2b', borderRadius: 10, border: '1px solid #0f2434' }}>
            <strong>iPhone (Safari)</strong>
            <ol style={{ marginTop: 8, color: '#94a3b8', paddingLeft: 16 }}>
              <li>Open Vendora in Safari.</li>
              <li>Tap the Share icon (bottom) → "Add to Home Screen".</li>
              <li>Tap Add — Vendora will be added to your home screen.</li>
            </ol>
          </div>

          <div style={{ padding: 14, background: '#071a2b', borderRadius: 10, border: '1px solid #0f2434' }}>
            <strong>Desktop (Chrome / Edge / Firefox)</strong>
            <ol style={{ marginTop: 8, color: '#94a3b8', paddingLeft: 16 }}>
              <li>Open Vendora in your browser.</li>
              <li>Chrome / Edge: Click the install icon in the address bar or go to the menu → "Install".</li>
              <li>Firefox: Use the page menu → "Install Website…" if available, or use the browser profile to create a shortcut.</li>
            </ol>
          </div>
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="cta" style={{ background: '#0ea5b7', color: '#041e28', padding: '10px 16px', borderRadius: 10, border: 'none', fontWeight: 600 }} onClick={async () => { await promptInstall(); }}>
            Install Vendora (if supported)
          </button>
          <div style={{ color: '#94a3b8' }}>If your browser supports install prompts this button will trigger it.</div>
        </div>
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