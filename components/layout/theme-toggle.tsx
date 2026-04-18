"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = mounted ? resolvedTheme ?? theme : "light";
  const next = current === "dark" ? "light" : "dark";

  return (
    <button
      aria-label="Toggle theme"
      onClick={() => setTheme(next)}
      className="p-2 rounded-full text-on-surface-variant hover:text-primary transition-colors active:scale-95"
    >
      {mounted && current === "dark" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  );
}
