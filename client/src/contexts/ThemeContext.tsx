import React, { createContext, useContext, useLayoutEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  /** Convenience: true when theme === "light" */
  isSun: boolean;
  /** Convenience: true when theme === "dark" */
  isMoon: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("grantkit-theme");
    return (stored as Theme) || defaultTheme;
  });

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("grantkit-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    // Temporarily suppress all CSS transitions to prevent browser freeze
    // when hundreds of elements simultaneously re-paint on theme change.
    const style = document.createElement("style");
    style.id = "__gk-no-transition__";
    style.textContent =
      "*, *::before, *::after { transition: none !important; animation-duration: 0.01ms !important; }";
    document.head.appendChild(style);

    setTheme(prev => (prev === "light" ? "dark" : "light"));

    // Re-enable after the browser has painted the new theme (two rAFs = next frame)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById("__gk-no-transition__")?.remove();
      });
    });
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        isSun: theme === "light",
        isMoon: theme === "dark",
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
