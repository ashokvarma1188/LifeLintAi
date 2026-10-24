import { useEffect, useState } from "react";
import { ThemeContext } from "./theme";

// Dark (black, green and red) is the default look; light stays one tap away.
const readSavedTheme = () => {
  try {
    return localStorage.getItem("theme") || "dark";
  } catch {
    return "dark";
  }
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => readSavedTheme());

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("theme", theme);
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
