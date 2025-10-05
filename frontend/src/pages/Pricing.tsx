import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  LineChart,
  ShieldCheck,
  Sparkles,
  Users,
  Zap
} from "lucide-react";
import PublicNav from "@/components/PublicNav";
import { Button } from "@/components/ui/button";
import "./pricing.css";

interface Plan {
  name: string;
  price: string;
  billing: string;
  highlight: string;
  description: string;
  ctaLabel: string;
  ctaLink: string;
  mostPopular?: boolean;
  features: string[];
}

const plans: Plan[] = [
  {
    name: "Launch",
    price: "$0",
    billing: "per month",
    highlight: "For operator teams validating a new marketplace or vendor program",
    description: "Everything you need to onboard vendors, orchestrate orders, and reconcile early revenue without spreadsheets.",
    ctaLabel: "Start for free",
    ctaLink: "/signup",
    features: [
      "Up to 50 active vendor seats",
      "Guided onboarding playbooks",
      "Unified order + SLA dashboard",
      "Basic settlement exports (CSV)",
      "Email + in-app vendor nudges"
    ]
  },
  {
    name: "Growth",
    price: "$649",
    billing: "per month",
    highlight: "For fast-scaling operators managing complex fulfillment and finance flows",
    description: "Automate compliance, orchestrate multi-channel fulfillment, and accelerate reconciliation with finance-grade controls.",
    ctaLabel: "Talk to sales",
  ctaLink: "/signup?plan=growth",
    mostPopular: true,
    features: [
      "Unlimited vendors & team workspaces",
      "Advanced SLA automation + escalations",
      "Realtime settlement ledger with variance flags",
      "Carrier + PSP integrations included",
      "Ops & finance analytics workspace",
      "Priority chat support"
    ]
  },
  {
    name: "Enterprise",
    price: "Custom",
    billing: "Annual partnership",
    highlight: "For global operators standardising vendor experiences across regions",
    description: "Co-create vendor experiences with governance, granular permissions, dedicated success, and deployment support.",
    ctaLabel: "Book strategy session",
  ctaLink: "/signup?plan=enterprise",
    features: [
      "Dedicated solutions architect",
      "SAML/SCIM + granular RBAC",
      "Contract & workflow automation",
      "Data residency + private cloud options",
      "Custom SLA scorecards + exec reporting",
      "24/7 enterprise support"
    ]
  }
];

const valueStats = [
  { label: "Faster vendor activation", value: "72%", description: "Time from invite to first order shrinks from weeks to days." },
  { label: "Support ticket reduction", value: "63%", description: "Ops teams deflect repetitive vendor questions with guided flows." },
  { label: "Finance close acceleration", value: "4×", description: "Settlement confidence means finance closes books in hours, not days." }
];

const addOns = [
  {
    title: "Embedded vendor finance",
    body: "Offer working capital advances and dynamic commissions with real-time risk scoring.",
    icon: <LineChart className="h-6 w-6" aria-hidden />
  },
  {
    title: "Managed onboarding squad",
    body: "Vendora specialists partner with your team to onboard vendors and run enablement webinars.",
    icon: <Users className="h-6 w-6" aria-hidden />
  },
  {
    title: "Compliance co-pilot",
    body: "Automate KYB/KYC, tax document collection, and policy attestations tailored to your regions.",
    icon: <ShieldCheck className="h-6 w-6" aria-hidden />
  }
];

const faqs = [
  {
    question: "Can we move between plans as we grow?",
    answer:
      "Absolutely. Start on Launch, upgrade when you need advanced automation, and keep vendor data intact with zero downtime."
  },
  {
    question: "Is there a fee per vendor or per order?",
    answer:
      "Plans include generous vendor and order allowances. We offer transparent overage pricing once you outgrow included volumes."
  },
  {
    question: "How do onboarding services work?",
    answer:
      "Growth and Enterprise customers can add Vendora operators who run onboarding playbooks alongside your team for the first 90 days."
  },
  {
    question: "Do you support custom integrations?",
    answer:
      "Yes. Use our GraphQL API, webhooks, or partner with our solutions team to connect internal tooling and data warehouses."
  }
];

const Pricing: React.FC = () => {
  return (
    <div className="pricing-page bg-background text-foreground">
      <PublicNav variant="solid" />
      <main>
        <section className="pricing-hero">
          <div className="pricing-hero__inner">
            <span className="pricing-badge">
              <Sparkles className="h-4 w-4" aria-hidden />
              Plans that flex with your marketplace
            </span>
            <h1>Choose the control centre that matches your scale</h1>
            <p>
              Every plan includes Vendora’s vendor portal, operator cockpit, finance ledger, and analytics layer. Add automation and services when you’re ready.
            </p>
            <div className="pricing-hero__cta">
              <Button asChild size="lg" className="pricing-cta">
                <Link to="/signup">
                  Talk with our team
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="/#product">Explore product tour</a>
              </Button>
            </div>
          </div>
        </section>

        <section className="pricing-grid">
          <div className="pricing-grid__inner">
            {plans.map((plan) => (
              <article key={plan.name} className={`plan-card ${plan.mostPopular ? "plan-card--featured" : ""}`}>
                {plan.mostPopular && <span className="plan-card__tag">Most popular</span>}
                <div className="plan-card__header">
                  <h2>{plan.name}</h2>
                  <p>{plan.highlight}</p>
                </div>
                <div className="plan-card__pricing">
                  <span className="plan-card__price">{plan.price}</span>
                  <span className="plan-card__billing">{plan.billing}</span>
                </div>
                <p className="plan-card__description">{plan.description}</p>
                <Button asChild size="lg" className="plan-card__cta">
                  <Link to={plan.ctaLink}>{plan.ctaLabel}</Link>
                </Button>
                <ul className="plan-card__features">
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <Check className="h-4 w-4" aria-hidden />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="pricing-value">
          <div className="pricing-value__inner">
            <div className="pricing-value__copy">
              <span className="pricing-flag">Proven outcomes</span>
              <h2>Why operators switch to Vendora</h2>
              <p>Vendora is purpose-built for vendor-first marketplaces. We replace fragmented processes with a single source of truth for teams who need precision.</p>
            </div>
            <div className="pricing-stats">
              {valueStats.map((stat) => (
                <article key={stat.label}>
                  <h3>{stat.value}</h3>
                  <span>{stat.label}</span>
                  <p>{stat.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="pricing-addons">
          <div className="pricing-addons__head">
            <span className="pricing-flag">Go further</span>
            <h2>Operational firepower when you need it</h2>
            <p>Layer on services and automations curated from high-performing marketplaces. Activate them for a launch sprint or embed them long term.</p>
          </div>
          <div className="pricing-addons__grid">
            {addOns.map((addon) => (
              <article key={addon.title}>
                <div className="pricing-addon__icon">{addon.icon}</div>
                <h3>{addon.title}</h3>
                <p>{addon.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="pricing-guarantee">
          <div className="pricing-guarantee__body">
            <div>
              <span className="pricing-flag">Rollout support</span>
              <h2>We deploy alongside your team</h2>
              <p>
                Every plan ships with implementation guidance, change management templates, and success metrics tied to your launch goals. If you prefer, Vendora operators can run your first vendor cohorts for you.
              </p>
            </div>
            <div className="pricing-guarantee__points">
              <div>
                <ShieldCheck className="h-5 w-5" aria-hidden />
                <span>Security-first architecture, SOC 2 in progress</span>
              </div>
              <div>
                <Zap className="h-5 w-5" aria-hidden />
                <span>API-first platform with webhook automation</span>
              </div>
              <div>
                <Users className="h-5 w-5" aria-hidden />
                <span>Dedicated success manager on Growth + Enterprise</span>
              </div>
            </div>
          </div>
        </section>

        <section className="pricing-faq" id="pricing-faq">
          <div className="pricing-faq__head">
            <span className="pricing-flag">FAQ</span>
            <h2>Answers for marketplace leaders</h2>
            <p>Need a custom deployment path or integration? Let’s architect it together.</p>
          </div>
          <div className="pricing-faq__grid">
            {faqs.map((faq) => (
              <details key={faq.question}>
                <summary>
                  <span>{faq.question}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="pricing-cta">
          <div className="pricing-cta__inner">
            <div>
              <span className="pricing-flag">Next step</span>
              <h2>Map your vendor playbook with Vendora</h2>
              <p>Share your current workflow, tooling, and rollout timeline—we’ll craft a tailored plan in one working session.</p>
            </div>
            <div className="pricing-cta__actions">
              <Button asChild size="lg" className="pricing-cta">
                <Link to="/signup">
                  Book strategy session
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#pricing-faq">Browse FAQs</a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="pricing-footer">
        <span>© {new Date().getFullYear()} Vendora. Pricing that scales with operators and vendors alike.</span>
        <nav>
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
        </nav>
      </footer>
    </div>
  );
};

export default Pricing;
