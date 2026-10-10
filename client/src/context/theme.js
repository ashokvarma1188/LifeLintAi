import { createContext, useContext } from "react";

export const ThemeContext = createContext(null);

/** `{ theme, toggleTheme }` — theme is "light" | "dark". */
export const useTheme = () => useContext(ThemeContext);
