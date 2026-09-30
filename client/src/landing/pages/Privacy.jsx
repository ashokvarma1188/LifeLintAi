import PublicLayout from "../PublicLayout";

function Privacy() {
  return (
    <PublicLayout>
      <div className="pp-container">
        <p className="pp-eyebrow">Legal</p>
        <h1 className="pp-title">Privacy Policy</h1>
        <p className="pp-subtitle">
          How LifeLink AI collects, uses, and protects your information — written in plain language.
        </p>
        <p className="pp-updated">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long" })}</p>

        <div className="pp-prose">
          <h2>What we collect</h2>
          <p>We collect only what's needed to connect you with help during an emergency and to keep your care history in one place:</p>
          <ul>
            <li><strong>Account details</strong> — name, email, phone number, password (stored hashed, never in plain text).</li>
            <li><strong>Health information</strong> — blood group, medical history, allergies, and any medical records you or a hospital add to your account.</li>
            <li><strong>Emergency contacts</strong> — names, phone numbers, and relationships you choose to add.</li>
            <li><strong>Location</strong> — captured only at the moment you press the SOS button, to find the nearest hospital.</li>
            <li><strong>Organisation details</strong> — for Hospital, Police, Fire Station, and Pharmacy accounts: organisation name, address, and operational status (beds, stock, fleet, hours).</li>
          </ul>

          <h2>How we use it</h2>
          <p>Your data is used strictly to operate the platform: matching an SOS alert to the nearest hospital, letting hospital staff look up your records during treatment, letting responders (police, fire, pharmacy) act on relevant alerts, and letting our AI First-Aid Assistant give you general guidance when you ask it a question.</p>

          <h2>Who can see what</h2>
          <ul>
            <li>Your health records are visible to you and to any hospital account that looks you up by your registered phone number — this is designed for real emergency and treatment situations.</li>
            <li>Your location is shared only with the hospital matched to your SOS alert, and with police/fire accounts responding to it.</li>
            <li>Organisation (Hospital/Police/Fire/Pharmacy) accounts are reviewed and approved by an admin before they gain access to any of this data.</li>
            <li>We never sell your data to third parties, and we never use it for advertising.</li>
          </ul>

          <h2>The AI First-Aid Assistant</h2>
          <p>Messages you send to the assistant are sent to Google's Gemini API to generate a response. We do not use your conversations to train any model, and the assistant does not have access to your health records or personal account data unless you type it into the chat yourself.</p>

          <h2>Data retention & your rights</h2>
          <p>You can update your profile and health records at any time from your dashboard. If you'd like your account and associated data deleted entirely, contact us (see our Contact page) and we will process the request as quickly as we reasonably can.</p>

          <h2>Security</h2>
          <p>Passwords are hashed with bcrypt and never stored or transmitted in plain text. All traffic between your browser and our servers is encrypted (HTTPS). Access to organisation-level features requires admin approval, and role-restricted API routes are enforced on our backend, not just hidden in the interface.</p>

          <h2>Questions</h2>
          <p>If anything here is unclear, reach out via the Contact page — we're a small team and happy to explain exactly what happens with your data.</p>
        </div>
      </div>
    </PublicLayout>
  );
}

export default Privacy;
