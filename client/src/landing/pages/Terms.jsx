import PublicLayout from "../PublicLayout";

function Terms() {
  return (
    <PublicLayout>
      <div className="pp-container">
        <p className="pp-eyebrow">Legal</p>
        <h1 className="pp-title">Terms &amp; Conditions</h1>
        <p className="pp-subtitle">The rules for using LifeLink AI, in plain language.</p>
        <p className="pp-updated">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long" })}</p>

        <div className="pp-prose">
          <h2>1. Not a replacement for emergency services</h2>
          <p>
            LifeLink AI helps coordinate a response between civilians and nearby hospitals, police, fire
            stations, and pharmacies. It is <strong>not</strong> a certified emergency dispatch system.
            In any life-threatening situation, call your local emergency number first. The SOS button and
            the AI First-Aid Assistant are aids, not substitutes, for professional emergency care.
          </p>

          <h2>2. Accounts</h2>
          <ul>
            <li>You must provide accurate information when registering, especially your phone number, which hospitals use to find your records.</li>
            <li>You're responsible for keeping your password confidential and for activity under your account.</li>
            <li>Organisation accounts (Hospital, Police, Fire Station, Pharmacy) remain in a "pending" state until an admin approves them, and may be rejected or suspended if the information provided is false or the account is misused.</li>
          </ul>

          <h2>3. Acceptable use</h2>
          <p>Do not use LifeLink AI to send false SOS alerts, misrepresent an organisation's identity, or attempt to access another user's health records without authorisation. Accounts found doing so may be suspended.</p>

          <h2>4. Medical information</h2>
          <p>
            Health records you or a hospital add to your account are for informational and treatment
            purposes. LifeLink AI does not verify the medical accuracy of records entered by users, and the
            AI First-Aid Assistant's responses are general guidance only — always confirm anything
            medication-related with a pharmacist or doctor.
          </p>

          <h2>5. Limitation of liability</h2>
          <p>
            LifeLink AI is provided "as is." We work to keep the platform available and accurate, but we
            cannot guarantee uninterrupted service, and we are not liable for outcomes arising from reliance
            on the platform in place of calling emergency services directly.
          </p>

          <h2>6. Changes to these terms</h2>
          <p>We may update these terms as the platform evolves. Continued use after a change means you accept the updated terms.</p>

          <h2>7. Contact</h2>
          <p>Questions about these terms? Reach out via our Contact page.</p>
        </div>
      </div>
    </PublicLayout>
  );
}

export default Terms;
