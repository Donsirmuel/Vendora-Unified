import React from "react";
import { Link } from "react-router-dom";

export default function Terms(): JSX.Element {
  const main = { fontFamily: "Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif", maxWidth: 900, margin: "40px auto", padding: "0 20px", color: "#f1f5f9", lineHeight: 1.6, background: "transparent" };
  const muted = { color: "#94a3b8" };
  return (
    <main style={main}>
      <h1 style={{ color: "#fff" }}>Terms of Service</h1>
      <p style={muted}>Last updated: September 19, 2025</p>

      <p style={{ color: "#fff" }}>Welcome to Vendora. These Terms of Service ("Terms") govern your access to and use of the Vendora website, mobile applications and any related services (collectively, the "Service"). By accessing or using the Service you agree to be bound by these Terms. If you do not agree, do not access or use the Service.</p>

      <h2 style={{ color: "#fff", marginTop: 18 }}>1. Eligibility</h2>
      <p style={muted}>You must be at least 18 years old and have the legal capacity to enter into a contract to use the Service. By using the Service you represent and warrant that you meet these requirements and that any information you provide is accurate and complete.</p>

      <h2 style={{ color: "#fff", marginTop: 18 }}>2. Accounts</h2>
      <p style={muted}>To use certain features you must create an account. You agree to (a) provide accurate, current and complete information, (b) maintain and promptly update your account information, and (c) keep your password and account credentials secure. You are responsible for all activity that occurs under your account. Notify us immediately of any unauthorized use.</p>

      <h2 style={{ color: "#fff", marginTop: 18 }}>3. Use of the Service</h2>
      <p style={muted}>You may use the Service only in compliance with these Terms and all applicable laws. You agree not to use the Service in any unlawful manner, to infringe others' rights, or to interfere with the operation of the Service. You agree not to circumvent any technical restrictions or security features of the Service.</p>

      <h2 style={{ color: "#fff", marginTop: 18 }}>4. User Content</h2>
      <p style={muted}>You retain ownership of content you submit to the Service ("User Content"). By submitting User Content, you grant Vendora a worldwide, non-exclusive, royalty-free, sublicensable and transferable license to host, use, copy, modify, distribute, and display such content as reasonably necessary to provide and improve the Service.</p>

      <h2 style={{ color: "#fff", marginTop: 18 }}>5. Payments and Fees</h2>
      <p style={muted}>Some features may be subject to fees. Payment terms will be presented at the time of purchase and are subject to change. All fees are non-refundable except as required by law or as expressly provided by Vendora. You are responsible for taxes associated with paid features.</p>

      <h2 style={{ color: "#fff", marginTop: 18 }}>6. Trial Periods</h2>
      <p style={muted}>Vendora may offer trial periods with limited access. Trial features and duration are specified at sign-up. Vendora may modify or terminate trial offers at any time. You are responsible for canceling before the trial ends if you do not wish to be charged for any paid subscription.</p>

      <h2 style={{ color: "#fff", marginTop: 18 }}>7. Prohibited Conduct</h2>
      <p style={muted}>You must not: (a) impersonate others; (b) access or attempt to access another user's account; (c) use the Service for any illegal activity; (d) interfere with the Service's operation; or (e) reverse engineer or attempt to extract source code from the Service.</p>

      <h2 style={{ color: "#fff", marginTop: 18 }}>8. Termination</h2>
      <p style={muted}>We may suspend or terminate your access to the Service at any time for breach of these Terms or for any reason with notice where required by law. Upon termination, your right to use the Service ceases and Vendora may delete or disable access to your User Content subject to our Privacy Policy and applicable law.</p>

      <h2 style={{ color: "#fff", marginTop: 18 }}>9. Disclaimers</h2>
      <p style={muted}>The Service is provided "as is" and "as available" without warranties of any kind, express or implied. Vendora disclaims all warranties, including merchantability, fitness for a particular purpose, and non-infringement. We do not guarantee the Service will be uninterrupted, secure, or error-free.</p>

      <h2 style={{ color: "#fff", marginTop: 18 }}>10. Limitation of Liability</h2>
      <p style={muted}>To the maximum extent permitted by law, Vendora and its affiliates, officers, directors, employees and agents will not be liable for indirect, incidental, special, consequential or exemplary damages arising from your use of the Service. Vendora's aggregate liability for direct damages is limited to the amount you paid us in the 12 months preceding the claim, or one hundred U.S. dollars (USD 100), whichever is greater.</p>

      <h2 style={{ color: "#fff", marginTop: 18 }}>11. Indemnification</h2>
      <p style={muted}>You agree to indemnify, defend and hold harmless Vendora and its officers, directors, employees and agents from any claims, liabilities, damages, losses and expenses, including reasonable attorneys' fees, arising out of or in any way connected with your violation of these Terms or your use of the Service.</p>

      <h2 style={{ color: "#fff", marginTop: 18 }}>12. Changes to Terms</h2>
      <p style={muted}>We may modify these Terms from time to time. If we make material changes we will provide notice by posting the updated Terms on the Service or via email. Continued use of the Service after changes constitutes acceptance of the updated Terms.</p>

      <h2 style={{ color: "#fff", marginTop: 18 }}>13. Governing Law and Dispute Resolution</h2>
      <p style={muted}>These Terms are governed by the laws of the jurisdiction specified in our application settings or website footer, without regard to conflict of law rules. Disputes will be resolved in the courts located in that jurisdiction unless you and Vendora agree otherwise.</p>

      <h2 style={{ color: "#fff", marginTop: 18 }}>14. Contact</h2>
      <p style={muted}>If you have questions about these Terms, contact us at <a style={{ color: "#7dd3fc" }} href="mailto:support@vendora.example">support@vendora.example</a> or the address provided on the Service.</p>

      <p style={{ marginTop: 28 }}><Link to="/" style={{ color: "#7dd3fc" }}>Back to home</Link></p>
    </main>
  );
}