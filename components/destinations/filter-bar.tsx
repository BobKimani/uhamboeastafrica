"use client";

import { Search } from "lucide-react";
import { COUNTRIES } from "@/lib/data/countries";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function FilterBar({
  country,
  setCountry,
  query,
  setQuery,
}: {
  country: string;
  setCountry: (slug: string) => void;
  query: string;
  setQuery: (value: string) => void;
}) {
  const pills = [{ slug: "all", name: "All" }, ...COUNTRIES];
  return (
    <div className="bg-background/85 backdrop-blur-xl border-b border-outline-variant/10 py-5">
      <div className="max-w-7xl mx-auto px-6 md:px-10 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {pills.map((p) => {
            const active = country === p.slug;
            return (
              <button
                key={p.slug}
                onClick={() => setCountry(p.slug)}
                className={cn(
                  "px-5 h-10 rounded-full text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all",
                  active
                    ? "sunset-gradient text-white shadow-lg shadow-primary/20"
                    : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
                )}
              >
                {p.name}
              </button>
            );
          })}
        </div>
        <div className="relative md:ml-auto md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant/60 pointer-events-none" />
          <Input
            placeholder="Search destinations"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-11"
          />
        </div>
      </div>
    </div>
  );
}
