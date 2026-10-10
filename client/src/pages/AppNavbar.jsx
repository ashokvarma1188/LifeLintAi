import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/theme";
import { IconPulse, IconSun, IconMoon } from "./icons";
import { unlinkPushOnLogout } from "../services/push";
import { useLang } from "../i18n/context";
import LanguageSwitcher from "../components/LanguageSwitcher";

function AppNavbar({ showLogout }) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLang();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const handleLogout = async () => {
    // Stop this device getting the account's SOS notifications once it's signed out.
    await unlinkPushOnLogout();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="dash-navbar">
      <div className="brand" onClick={() => navigate("/dashboard")} style={{ cursor: "pointer" }}>
        <div className="mark">
          <IconPulse width={16} height={16} />
        </div>
        LifeLink AI
      </div>
      <div className="user-area">
        {user.isDemo && (
          <button className="logout-btn" onClick={() => navigate("/settings/role")} title={t("Switch to a different role")}>
            {t("Switch role")}
          </button>
        )}
        <LanguageSwitcher />
        <button className="theme-toggle" onClick={toggleTheme} title={t("Toggle theme")}>
          {theme === "light" ? <IconMoon width={17} height={17} /> : <IconSun width={17} height={17} />}
        </button>
        <div className="avatar">{(user.name || "U")[0].toUpperCase()}</div>
        {showLogout && (
          <button className="logout-btn" onClick={handleLogout}>
            {t("Logout")}
          </button>
        )}
      </div>
    </div>
  );
}

export default AppNavbar;
