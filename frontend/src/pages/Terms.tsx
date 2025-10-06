import React from "react";
import { Link } from "react-router-dom";
import PublicNav, { PublicNavLink } from "@/components/PublicNav";
import BackToTopButton from "@/components/BackToTopButton";
import "./legal.css";

export default function Terms(): JSX.Element {
  const navLinks: PublicNavLink[] = [
    { label: "Home", href: "/", type: "route" },
    { label: "Product", href: "/#product", type: "route" },
    { label: "How it works", href: "/#how-it-works", type: "route" },
    { label: "Pricing", href: "/pricing", type: "route" },
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
          <h1>Terms of Service</h1>
          <p className="legal-muted">Last updated: September 19, 2025</p>
        </header>

        <p>
          Welcome to Vendora. These Terms of Service ("Terms") govern your access to and use of the Vendora website, mobile applications and any
          related services (collectively, the "Service"). By accessing or using the Service you agree to be bound by these Terms. If you do not agree,
          do not access or use the Service.
        </p>

        <h2 className="legal-section-title">1. Eligibility</h2>
        <p className="legal-muted">
          You must be at least 18 years old and have the legal capacity to enter into a contract to use the Service. By using the Service you represent
          and warrant that you meet these requirements and that any information you provide is accurate and complete.
        </p>

        <h2 className="legal-section-title">2. Accounts</h2>
        <p className="legal-muted">
          To use certain features you must create an account. You agree to (a) provide accurate, current and complete information, (b) maintain and
          promptly update your account information, and (c) keep your password and account credentials secure. You are responsible for all activity that
          occurs under your account. Notify us immediately of any unauthorized use.
        </p>

        <h2 className="legal-section-title">3. Use of the Service</h2>
        <p className="legal-muted">
          You may use the Service only in compliance with these Terms and all applicable laws. You agree not to use the Service in any unlawful manner,
          to infringe others&apos; rights, or to interfere with the operation of the Service. You agree not to circumvent any technical restrictions or
          security features of the Service.
        </p>

        <h2 className="legal-section-title">4. User Content</h2>
        <p className="legal-muted">
          You retain ownership of content you submit to the Service ("User Content"). By submitting User Content, you grant Vendora a worldwide,
          non-exclusive, royalty-free, sublicensable and transferable license to host, use, copy, modify, distribute, and display such content as
          reasonably necessary to provide and improve the Service.
        </p>

        <h2 className="legal-section-title">5. Payments and Fees</h2>
        <p className="legal-muted">
          Some features may be subject to fees. Payment terms will be presented at the time of purchase and are subject to change. All fees are
          non-refundable except as required by law or as expressly provided by Vendora. You are responsible for taxes associated with paid features.
        </p>

        <h2 className="legal-section-title">6. Trial Periods</h2>
        <p className="legal-muted">
          Vendora may offer trial periods with limited access. Trial features and duration are specified at sign-up. Vendora may modify or terminate
          trial offers at any time. You are responsible for canceling before the trial ends if you do not wish to be charged for any paid subscription.
        </p>

        <h2 className="legal-section-title">7. Prohibited Conduct</h2>
        <p className="legal-muted">
          You must not: (a) impersonate others; (b) access or attempt to access another user&apos;s account; (c) use the Service for any illegal activity;
          (d) interfere with the Service&apos;s operation; or (e) reverse engineer or attempt to extract source code from the Service.
        </p>

        <h2 className="legal-section-title">8. Termination</h2>
        <p className="legal-muted">
          We may suspend or terminate your access to the Service at any time for breach of these Terms or for any reason with notice where required by
          law. Upon termination, your right to use the Service ceases and Vendora may delete or disable access to your User Content subject to our
          Privacy Policy and applicable law.
        </p>

        <h2 className="legal-section-title">9. Disclaimers</h2>
        <p className="legal-muted">
          The Service is provided "as is" and "as available" without warranties of any kind, express or implied. Vendora disclaims all warranties,
          including merchantability, fitness for a particular purpose, and non-infringement. We do not guarantee the Service will be uninterrupted,
          secure, or error-free.
        </p>

        <h2 className="legal-section-title">10. Limitation of Liability</h2>
        <p className="legal-muted">
          To the maximum extent permitted by law, Vendora and its affiliates, officers, directors, employees and agents will not be liable for indirect,
          incidental, special, consequential or exemplary damages arising from your use of the Service. Vendora&apos;s aggregate liability for direct
          damages is limited to the amount you paid us in the 12 months preceding the claim, or one hundred U.S. dollars (USD 100), whichever is
          greater.
        </p>

        <h2 className="legal-section-title">11. Indemnification</h2>
        <p className="legal-muted">
          You agree to indemnify, defend and hold harmless Vendora and its officers, directors, employees and agents from any claims, liabilities,
          damages, losses and expenses, including reasonable attorneys&apos; fees, arising out of or in any way connected with your violation of these Terms
          or your use of the Service.
        </p>

        <h2 className="legal-section-title">12. Changes to Terms</h2>
        <p className="legal-muted">
          We may modify these Terms from time to time. If we make material changes we will provide notice by posting the updated Terms on the Service or
          via email. Continued use of the Service after changes constitutes acceptance of the updated Terms.
        </p>

        <h2 className="legal-section-title">13. Governing Law and Dispute Resolution</h2>
        <p className="legal-muted">
          These Terms are governed by the laws of the jurisdiction specified in our application settings or website footer, without regard to conflict
          of law rules. Disputes will be resolved in the courts located in that jurisdiction unless you and Vendora agree otherwise.
        </p>

        <h2 className="legal-section-title">14. Contact</h2>
        <p className="legal-muted">
          If you have questions about these Terms, contact us at <a href="mailto:support@vendora.example">support@vendora.example</a> or the address
          provided on the Service.
        </p>

        <p className="legal-back">
          <Link to="/">Back to home</Link>
        </p>
      </main>
      <BackToTopButton />
    </div>
  );
}