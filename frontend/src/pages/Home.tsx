import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, BarChart3, CheckCircle2, Globe2, LineChart, PlayCircle, ShieldCheck, Sparkles, Store, Users, Zap } from "lucide-react";
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
  image: string;
  imageAlt: string;
}

const heroSlides: HeroSlide[] = [
  {
    id: 0,
    label: "Dashboard",
    title: "Track every customer order from one live board",
    description: "See new requests, confirm payments, and share delivery status without juggling chats.",
    highlight: "You always know what to do next and customers see clear updates right away.",
    bullets: [
      "Live order feed with automations",
      "Pinned exceptions for rapid action",
      "Finance-ready proof attachments"
    ],
    background:
      "linear-gradient(150deg, oklch(var(--primary) / 0.26) 0%, oklch(var(--accent) / 0.14) 60%, oklch(var(--card) / 0.96) 100%)",
    image: "/screenshots/vendora-dashboard.png",
    imageAlt: "Vendora dashboard showing live vendor orders"
  },
  {
    id: 1,
    label: "Billing & rates",
    title: "Update rates and rails without calling devs",
    description: "Change prices, add bank accounts, and set payout steps whenever your market moves.",
    highlight: "You adjust the numbers, Vendora updates the workflow for every order.",
    bullets: [
      "Simple rate updates",
      "Guided payout checklists",
      "Clear teammate roles"
    ],
    background:
      "linear-gradient(145deg, oklch(var(--accent) / 0.22) 0%, oklch(var(--primary) / 0.18) 55%, oklch(var(--card) / 0.94) 100%)",
    image: "/screenshots/Vendora-settings.png",
    imageAlt: "Vendora settings screen showing rate controls"
  },
  {
    id: 2,
    label: "Telegram automation",
    title: "Your branded bot answers every customer message",
    description: "Customers ask questions, send proofs, and get receipts from your Telegram bot while you work.",
    highlight: "Nobody waits for a reply because Vendora keeps the chat moving.",
    bullets: [
      "Telegram order forms",
      "Proof reminders",
      "Instant status replies"
    ],
    background:
      "linear-gradient(145deg, oklch(var(--primary) / 0.24) 0%, oklch(var(--success) / 0.16) 60%, oklch(var(--card) / 0.94) 100%)",
    image: "/screenshots/vendora-telegram-bot.png",
    imageAlt: "Vendora Telegram bot conversation"
  }
];

const heroStats = [
  { value: "86%", label: "Orders closed without manual follow-up" },
  { value: "8,051", label: "Vendor tasks automated each month" },
  { value: "25,811", label: "Telegram status updates delivered" }
];

interface HowItWorksStep {
  id: number;
  title: string;
  body: string;
  icon: JSX.Element;
  screenshot: string;
  alt: string;
}

const howItWorksSteps: HowItWorksStep[] = [
  {
    id: 0,
  title: "Open your Vendora account",
  body: "Register, pick the coins you sell, and connect your Telegram bot in a few clicks.",
    icon: <Sparkles className="h-5 w-5" aria-hidden />,
    screenshot: "/screenshots/Vendora-signup.png",
    alt: "Vendora signup screen"
  },
  {
    id: 1,
  title: "Add your team and set tasks",
  body: "Invite helpers, share roles, and let Vendora follow up on proofs and payments.",
    icon: <Users className="h-5 w-5" aria-hidden />,
    screenshot: "/screenshots/Vendora-login.png",
    alt: "Vendora login access"
  },
  {
    id: 2,
  title: "Let Telegram handle customer chats",
  body: "Customers ask for rates, send receipts, and see order status without waiting for you.",
    icon: <Zap className="h-5 w-5" aria-hidden />,
    screenshot: "/screenshots/vendora-telegram-bot.png",
    alt: "Vendora Telegram bot conversation"
  },
  {
    id: 3,
  title: "Keep every deal in order",
  body: "See live orders, payouts, and receipts with exports you can share with finance or partners.",
    icon: <BarChart3 className="h-5 w-5" aria-hidden />,
    screenshot: "/screenshots/vendora-dashboard.png",
    alt: "Vendora dashboard analytics"
  }
];

const featureHighlights = [
  {
    icon: <Users className="h-6 w-6 text-accent" aria-hidden />,
    title: "Work as one team",
    body: "Share the same board with helpers, set simple permissions, and see who handled each step."
  },
  {
    icon: <BarChart3 className="h-6 w-6 text-accent" aria-hidden />,
    title: "Orders stay on track",
    body: "Vendora moves orders from quote to payment with clear stages and automatic reminders."
  },
  {
    icon: <Store className="h-6 w-6 text-accent" aria-hidden />,
    title: "Proofs stay attached",
    body: "Collect receipts on every payout so you can answer questions without digging through chats."
  },
  {
    icon: <Globe2 className="h-6 w-6 text-accent" aria-hidden />,
    title: "Live activity feed",
    body: "See updates as they happen so you never miss a new order or customer reply."
  },
  {
    icon: <LineChart className="h-6 w-6 text-accent" aria-hidden />,
    title: "Daily numbers",
    body: "Check volume, deals, and balances from the same dashboard you already use."
  },
  {
    icon: <Zap className="h-6 w-6 text-accent" aria-hidden />,
    title: "Telegram answers fast",
    body: "Your bot replies with rates, instructions, and delivery notes so customers stay calm."
  }
];

const valueProofPoints = [
  {
    title: "Less waiting",
    subtitle: "Customers get answers quickly",
    body: "Vendora pings you and your buyers whenever the order needs the next step."
  },
  {
    title: "Telegram ready",
    subtitle: "Updates go out automatically",
    body: "Your bot sends status messages so you spend less time copying replies."
  },
  {
    title: "One simple tool",
    subtitle: "Fair price for daily work",
    body: "Replace spreadsheets and scattered chats with one simple app made for vendors."
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
      <div
        id={`hero-slide-${activeSlide.id}`}
        className="hero-carousel__viewport"
        style={{ background: activeSlide.background }}
      >
        <div className="hero-carousel__content">
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
        <figure className="hero-carousel__media">
          <div className="hero-carousel__media-frame">
            <img src={activeSlide.image} alt={activeSlide.imageAlt} />
          </div>
        </figure>
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
        TRUSTED BY VENDORS AT
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

function HowItWorksSection(): JSX.Element {
  const [activeStep, setActiveStep] = useState(0);
  const step = howItWorksSteps[activeStep];

  return (
    <section id="how-it-works" className="section section--muted how-it-works">
      <div className="section__head">
        <span className="section__eyebrow">HOW VENDORA WORKS</span>
        <h2>See how vendors use Vendora day to day</h2>
        <p>Set up your account, answer customers, and close orders without complex spreadsheets or side chats.</p>
      </div>
      <div className="how-it-works__body">
        <div className="how-it-works__steps" role="tablist" aria-label="How Vendora works">
          {howItWorksSteps.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={`how-it-works__step ${index === activeStep ? "is-active" : ""}`}
              onClick={() => setActiveStep(index)}
              role="tab"
              aria-selected={index === activeStep}
              id={`how-it-works-step-${item.id}`}
              aria-controls="how-it-works-panel"
            >
              <span className="how-it-works__step-icon">{item.icon}</span>
              <div className="how-it-works__step-copy">
                <span className="how-it-works__step-meta">Step {index + 1}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            </button>
          ))}
        </div>
        <figure
          className="how-it-works__visual"
          role="tabpanel"
          id="how-it-works-panel"
          aria-labelledby={`how-it-works-step-${step.id}`}
        >
          <div className="how-it-works__visual-frame">
            <img src={step.screenshot} alt={step.alt} />
          </div>
        </figure>
      </div>
    </section>
  );
}

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
              <h1>One simple app for high-volume crypto vendors</h1>
              <p>
                Vendora is the simple app vendors use to manage orders, proofs, and payouts in one place. It keeps Telegram updates flowing so you can close deals faster.
              </p>
              <div className="home-hero__actions">
                <Button asChild size="lg" className="home-cta">
                  <Link to="/signup">
                    Start free trial
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                  </Link>
                </Button>
                <Link to="/#product" className="home-hero__link">
                  Explore the product tour
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

        <HowItWorksSection />

        <section id="product" className="section section--split">
          <div className="section__head">
            <span className="section__eyebrow">WHY VENDORA</span>
            <h2>The page vendors keep open all day</h2>
            <p>
              Vendora keeps every part of your vendor work in one tab and sends clear Telegram updates so buyers trust each step.
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
                  <li>Proof-backed payments build trust with every trade</li>
                  <li>Every payout matches a receipt buyers can see</li>
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
            <p>Walk through the live vendor board and the Telegram chats your buyers see.</p>
          </div>
          <div className="demo-panel">
            <figure className="demo-panel__visual">
              <span className="demo-panel__status">
                <span className="demo-dot" aria-hidden />
                Live Vendora dashboard
              </span>
              <div className="demo-panel__screen">
                <img src="/screenshots/vendora-dashboard.png" alt="Vendora dashboard with live vendor orders" />
              </div>
              <figcaption>
                Vendors approve orders, confirm receipts, and sync payouts from one screen while buyers receive instant Telegram updates.
              </figcaption>
              <Button variant="secondary" size="sm" className="demo-panel__cta">
                <PlayCircle className="mr-2 h-4 w-4" aria-hidden />
                Watch 3-minute product tour
              </Button>
            </figure>
            <div className="demo-panel__notes">
              <article>
                <h3>Vendor dashboard</h3>
                <p>See each order stage, customer question, and proof attachment in one live timeline.</p>
              </article>
              <article>
                <h3>Rates and payouts</h3>
                <p>Update prices, payment rails, and teammate access without starting new chat threads.</p>
              </article>
              <article>
                <h3>Proof and finance view</h3>
                <p>Each payout links to proof-backed transactions so you and your buyers stay on the same page.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="section section--muted">
          <div className="section__head">
            <span className="section__eyebrow">CAPABILITIES</span>
            <h2>Everything vendors need in one platform</h2>
            <p>Made for crypto vendors from day one so you can focus on closing trades instead of fixing tools.</p>
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
            <h2>Stories from teams scaling with Vendora</h2>
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
        <span>Vendora is built for vendors who want clear orders, faster payouts, and happy buyers.</span>
      </footer>
      <BackToTopButton />
    </div>
  );
};

export default Home;
