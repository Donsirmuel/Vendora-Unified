import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, ShieldCheck, Sparkles, Users, Zap } from "lucide-react";
import PublicNav from "@/components/PublicNav";
import BackToTopButton from "@/components/BackToTopButton";
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
    name: "Free",
    price: "$0",
    billing: "forever",
    highlight: "For new crypto vendor desks shipping first orders",
    description: "Run Vendora with up to 10 customer orders per day while you learn the workflow.",
    ctaLabel: "Start free",
    ctaLink: "/signup?plan=free",
    features: [
      "Up to 10 customer orders per day included",
      "Vendora web app to track every order from request to proof",
      "Customer-facing Telegram bot included",
      "Real-time alerts for vendor tasks",
      "Exportable order history",
      "Email support"
    ]
  },
  {
    name: "Monthly",
    price: "$22.99",
    billing: "per month",
    highlight: "For active desks that need unlimited orders and automation",
    description: "Remove the order limit, unlock automation, and keep finance synced every day.",
    ctaLabel: "Upgrade monthly",
    ctaLink: "/upgrade?plan=monthly",
    mostPopular: true,
    features: [
      "Unlimited customer orders per day",
      "Auto-expiry, reminders, and proof collection",
      "Advanced exports for finance and compliance",
      "Priority vendor and customer notifications",
      "In-app and chat support"
    ]
  },
  {
    name: "Quarterly",
    price: "$68.97",
    billing: "every 3 months",
    highlight: "For desks that prefer quarterly savings and predictable billing",
    description: "Get the monthly plan benefits with a quarterly commitment and bundled savings.",
    ctaLabel: "Upgrade quarterly",
    ctaLink: "/upgrade?plan=quarterly",
    features: [
      "Everything in Monthly",
      "Quarterly performance summary",
      "Priority review of feature requests",
      "Savings compared to paying monthly",
      "Shared inbox for vendor teammates"
    ]
  },
  {
    name: "Semi-Annual",
    price: "$137.94",
    billing: "every 6 months",
    highlight: "For desks that want long-term value and deeper analytics",
    description: "Lock in six months of unlimited orders with runway for growth and advanced insights.",
    ctaLabel: "Upgrade semi-annual",
    ctaLink: "/upgrade?plan=semi-annual",
    features: [
      "Everything in Quarterly",
      "Advanced revenue and payout analytics",
      "Dedicated success check-ins",
      "Custom labels for order tracking",
      "Invite-only beta features"
    ]
  },
  {
    name: "Annual",
    price: "$275.88",
    billing: "per year",
    highlight: "Best value for desks that run Vendora every day",
    description: "Secure a full year of Vendora with the lowest rate, premium support, and roadmap input.",
    ctaLabel: "Upgrade annual",
    ctaLink: "/upgrade?plan=annual",
    features: [
      "Everything in Semi-Annual",
      "Priority queue for support and onboarding",
      "Quarterly roadmap sessions with Vendora team",
      "White-label customer notifications",
      "Guaranteed pricing for renewal"
    ]
  }
];
const valueStats = [
  {
    label: "Manage every order",
    value: "One workspace",
    description: "Approve, fulfill, and reconcile vendor orders without hopping between chats and sheets."
  },
  {
    label: "Keep customers updated",
    value: "Telegram included",
    description: "Send automatic status updates, proof requests, and finished order notifications from one bot."
  },
  {
    label: "Stay audit ready",
    value: "Automatic records",
    description: "Track payments, proofs, and payouts with exports your finance team can trust."
  }
];

const addOns = [
  {
    title: "Vendor operations workspace",
    body: "Track quotes, approvals, proofs, and payouts in one interface built for desk operators.",
    icon: <Zap className="h-6 w-6" aria-hidden />
  },
  {
    title: "Telegram automation",
    body: "Customers place orders, upload proofs, and get status updates through your branded bot automatically.",
    icon: <Sparkles className="h-6 w-6" aria-hidden />
  },
  {
    title: "Rate and receipt controls",
    body: "Update buy/sell rates instantly and collect receipts so finance is never chasing screenshots.",
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
      "No seat pricing here. Invite as many operators, finance teammates, and vendors as you need on every plan."
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
            <p className="pricing-hero__note">
              All paid plans come out to just $0.75 per day, so scaling Vendora never costs more than loose change.
            </p>
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
              <p>Open one workspace, invite your teammates, and give customers a Telegram bot that keeps them updated automatically. Vendora keeps operations tidy so you can focus on volume.</p>
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
            <p>Vendora bundles the tools a desk uses daily—no extra licenses or add-ons required. Start free and keep everything when you upgrade.</p>
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
              <h2>Onboard in days with our rollout checklist</h2>
              <p>
                We help you import vendors, configure rates, and ship your Telegram bot. Most desks go live the same week and scale volume without disrupting customers.
              </p>
            </div>
            <div className="pricing-guarantee__points">
              <div>
                <ShieldCheck className="h-5 w-5" aria-hidden />
                <span>Security-first architecture with encrypted vendor and customer data</span>
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
            <h2>Answers for busy vendor operators</h2>
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
        <span>© {new Date().getFullYear()} Vendora. Pricing that scales with operators and vendors alike.</span>
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
