import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface ThemeToggleProps {
  variant?: "pill" | "sidebar";
}

export function ThemeToggle({ variant = "pill" }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();

  const toggleTheme = () => {
    // Toggle between light and dark
    if (resolvedTheme === "light") {
      setTheme("dark");
    } else {
      setTheme("light");
    }
  };

  if (variant === "pill") {
    return (
      <button
        onClick={toggleTheme}
        className="relative inline-flex h-7 w-14 items-center rounded-full bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        aria-label={`Switch to ${resolvedTheme === "light" ? "dark" : "light"} mode`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-background shadow-sm transition-transform ${
            resolvedTheme === "dark" ? "translate-x-8" : "translate-x-1"
          }`}
        >
          <span className="flex h-full w-full items-center justify-center">
            {resolvedTheme === "light" ? (
              <Sun className="h-3 w-3 text-foreground" />
            ) : (
              <Moon className="h-3 w-3 text-foreground" />
            )}
          </span>
        </span>
      </button>
    );
  }

  // Sidebar variant
  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] transition-colors text-muted-foreground hover:text-foreground hover:bg-muted w-full"
      aria-label={`Switch to ${resolvedTheme === "light" ? "dark" : "light"} mode`}
    >
      {resolvedTheme === "light" ? (
        <Moon size={18} />
      ) : (
        <Sun size={18} />
      )}
      <span>{resolvedTheme === "light" ? "Dark Mode" : "Light Mode"}</span>
    </button>
  );
}
