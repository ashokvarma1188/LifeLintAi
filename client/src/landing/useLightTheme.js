import { useState, useEffect } from "react";

const STORAGE_KEY = "ll-light-theme";

/** Shared light/dark state for the public landing + auth pages, persisted across navigation. */
export function useLightTheme() {
  const [light, setLight] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(light));
    } catch {
      // Private browsing / blocked storage — theme just won't persist, not critical.
    }
  }, [light]);

  return [light, setLight];
}
