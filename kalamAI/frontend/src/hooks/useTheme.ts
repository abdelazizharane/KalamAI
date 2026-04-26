import { useState, useCallback } from "react";

export type Theme = "dark" | "light";

/**
 * Persists the user's UI theme preference across sessions.
 * Defaults to "dark" if not previously set.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("kalamai_theme") as Theme) ?? "dark";
  });

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      localStorage.setItem("kalamai_theme", next);
      return next;
    });
  }, []);

  return { theme, toggle, isDark: theme === "dark" };
}
