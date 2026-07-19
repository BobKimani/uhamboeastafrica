"use client";

import { cn } from "@/lib/utils";

export type ExperienceCategory = "All" | "Safari" | "Beach" | "Culture" | "City";

const CATEGORIES: ExperienceCategory[] = [
  "All",
  "Safari",
  "Beach",
  "Culture",
  "City",
];

export function CategoryTabs({
  active,
  onChange,
}: {
  active: ExperienceCategory;
  onChange: (c: ExperienceCategory) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar justify-center py-2">
      {CATEGORIES.map((c) => {
        const isActive = c === active;
        return (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={cn(
              "px-6 h-11 rounded-full text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all",
              isActive
                ? "sunset-gradient text-white shadow-lg shadow-primary/20"
                : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
            )}
          >
            {c}
          </button>
        );
      })}
    </div>
  );
}
