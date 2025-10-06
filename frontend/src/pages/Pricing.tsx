import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, ShieldCheck, Sparkles, Users, Zap } from "lucide-react";
import PublicNav from "@/components/PublicNav";
import BackToTopButton from "@/components/BackToTopButton";
import { Button } from "@/components/ui/button";
import "./pricing.css";

const pricingSummary = [
  {
    title: "Keep orders organised",
    body: "Your Vendora desk tracks quotes, payments, and receipts so the whole team sees what happens next.",
    icon: <Zap className="h-5 w-5" aria-hidden />
  },
  {
    title: "Telegram responds for you",
    body: "Every plan includes the Vendora bot that sends updates, asks for proofs, and confirms deliveries instantly.",
    icon: <Sparkles className="h-5 w-5" aria-hidden />
  },
  {
    title: "Upgrade when volume grows",
    body: "Start free, fulfil 10 orders a day, and move to paid tiers only when you need unlimited volume and automations.",
    icon: <Users className="h-5 w-5" aria-hidden />
  }
];

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
    name: "Free",
    price: "$0",
    billing: "forever",
    highlight: "For vendors starting with a few trades a day",
    description: "Fulfil up to 10 customer orders each day while you learn how Vendora keeps work tidy.",
    ctaLabel: "Start free",
    ctaLink: "/signup?plan=free",
    features: [
      "10 customer orders per day",
      "Dashboard that tracks quote → proof → payout",
      "Vendora Telegram bot included",
      "Alerts when it is your turn to respond",
      "Order history export (PDF)",
      "Email support"
    ]
  },
  {
    name: "Monthly",
    price: "$22.99",
    billing: "per month",
    highlight: "For busy desks that need unlimited orders and reminders",
    description: "Unlock automations, faster payouts, and live support once daily volume takes off.",
    ctaLabel: "Upgrade monthly",
    ctaLink: "/upgrade?plan=monthly",
    mostPopular: true,
    features: [
      "Unlimited customer orders",
      "Automatic expiries, reminders, and proof chase",
      "Finance-ready exports and statements",
      "Priority alerts for vendors and buyers",
      "Chat and in-app support"
    ]
  },
  {
    name: "Quarterly",
    price: "$68.97",
    billing: "every 3 months",
    highlight: "Quarterly savings for growing desks",
    description: "Everything in Monthly plus a quarterly health check and bundled savings.",
    ctaLabel: "Upgrade quarterly",
    ctaLink: "/upgrade?plan=quarterly",
    features: [
      "Everything in Monthly",
      "Quarterly desk performance summary",
      "Priority review of feature requests",
      "Built-in savings versus monthly",
      "Shared inbox for teammates"
    ]
  },
  {
    name: "Semi-Annual",
    price: "$137.94",
    billing: "every 6 months",
    highlight: "Six-month runway with extra insight",
    description: "Lock in six months of unlimited orders with more analytics and regular check-ins.",
    ctaLabel: "Upgrade semi-annual",
    ctaLink: "/upgrade?plan=semi-annual",
    features: [
      "Everything in Quarterly",
      "Advanced revenue and payout analytics",
      "Bi-monthly success check-ins",
      "Custom labels for orders and payouts",
      "Early access to beta features"
    ]
  },
  {
    name: "Annual",
    price: "$275.88",
    billing: "per year",
    highlight: "Best value for vendors who live in Vendora",
    description: "Secure a full year with our lowest rate, premium support, and direct roadmap input.",
    ctaLabel: "Upgrade annual",
    ctaLink: "/upgrade?plan=annual",
    features: [
      "Everything in Semi-Annual",
      "Priority queue for support and onboarding",
      "Quarterly roadmap sessions with Vendora team",
      "Optional white-label customer messages",
      "Guaranteed renewal pricing"
    ]
  }
];
const valueStats = [
  {
    label: "Manage every order",
    value: "One desk",
    description: "Stay on top of quotes, payments, and receipts without switching apps."
  },
  {
    label: "Keep buyers updated",
    value: "Telegram built-in",
    description: "Send automatic status updates, proof requests, and delivery notes from your bot."
  },
  {
    label: "Stay audit ready",
    value: "Automatic records",
    description: "Track payments, proofs, and payouts with exports your finance partner can trust."
  }
];

const addOns = [
  {
    title: "Vendor desk workspace",
    body: "Track quotes, approvals, proofs, and payouts in one simple interface.",
    icon: <Zap className="h-6 w-6" aria-hidden />
  },
  {
    title: "Telegram automation",
    body: "Customers place orders, upload proofs, and get status updates through your branded bot automatically.",
    icon: <Sparkles className="h-6 w-6" aria-hidden />
  },
  {
    title: "Rate and receipt controls",
    body: "Update buy and sell rates instantly and collect receipts so no one chases screenshots.",
    icon: <ShieldCheck className="h-6 w-6" aria-hidden />
  }
];

const faqs = [
  {
    question: "What happens when I hit the free plan limit?",
    answer:
      "Free desks can fulfill up to 10 customer orders per day. When you hit the cap we pause new requests until the next day, or you can upgrade instantly for unlimited orders."
  },
  {
    question: "Can I change plans later?",
    answer:
      "Yes. Upgrade or downgrade anytime from Settings → Billing. We apply prorated credits automatically so you only pay for what you use."
  },
  {
    question: "Do I pay for extra teammates or vendors?",
    answer:
      "No seat pricing here. Invite as many helpers, finance teammates, and vendors as you need on every plan."
  },
  {
    question: "How do quarterly, semi-annual, and annual upgrades work?",
    answer:
      "Pick the cadence that fits your runway from the upgrade page. Vendora locks in the rate for your term, and you keep all automation and export features active."
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
              Built for crypto vendor desks
            </span>
            <h1>Start free. Upgrade when your desk needs more volume.</h1>
            <p>
              Vendora is the workspace vendors use to manage buy & sell rates, fulfill customer orders, and send Telegram updates without spreadsheets or manual follow-ups.
            </p>
            <div className="pricing-hero__cta">
              <Button asChild size="lg" className="pricing-cta">
                <Link to="/signup?plan=free">
                  Start free
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#plans">Compare plans</a>
              </Button>
            </div>
            <p className="pricing-hero__note">Every paid plan averages about $0.75 per day—easy to cover with a single trade.</p>
          </div>
        </section>

        <section className="pricing-summary" aria-label="What every plan includes">
          <div className="pricing-summary__grid">
            {pricingSummary.map((item) => (
              <article key={item.title}>
                <span className="pricing-summary__icon">{item.icon}</span>
                <h2>{item.title}</h2>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="pricing-grid" id="plans">
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
              <span className="pricing-flag">What Vendora handles</span>
              <h2>All the moving parts of your vendor desk, covered</h2>
              <p>Open one workspace, invite your teammates, and give customers a Telegram bot that keeps them updated automatically. Vendora keeps your desk tidy so you can focus on volume.</p>
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
            <span className="pricing-flag">Included with every plan</span>
            <h2>Replace spreadsheets, chats, and manual reminders</h2>
            <p>Vendora bundles the tools a vendor desk uses every day—no extra licenses or add-ons required. Start free and keep everything when you upgrade.</p>
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
              <span className="pricing-flag">Launch support</span>
              <h2>Go live fast with help from our team</h2>
              <p>
                We help you import data, configure rates, and launch your Telegram bot. Most desks go live the same week and grow volume without disrupting customers.
              </p>
            </div>
            <div className="pricing-guarantee__points">
              <div>
                <ShieldCheck className="h-5 w-5" aria-hidden />
                <span>Security-first setup with encrypted vendor and customer data</span>
              </div>
              <div>
                <Zap className="h-5 w-5" aria-hidden />
                <span>Webhook automation and receipts to keep finance synced</span>
              </div>
              <div>
                <Users className="h-5 w-5" aria-hidden />
                <span>Live onboarding session included with every upgrade plan</span>
              </div>
            </div>
          </div>
        </section>

        <section className="pricing-faq" id="pricing-faq">
          <div className="pricing-faq__head">
            <span className="pricing-flag">FAQ</span>
            <h2>Answers for busy vendor desks</h2>
            <p>Have something else in mind? Ping us from the app once you create your workspace.</p>
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
              <h2>Create your free Vendora workspace</h2>
              <p>Launch the free plan in minutes, process up to 10 customer orders per day, and upgrade the moment you need more volume.</p>
            </div>
            <div className="pricing-cta__actions">
              <Button asChild size="lg" className="pricing-cta">
                <Link to="/signup?plan=free">
                  Start free today
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/upgrade">See upgrade options</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="pricing-footer">
        <span>© {new Date().getFullYear()} Vendora. Pricing that scales with vendor desks of every size.</span>
        <nav>
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
        </nav>
      </footer>
      <BackToTopButton />
    </div>
  );
};

export default Pricing;
