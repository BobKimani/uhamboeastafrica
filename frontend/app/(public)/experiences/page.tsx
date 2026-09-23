"use client";

import { useMemo, useState } from "react";
import { EXPERIENCES } from "@/lib/data/experiences";
import {
  CategoryTabs,
  type ExperienceCategory,
} from "@/components/experiences/category-tabs";
import { ExperienceCard } from "@/components/experiences/experience-card";
import { Card } from "@/components/ui/card";

export default function ExperiencesPage() {
  const [active, setActive] = useState<ExperienceCategory>("All");

  const filtered = useMemo(() => {
    if (active === "All") return EXPERIENCES;
    return EXPERIENCES.filter((e) => e.category === active);
  }, [active]);

  return (
    <div className="min-h-screen pb-24">
      <header className="pt-24 pb-10 px-6 md:px-10 max-w-7xl mx-auto text-center">
        <span className="text-primary font-headline font-bold text-xs tracking-widest uppercase">
          Experiences
        </span>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-headline font-extrabold tracking-tight text-on-background mt-4 leading-[1.1]">
          Moments, curated
        </h1>
        <p className="text-on-surface-variant text-lg md:text-xl mt-5 max-w-2xl mx-auto">
          From river crossings to spice markets — the stories worth flying for.
        </p>
      </header>

      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <CategoryTabs active={active} onChange={setActive} />
      </div>

      <section className="max-w-7xl mx-auto px-6 md:px-10 py-14">
        {filtered.length === 0 ? (
          <Card className="p-12 border border-outline-variant/15 text-center">
            <p className="text-on-surface font-bold">Nothing here yet.</p>
            <p className="text-on-surface-variant text-sm mt-2">
              Try another category.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((e) => (
              <ExperienceCard key={e.id} experience={e} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
