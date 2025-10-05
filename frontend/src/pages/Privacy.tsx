import React from "react";
import { Link } from "react-router-dom";
import PublicNav, { PublicNavLink } from "@/components/PublicNav";
import "./legal.css";

export default function Privacy(): JSX.Element {
  const navLinks: PublicNavLink[] = [
    { label: "Home", href: "/", type: "route" },
    { label: "Product", href: "/#product", type: "route" },
    { label: "How it works", href: "/#how-it-works", type: "route" },
    { label: "Terms", href: "/terms", type: "route" },
    { label: "Privacy", href: "/privacy", type: "route" },
    { label: "Sign Up", href: "/signup", type: "route", variant: "accent" },
    { label: "Login", href: "/login", type: "route" }
  ];

  return (
    <div className="legal-page">
      <PublicNav variant="solid" links={navLinks} />
      <main className="legal-content">
        <header className="legal-header">
          <h1>Privacy Policy</h1>
          <p className="legal-muted">Last updated: September 19, 2025</p>
        </header>

        <p>
          Vendora ("we", "us", "our") respects your privacy. This Privacy Policy explains how we collect, use, disclose, and protect your personal
          information when you use our Service.
        </p>

        <h2 className="legal-section-title">1. Information We Collect</h2>
        <p className="legal-muted">
          We collect information you provide directly (e.g., account registration, profile information, uploaded documents), information from your use
          of the Service (e.g., orders, transactions, preferences), and technical information (e.g., IP address, device identifiers, browser type,
          cookies).
        </p>

        <h2 className="legal-section-title">2. How We Use Information</h2>
        <p className="legal-muted">
          We use the information to provide, maintain, and improve the Service; to process transactions and communicate with you; to provide customer
          support; to detect and prevent fraud or abuse; and to comply with legal obligations.
        </p>

        <h2 className="legal-section-title">3. Legal Bases for Processing (EEA Users)</h2>
        <p className="legal-muted">
          If you are an EEA resident, we process personal data on legal bases including performance of a contract, consent, compliance with legal
          obligations, and our legitimate interests in operating and improving the Service.
        </p>

        <h2 className="legal-section-title">4. Sharing and Disclosure</h2>
        <p className="legal-muted">
          We may share information with service providers who process data on our behalf (e.g., hosting, payment processing), with affiliates, and as
          required by law. We do not sell personal information to third parties.
        </p>

        <h2 className="legal-section-title">5. Data Retention</h2>
        <p className="legal-muted">
          We retain personal data for as long as necessary to fulfill the purposes described in this policy, to comply with legal obligations, to
          resolve disputes, and to enforce our agreements.
        </p>

        <h2 className="legal-section-title">6. Security</h2>
        <p className="legal-muted">
          We implement reasonable administrative, technical, and physical safeguards to protect personal data. However, no security measure is perfect;
          we cannot guarantee the absolute security of information transmitted to or stored by us.
        </p>

        <h2 className="legal-section-title">7. Your Rights</h2>
        <p className="legal-muted">
          Depending on your jurisdiction, you may have rights to access, correct, delete, or port your personal data, and to object to or restrict
          certain processing. To exercise rights, contact us at the address below. We will respond in accordance with applicable law.
        </p>

        <h2 className="legal-section-title">8. International Transfers</h2>
        <p className="legal-muted">
          We may transfer personal data to countries with different data protection laws. Where required, we will take steps to ensure appropriate
          safeguards for such transfers.
        </p>

        <h2 className="legal-section-title">9. Children</h2>
        <p className="legal-muted">
          The Service is not intended for children under 13. We do not knowingly collect personal information from children under applicable minimum
          ages. If we learn we have collected such information, we will take steps to delete it.
        </p>

        <h2 className="legal-section-title">10. Updates to This Policy</h2>
        <p className="legal-muted">
          We may update this Privacy Policy. We will post the revised policy with a new "Last updated" date; significant changes will be communicated as
          required by law.
        </p>

        <h2 className="legal-section-title">11. Contact</h2>
        <p className="legal-muted">
          If you have questions or requests regarding this Privacy Policy, contact us at <a href="mailto:privacy@vendora.example">privacy@vendora.example</a> or the
          contact address provided on the Service.
        </p>

        <p className="legal-back">
          <Link to="/">Back to home</Link>
        </p>
      </main>
    </div>
  );
}