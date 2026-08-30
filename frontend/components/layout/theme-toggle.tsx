"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

function subscribe() {
  return () => {};
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  const current = mounted ? resolvedTheme ?? theme : "light";
  const next = current === "dark" ? "light" : "dark";

  return (
    <button
      aria-label="Toggle theme"
      onClick={() => setTheme(next)}
      className={cn(
        "p-2 rounded-full text-on-surface-variant hover:text-primary transition-colors active:scale-95",
        className
      )}
    >
      {mounted && current === "dark" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  );
}
