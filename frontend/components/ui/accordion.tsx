"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type AccordionItem = { q: string; a: string };

export function Accordion({ items }: { items: AccordionItem[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-outline-variant/15">
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className="py-2">
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-6 py-5 text-left group"
            >
              <span className="font-headline text-lg font-bold text-on-surface">
                {it.q}
              </span>
              <ChevronDown
                className={cn(
                  "h-5 w-5 text-primary transition-transform duration-300 shrink-0",
                  isOpen && "rotate-180"
                )}
              />
            </button>
            <div
              className={cn(
                "grid transition-all duration-500 ease-in-out",
                isOpen
                  ? "grid-rows-[1fr] opacity-100 pb-5"
                  : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="overflow-hidden">
                <p className="text-secondary leading-relaxed max-w-2xl">
                  {it.a}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
