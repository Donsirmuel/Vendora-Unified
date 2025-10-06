import React from "react";
import { Link } from "react-router-dom";
import PublicNav from "@/components/PublicNav";
import BackToTopButton from "@/components/BackToTopButton";
import "./legal.css";

const quickSummary = [
  {
    title: "Workspace data stays yours",
    copy: "Orders, receipts, rates, and Telegram chatter belong to your team. We store them so Vendora can power your vendor desk."
  },
  {
    title: "Why we collect it",
    copy: "We use your data to run automation, send alerts, keep accounts secure, and comply with finance and safety rules."
  },
  {
    title: "How to control it",
    copy: "Export or delete records from Settings, limit Telegram data retention, or email privacy@vendora.example for extra help."
  }
];

const toc = [
  { id: "overview", label: "Overview" },
  { id: "information", label: "Information we collect" },
  { id: "use", label: "How we use information" },
  { id: "legal-bases", label: "Legal bases for processing" },
  { id: "sharing", label: "Sharing and disclosure" },
  { id: "retention", label: "Data retention" },
  { id: "security", label: "Security" },
  { id: "choices", label: "Your choices and rights" },
  { id: "transfers", label: "International transfers" },
  { id: "children", label: "Children" },
  { id: "updates", label: "Updates to this policy" },
  { id: "contact", label: "Contact" }
];

export default function Privacy(): JSX.Element {

  return (
    <div className="legal-page">
      <PublicNav variant="solid" />
      <main className="legal-content">
        <header className="legal-header">
          <h1>Privacy Policy</h1>
          <p className="legal-muted">Last updated: September 19, 2025</p>
        </header>

        <section className="legal-summary" aria-label="Quick summary">
          {quickSummary.map((item) => (
            <article key={item.title}>
              <h2>{item.title}</h2>
              <p>{item.copy}</p>
            </article>
          ))}
        </section>
        <nav className="legal-toc" aria-label="Table of contents">
          <span className="legal-toc__title">On this page</span>
          <ol>
            {toc.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`}>{item.label}</a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="legal-body">
          <p>
            Vendora ("we", "us", "our") runs the workspace vendors use to manage orders, payments, and Telegram updates. This Privacy Policy explains how
            we handle the personal and business information that flows through your Vendora desk.
          </p>

          <h2 id="overview" className="legal-section-title">0. Overview</h2>
          <p className="legal-muted">
            We collect the details you provide so Vendora can run your vendor desk: account details, team member info, vendor and customer records,
            Telegram messages, proofs, and payment artifacts. You decide what to add or delete. We never sell your data.
          </p>

          <h2 id="information" className="legal-section-title">1. Information we collect</h2>
          <p className="legal-muted">
            We collect information you provide directly and what is generated as you use Vendora. That includes:
          </p>
          <ul>
            <li>
              <strong>Account and contact details:</strong> names, email addresses, phone numbers, workspace preferences, and authentication data for you
              and invited teammates.
            </li>
            <li>
              <strong>Workspace content:</strong> vendor and customer orders, quotes, payment instructions, receipts, Telegram bot interactions, files you
              upload, and notes you store in Vendora.
            </li>
            <li>
              <strong>Usage and device data:</strong> log data, IP address, device identifiers, browser type, and cookie data that help us protect your
              account and improve performance.
            </li>
          </ul>

          <h2 id="use" className="legal-section-title">2. How we use information</h2>
          <p className="legal-muted">
            We use the information to run your vendor desk, automate Telegram updates, fulfil customer requests, keep accounts secure, and meet legal or
            audit requirements. Typical uses include processing orders, sending alerts, troubleshooting support tickets, analysing workspace health, and
            communicating with you about changes to Vendora.
          </p>

          <h2 id="legal-bases" className="legal-section-title">3. Legal bases for processing (EEA users)</h2>
          <p className="legal-muted">
            If you are an EEA resident, we process personal data under lawful bases like performing our contract with you, obtaining consent when
            required, meeting legal obligations, and protecting our legitimate interest in running and improving Vendora securely.
          </p>

          <h2 id="sharing" className="legal-section-title">4. Sharing and disclosure</h2>
          <p className="legal-muted">
            We share information with trusted service providers that help us host infrastructure, deliver communications, process payments, or provide
            analytics. We may disclose information when required by law or to protect Vendora, our customers, or others from fraud or abuse. We never sell
            personal information.
          </p>

          <h2 id="retention" className="legal-section-title">5. Data retention</h2>
          <p className="legal-muted">
            We retain personal data for as long as your workspace remains active or as needed to provide Vendora. We may keep limited records for legal,
            tax, or anti-fraud reasons after closure. You can export or request deletion of data that is no longer needed for compliance.
          </p>

          <h2 id="security" className="legal-section-title">6. Security</h2>
          <p className="legal-muted">
            We implement encryption, access controls, logging, and other safeguards to protect your workspace. No system is completely secure, so we
            encourage you to use strong passwords, enable two-factor authentication, and review teammate access regularly.
          </p>

          <h2 id="choices" className="legal-section-title">7. Your choices and rights</h2>
          <p className="legal-muted">
            Depending on your location, you may have rights to access, correct, delete, port, or object to our use of your personal data. Most workspace
            data can be managed from Settings. For anything else, contact us using the details below and we will respond as required by law.
          </p>

          <h2 id="transfers" className="legal-section-title">8. International transfers</h2>
          <p className="legal-muted">
            We may transfer personal data to countries outside your own. When we do, we rely on safeguards such as standard contractual clauses or other
            lawful transfer mechanisms recognised by regulators.
          </p>

          <h2 id="children" className="legal-section-title">9. Children</h2>
          <p className="legal-muted">
            The Service is not intended for children under 13. We do not knowingly collect personal information from children under applicable minimum
            ages. If we learn we have collected such information, we will take steps to delete it.
          </p>

          <h2 id="updates" className="legal-section-title">10. Updates to this policy</h2>
          <p className="legal-muted">
            We may update this Privacy Policy to reflect new features or regulations. We will post the revised policy with a new "Last updated" date and,
            if required, notify you through the app or by email.
          </p>

          <h2 id="contact" className="legal-section-title">11. Contact</h2>
          <p className="legal-muted">
            If you have questions or requests regarding this Privacy Policy, contact us at <a href="mailto:privacy@vendora.example">privacy@vendora.example</a> or the
            contact address provided on the Service.
          </p>

          <p className="legal-back">
            <Link to="/">Back to home</Link>
          </p>
        </div>
      </main>
      <BackToTopButton />
    </div>
  );
}