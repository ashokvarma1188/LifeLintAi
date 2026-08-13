import { Sun, Moon } from "lucide-react";

/** Floating palette switch, pinned bottom-right as on the reference. */
function ThemeToggle({ light, onToggle }) {
  return (
    <button
      type="button"
      className="ll-theme-toggle"
      onClick={onToggle}
      aria-label={light ? "Switch to dark theme" : "Switch to light theme"}
      aria-pressed={light}
    >
      {light ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}

export default ThemeToggle;
