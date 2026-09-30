import { Mail, HelpCircle, Building2 } from "lucide-react";
import PublicLayout from "../PublicLayout";

function Contact() {
  return (
    <PublicLayout>
      <div className="pp-container">
        <p className="pp-eyebrow">Get in touch</p>
        <h1 className="pp-title">Contact &amp; support</h1>
        <p className="pp-subtitle">
          In an emergency, use the SOS button in the app or call your local emergency number — this page
          is for everything else.
        </p>

        <div className="pp-contact-card">
          <Mail size={18} />
          <div>
            <h3>General support</h3>
            <p>Questions about your account, a bug you've found, or anything else: <a href="mailto:support@lifelinkai.app">support@lifelinkai.app</a></p>
          </div>
        </div>

        <div className="pp-contact-card">
          <Building2 size={18} />
          <div>
            <h3>Organisation registration</h3>
            <p>Hospitals, Police, Fire Stations, and Pharmacies — see our <a href="/organizations">For Organizations</a> page, or email <a href="mailto:partners@lifelinkai.app">partners@lifelinkai.app</a> with questions before signing up.</p>
          </div>
        </div>

        <div className="pp-contact-card">
          <HelpCircle size={18} />
          <div>
            <h3>Common questions</h3>
            <p>Check our <a href="/faq">FAQ</a> first — most questions about SOS, donations, and verification are answered there.</p>
          </div>
        </div>

        <p className="pp-prose" style={{ marginTop: 24, color: "var(--ll-muted-foreground)", fontSize: 13.5 }}>
          A live in-app chat support system is on our roadmap — for now, email is the fastest way to reach us.
        </p>
      </div>
    </PublicLayout>
  );
}

export default Contact;
