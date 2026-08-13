import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { IconPulse, IconSun, IconMoon } from "./icons";

function AppNavbar({ showLogout }) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const handleLogout = () => {
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
        <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
          {theme === "light" ? <IconMoon width={17} height={17} /> : <IconSun width={17} height={17} />}
        </button>
        <div className="avatar">{(user.name || "U")[0].toUpperCase()}</div>
        {showLogout && (
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        )}
      </div>
    </div>
  );
}

export default AppNavbar;
