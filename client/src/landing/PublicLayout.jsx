import Navbar from "./components/Navbar";
import CtaFooter from "./components/CtaFooter";
import EmergencyBanner from "./components/EmergencyBanner";
import "./theme.css";
import "./landing.css";
import "./publicPage.css";

/** Shared shell for every static public page (Privacy, Terms, FAQ, etc.) — Home keeps its own richer layout. */
function PublicLayout({ children }) {
  return (
    <div className="ll-root">
      <EmergencyBanner />
      <main className="ll-main">
        <Navbar />
        <div className="pp-page">{children}</div>
        <CtaFooter />
      </main>
    </div>
  );
}

export default PublicLayout;
