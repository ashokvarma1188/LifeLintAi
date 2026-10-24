import { useEffect, useState } from "react";
import { ThemeContext } from "./theme";

// Dark (black, green and red) is the default look; light stays one tap away.
// A new key on purpose: the old "theme" key was saved as "light" for every past visitor,
// whether or not they chose it.
const THEME_KEY = "ll-theme";
const readSavedTheme = () => {
  try {
    return localStorage.getItem(THEME_KEY) || "dark";
  } catch {
    return "dark";
  }
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => readSavedTheme());

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* storage blocked — the choice just isn't remembered */
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
