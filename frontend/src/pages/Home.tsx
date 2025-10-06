import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Globe2,
  Layers,
  LineChart,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
  Zap
} from "lucide-react";
import PublicNav from "@/components/PublicNav";
import BackToTopButton from "@/components/BackToTopButton";
import { Button } from "@/components/ui/button";
import "./home.css";

interface HeroSlide {
  id: number;
  label: string;
  title: string;
  description: string;
  highlight: string;
  bullets: string[];
  background: string;
}

const heroSlides: HeroSlide[] = [
  {
    id: 0,
    label: "Setup",
    title: "Register your Business-desk and go live",
    description:
      "Sign up on Vendora, set the assets you sell, and choose the rails you accept with simple forms.",
    highlight: "Vendora replaces disconnected chats with one web app vendors open every morning.",
    bullets: [
      "Vendor account in minutes",
      "Branded workspace",
      "Telegram bot ready"
    ],
    background:
      "linear-gradient(150deg, oklch(var(--primary) / 0.22) 0%, oklch(var(--accent) / 0.12) 55%, oklch(var(--card) / 0.94) 100%)"
  },
  {
    id: 1,
    label: "Orders",
    title: "Handle every order from one tab",
    description:
      "See new requests, confirm payments, and close deals inside the Vendora web app without juggling WhatsApp threads.",
    highlight: "Auto-expiry and proof uploads keep vendors and customers on the same page.",
    bullets: [
      "Live order feed",
      "Status updates",
      "Proof attachments"
    ],
    background:
      "linear-gradient(140deg, oklch(var(--accent) / 0.18) 0%, oklch(var(--primary) / 0.14) 50%, oklch(var(--card) / 0.92) 100%)"
  },
  {
    id: 2,
    label: "Notifications",
    title: "Customers stay informed on Telegram",
    description:
      "Buyers check rates, place orders, and receive updates through your Vendora Telegram bot.",
    highlight:
      "The bot shares the right message while vendors focus on finishing transactions from the app.",
    bullets: [
      "Automated replies",
      "Customer queries",
      "Browser alerts"
    ],
    background:
      "linear-gradient(145deg, oklch(var(--primary) / 0.2) 0%, oklch(var(--success) / 0.12) 60%, oklch(var(--card) / 0.92) 100%)"
  }
];

const heroStats = [
  { value: "14-day", label: "Free trial for every vendor" },
  { value: "1 app", label: "All vendor operations" },
  { value: "Instant", label: "Telegram + web alerts" }
];

const howItWorks = [
  {
    icon: <Sparkles className="h-6 w-6 text-accent" aria-hidden />,
    title: "Register and set up",
    body: "Create your Vendora account, add the assets you trade, configure your buy and sell rates and pick the payment rails you support.",
    meta: "Step 1"
  },
  {
    icon: <Layers className="h-6 w-6 text-accent" aria-hidden />,
    title: "Share your Vendora link",
    body: "Give customers access to your Vendora Telegram bot so they can check rates, place buy/sell orders, and ask questions.",
    meta: "Step 2"
  },
  {
    icon: <ShieldCheck className="h-6 w-6 text-accent" aria-hidden />,
    title: "Run the desk from the app",
    body: "Use the Vendora PWA to approve orders, send updates, upload proofs, and finish trades faster than messaging apps.",
    meta: "Step 3"
  }
];

const featureHighlights = [
  {
    icon: <Users className="h-6 w-6 text-accent" aria-hidden />,
    title: "Straightforward rates",
    body: "Update buy and sell prices inside the Vendora app. Customers see the changes instantly in Telegram."
  },
  {
    icon: <BarChart3 className="h-6 w-6 text-accent" aria-hidden />,
    title: "Order lifecycle",
    body: "Approve, decline, or auto-expire trades with every action recorded for future reference."
  },
  {
    icon: <Store className="h-6 w-6 text-accent" aria-hidden />,
    title: "Transaction proofs",
    body: "Attach payment proofs and keep them stored alongside each order so finance and customers stay aligned."
  },
  {
    icon: <Globe2 className="h-6 w-6 text-accent" aria-hidden />,
    title: "Live event stream",
    body: "Server-Sent Events (SSE) keeps the web app and the bot synced without refreshes or manual pings."
  },
  {
    icon: <LineChart className="h-6 w-6 text-accent" aria-hidden />,
    title: "Web push alerts",
    body: "Turn on browser notifications so vendors get alerts the second a customer needs something."
  },
  {
    icon: <Zap className="h-6 w-6 text-accent" aria-hidden />,
    title: "Telegram bot",
    body: "Customers trade, ask questions, and get updates inside Telegram while you keep control from the Vendora PWA."
  }
];

const valueProofPoints = [
  {
    title: "1 workspace",
    subtitle: "All vendor tasks",
    body: "Vendora PWA covers rates, orders, proofs, queries, and notifications without extra tools."
  },
  {
    title: "Zero waiting",
    subtitle: "Faster deals",
    body: "Vendors see requests instantly, finish transactions in fewer steps, and move to the next customer quickly."
  },
  {
    title: "Telegram ready",
    subtitle: "Bot included",
    body: "Vendora ships with the customer-facing Telegram bot so your buyers always know what to do next."
  }
];

const faqs = [
  {
    question: "What is Vendora?",
    answer:
      "Vendora is the web app crypto vendors use instead of juggling WhatsApp or exchange P2P tools. It runs your rates, orders, proofs, queries, and alerts in one place."
  },
  {
    question: "How long does implementation take?",
    answer:
      "Most vendors go live the same day. Register, set your assets, switch on the Telegram bot, and start sharing your link."
  },
  {
    question: "Do customers need to install anything?",
    answer:
      "No. Customers use your Vendora Telegram bot to check rates, place orders, and receive updates."
  },
  {
    question: "Do vendors need training?",
    answer:
      "Hardly. The Vendora web app guides vendors through each task and the bot handles customer messages for them."
  }
];

const testimonials = [
  {
    quote:
      "Vendora replaced the messy sheets we used to track trades. Orders and proofs now live in one clean place.",
    name: "Adaeze U.",
    role: "Crypto vendor, NairaBridge"
  },
  {
    quote:
      "Customers love getting updates through Telegram. We close more deals without chasing screenshots all day.",
    name: "Luis R.",
    role: "Vendor success lead"
  }
];

const trustedLogos = ["NairaBridge", "VoltArc", "CoinRelay", "Atlas OTC", "Satoshi Lane", "MeshX"];

function HeroCarousel(): JSX.Element {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % heroSlides.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, []);

  const activeSlide = useMemo(() => heroSlides[activeIndex], [activeIndex]);

  return (
    <section className="hero-carousel" aria-label="Vendora product moments">
      <div className="hero-carousel__viewport" style={{ background: activeSlide.background }}>
        <div className="hero-carousel__badge" aria-live="polite">
          {activeSlide.label}
        </div>
        <h3 className="hero-carousel__title">{activeSlide.title}</h3>
        <p className="hero-carousel__description">{activeSlide.description}</p>
        <div className="hero-carousel__highlight">{activeSlide.highlight}</div>
        <ul className="hero-carousel__bullets">
          {activeSlide.bullets.map((bullet) => (
            <li key={bullet}>
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="hero-carousel__controls" role="tablist" aria-label="Product scenarios">
        {heroSlides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            role="tab"
            aria-selected={index === activeIndex}
            aria-controls={`hero-slide-${slide.id}`}
            className={`hero-carousel__dot ${index === activeIndex ? "is-active" : ""}`}
            onClick={() => setActiveIndex(index)}
          >
            <span className="sr-only">{slide.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

const TrustedByRow = () => (
  <section className="py-12">
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-6 text-sm font-medium text-muted-foreground">
      <span className="tracking-widest text-xs uppercase text-muted-foreground/70">
        TRUSTED BY OPERATORS AT
      </span>
      {trustedLogos.map((logo) => (
        <span key={logo} className="tracking-wide text-sm text-foreground/60">
          {logo}
        </span>
      ))}
    </div>
  </section>
);

const FAQItem = ({ question, answer }: { question: string; answer: string }) => (
  <details className="faq-card" aria-label={question}>
    <summary>
      <span>{question}</span>
      <ArrowRight className="h-4 w-4" aria-hidden />
    </summary>
    <p>{answer}</p>
  </details>
);

const Home: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!location.hash) {
      return;
    }

    const targetId = location.hash.replace("#", "");
    if (!targetId) {
      return;
    }

    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      window.requestAnimationFrame(() => {
        targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [location.hash]);

  return (
    <div className="home-page bg-background text-foreground">
      <PublicNav variant="translucent" />
      <main>
        <section className="home-hero">
          <div className="home-hero__gradient" aria-hidden />
          <div className="home-hero__inner">
            <div className="home-hero__copy">
              <span className="home-eyebrow">
                <Sparkles className="h-4 w-4" aria-hidden />
                Built for crypto vendors
              </span>
              <h1>Run your entire vendor business from the Vendora web app</h1>
              <p>
                Vendors register on Vendora, manage rates, accept and complete orders, reply to queries, and send notifications from one PWA. Customers use the Vendora Telegram bot instead of slow chats or risky exchange P2P rooms.
              </p>
              <div className="home-hero__actions">
                <Button asChild size="lg" className="home-cta">
                  <Link to="/signup">
                    Start free trial
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                  </Link>
                </Button>
                <Link to="/#product" className="home-hero__link">
                  See how Vendora works
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
              <dl className="home-hero__stats">
                {heroStats.map((stat) => (
                  <div key={stat.label}>
                    <dt>{stat.label}</dt>
                    <dd>{stat.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <HeroCarousel />
          </div>
        </section>

        <TrustedByRow />

        <section id="how-it-works" className="section section--muted">
          <div className="section__head">
            <span className="section__eyebrow">HOW IT WORKS</span>
            <h2>Vendors and customers move together</h2>
            <p>Vendora replaces scattered tools with one vendor workspace and a customer-facing Telegram bot.</p>
          </div>
          <div className="section__grid">
            {howItWorks.map((step) => (
              <article key={step.title} className="card">
                <div className="card__icon">{step.icon}</div>
                <div className="card__meta">{step.meta}</div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="product" className="section section--split">
          <div className="section__head">
            <span className="section__eyebrow">WHY VENDORA</span>
            <h2>The control centre vendors keep open all day</h2>
            <p>
              Vendora keeps your vendor tasks in one place and keeps customers informed through Telegram so no one waits around.
            </p>
          </div>
          <div className="value-grid">
            <div className="value-grid__before-after">
              <div className="value-grid__before">
                <h3>Before Vendora</h3>
                <ul>
                  <li>WhatsApp chats that lag and derail deals</li>
                  <li>Exchange P2P rooms that lose trust</li>
                  <li>Manual rate updates and missing proofs</li>
                </ul>
              </div>
              <div className="value-grid__after">
                <h3>With Vendora</h3>
                <ul>
                  <li>Vendora web app keeps every order and query organised</li>
                  <li>Telegram bot gives customers instant answers and order status</li>
                  <li>Proof-backed settlements build trust with every trade</li>
                  <li>Increased productivity and boosted customer's trust</li>
                </ul>
              </div>
            </div>
            <div className="value-grid__metrics">
              {valueProofPoints.map((metric) => (
                <article key={metric.title} className="metric-card">
                  <h3>{metric.title}</h3>
                  <span>{metric.subtitle}</span>
                  <p>{metric.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section__head">
            <span className="section__eyebrow">DEMO TOUR</span>
            <h2>See Vendora in action</h2>
            <p>Walk through the Vendora web app for vendors and the Telegram bot customers use to place and track orders.</p>
          </div>
          <div className="demo-panel">
            <div className="demo-panel__visual" role="img" aria-label="Vendora workflow automation">
              <div className="demo-panel__header">
                <span className="demo-panel__status">
                  <span className="demo-dot" aria-hidden />
                  Live OTC workflow
                </span>
                <Button variant="ghost" size="sm">
                  <PlayCircle className="mr-2 h-4 w-4" aria-hidden />
                  Watch 3-min product tour
                </Button>
              </div>
              <div className="demo-panel__body">
                <div>
                  <span>Vendor onboarding</span>
                  <strong>93% complete</strong>
                </div>
                <p>
                  Checklist tasks, compliance documents, bot hand-off, and preferred rails are automated inside the Vendora workspace.
                </p>
              </div>
              <ul>
                <li>
                  <CheckCircle2 className="h-4 w-4" aria-hidden /> KYB documents verified
                </li>
                <li>
                  <CheckCircle2 className="h-4 w-4" aria-hidden /> Telegram bot issued and branded
                </li>
                <li>
                  <CheckCircle2 className="h-4 w-4" aria-hidden /> Trial trades confirmed and archived
                </li>
              </ul>
            </div>
            <div className="demo-panel__notes">
              <article>
                <h3>Operator cockpit</h3>
                <p>Monitor every order state, customer request, and proof attachment from a single timeline.</p>
              </article>
              <article>
                <h3>Vendor portal</h3>
                <p>Vendors manage rates, payment rails, and customer queries without leaving the Vendora web app.</p>
              </article>
              <article>
                <h3>Finance sync</h3>
                <p>Every payout references, proofs are stored so finance is properly managed and customers can confirm transactions faster and resolve transaction issues more efficiently.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="section section--muted">
          <div className="section__head">
            <span className="section__eyebrow">CAPABILITIES</span>
            <h2>Everything vendors need in one platform</h2>
            <p>Built for crypto vendors from day one so you can focus on trading, not stitching tools together or constantly trying to keep your business existent.</p>
          </div>
          <div className="section__grid">
            {featureHighlights.map((feature) => (
              <article key={feature.title} className="card">
                <div className="card__icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section--split">
          <div className="section__head">
            <span className="section__eyebrow">RESULTS</span>
            <h2>Stories from desks scaling with Vendora</h2>
            <p>Real vendors replacing messy chats and manual trackers with faster transactions and happier customers.</p>
          </div>
          <div className="testimonials">
            {testimonials.map((quote) => (
              <blockquote key={quote.name} className="testimonial">
                <p>“{quote.quote}”</p>
                <footer>
                  <strong>{quote.name}</strong>
                  <span>{quote.role}</span>
                </footer>
              </blockquote>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section__head">
            <span className="section__eyebrow">FAQ</span>
            <h2>Frequently asked questions</h2>
            <p>Need more detail? Drop us a line and we’ll walk through your vendor flow together.</p>
          </div>
          <div className="faq-grid" id="faq">
            {faqs.map((faq) => (
              <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </section>

        <section className="section section--cta">
          <div className="section__head section__head--center">
            <span className="section__eyebrow">READY WHEN YOU ARE</span>
            <h2>Ready to trade the <strong>Vendora</strong> way?</h2>
            <p>Register your vendor account, share your Vendora bot link, and handle every order from one tab.</p>
          </div>
          <div className="section__actions">
            <Button asChild size="lg" className="home-cta">
              <Link to="/signup">
                Start free trial
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="home-secondary">
              <Link to="/pricing">View pricing</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div>
          <span>© {new Date().getFullYear()} Vendora. All rights reserved.</span><br></br>
          <nav>
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
          </nav>
        </div>
        <span>Vendora is built for operators and vendors who demand clarity and productivity.</span>
      </footer>
      <BackToTopButton />
    </div>
  );
};

export default Home;
