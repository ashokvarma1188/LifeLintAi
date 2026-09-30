import PublicLayout from "../PublicLayout";

function Cookies() {
  return (
    <PublicLayout>
      <div className="pp-container">
        <p className="pp-eyebrow">Legal</p>
        <h1 className="pp-title">Cookie Notice</h1>
        <p className="pp-subtitle">What we store in your browser, and why.</p>

        <div className="pp-prose">
          <h2>What LifeLink AI stores locally</h2>
          <p>We keep things minimal — no third-party ad or tracking cookies.</p>
          <ul>
            <li><strong>Login token</strong> — stored in your browser's local storage so you stay signed in between visits. Removed when you log out.</li>
            <li><strong>Theme preference</strong> — remembers whether you prefer light or dark mode.</li>
            <li><strong>Emergency banner dismissal</strong> — remembers you closed the emergency notice for the rest of your browsing session.</li>
          </ul>

          <h2>No advertising trackers</h2>
          <p>We don't run advertising or cross-site tracking scripts, and we don't sell browsing data to anyone.</p>

          <h2>Managing storage</h2>
          <p>You can clear your browser's local storage at any time from your browser settings — this will simply sign you out and reset your theme preference.</p>
        </div>
      </div>
    </PublicLayout>
  );
}

export default Cookies;
