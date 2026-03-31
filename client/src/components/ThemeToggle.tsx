/*
 * ThemeToggle Component
 * Sun/Moon toggle button for switching between light and dark themes
 */

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface ThemeToggleProps {
  className?: string;
  size?: "sm" | "md";
}

export default function ThemeToggle({ className = "", size = "md" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  const iconSize = size === "sm" ? "w-4 h-4" : "w-[18px] h-[18px]";
  const buttonSize = size === "sm" ? "w-8 h-8" : "w-9 h-9";

  return (
    <button
      onClick={toggleTheme}
      className={`${buttonSize} rounded-full flex items-center justify-center transition-all duration-300 
        bg-secondary hover:bg-accent border border-border
        ${className}`}
      title={theme === "light" ? "Switch to Moon theme" : "Switch to Sun theme"}
      aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
    >
      {theme === "light" ? (
        <Moon className={`${iconSize} text-muted-foreground`} />
      ) : (
        <Sun className={`${iconSize} text-yellow-400`} />
      )}
    </button>
  );
}
