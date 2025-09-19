import React from "react";
import { Link } from "react-router-dom";

export default function Privacy(): JSX.Element {
  const main = { fontFamily: "Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif", maxWidth: 900, margin: "40px auto", padding: "0 20px", color: "#f1f5f9", lineHeight: 1.6 };
  const muted = { color: "#94a3b8" };

  return (
    <main style={main}>
      <h1 style={{ color: "#fff" }}>Privacy Policy</h1>
      <p style={muted}>Last updated: September 19, 2025</p>

      <p style={{ color: "#fff" }}>Vendora ("we", "us", "our") respects your privacy. This Privacy Policy explains how we collect, use, disclose, and protect your personal information when you use our Service.</p>

      <h2 style={{ color: "#fff", marginTop: 18 }}>1. Information We Collect</h2>
      <p style={muted}>We collect information you provide directly (e.g., account registration, profile information, uploaded documents), information from your use of the Service (e.g., orders, transactions, preferences), and technical information (e.g., IP address, device identifiers, browser type, cookies).</p>

      <h2 style={{ color: "#fff", marginTop: 18 }}>2. How We Use Information</h2>
      <p style={muted}>We use the information to provide, maintain, and improve the Service; to process transactions and communicate with you; to provide customer support; to detect and prevent fraud or abuse; and to comply with legal obligations.</p>

      <h2 style={{ color: "#fff", marginTop: 18 }}>3. Legal Bases for Processing (EEA Users)</h2>
      <p style={muted}>If you are an EEA resident, we process personal data on legal bases including performance of a contract, consent, compliance with legal obligations, and our legitimate interests in operating and improving the Service.</p>

      <h2 style={{ color: "#fff", marginTop: 18 }}>4. Sharing and Disclosure</h2>
      <p style={muted}>We may share information with service providers who process data on our behalf (e.g., hosting, payment processing), with affiliates, and as required by law. We do not sell personal information to third parties.</p>

      <h2 style={{ color: "#fff", marginTop: 18 }}>5. Data Retention</h2>
      <p style={muted}>We retain personal data for as long as necessary to fulfill the purposes described in this policy, to comply with legal obligations, to resolve disputes, and to enforce our agreements.</p>

      <h2 style={{ color: "#fff", marginTop: 18 }}>6. Security</h2>
      <p style={muted}>We implement reasonable administrative, technical, and physical safeguards to protect personal data. However, no security measure is perfect; we cannot guarantee the absolute security of information transmitted to or stored by us.</p>

      <h2 style={{ color: "#fff", marginTop: 18 }}>7. Your Rights</h2>
      <p style={muted}>Depending on your jurisdiction, you may have rights to access, correct, delete, or port your personal data, and to object to or restrict certain processing. To exercise rights, contact us at the address below. We will respond in accordance with applicable law.</p>

      <h2 style={{ color: "#fff", marginTop: 18 }}>8. International Transfers</h2>
      <p style={muted}>We may transfer personal data to countries with different data protection laws. Where required, we will take steps to ensure appropriate safeguards for such transfers.</p>

      <h2 style={{ color: "#fff", marginTop: 18 }}>9. Children</h2>
      <p style={muted}>The Service is not intended for children under 13. We do not knowingly collect personal information from children under applicable minimum ages. If we learn we have collected such information, we will take steps to delete it.</p>

      <h2 style={{ color: "#fff", marginTop: 18 }}>10. Updates to This Policy</h2>
      <p style={muted}>We may update this Privacy Policy. We will post the revised policy with a new "Last updated" date; significant changes will be communicated as required by law.</p>

      <h2 style={{ color: "#fff", marginTop: 18 }}>11. Contact</h2>
      <p style={muted}>If you have questions or requests regarding this Privacy Policy, contact us at <a style={{ color: "#7dd3fc" }} href="mailto:privacy@vendora.example">privacy@vendora.example</a> or the contact address provided on the Service.</p>

      <p style={{ marginTop: 28 }}><Link to="/" style={{ color: "#7dd3fc" }}>Back to home</Link></p>
    </main>
  );
}