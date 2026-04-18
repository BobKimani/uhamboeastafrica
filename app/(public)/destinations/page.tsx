"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DESTINATIONS } from "@/lib/data/destinations";
import { FilterBar } from "@/components/destinations/filter-bar";
import { DestinationCard } from "@/components/destinations/destination-card";
import { Card } from "@/components/ui/card";

function DestinationsView() {
  const params = useSearchParams();
  const [country, setCountry] = useState<string>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const q = params.get("country");
    if (q) setCountry(q);
  }, [params]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return DESTINATIONS.filter((d) => {
      const matchesCountry = country === "all" || d.country === country;
      const matchesQuery =
        !term ||
        d.name.toLowerCase().includes(term) ||
        d.region.toLowerCase().includes(term) ||
        d.tags.some((t) => t.toLowerCase().includes(term));
      return matchesCountry && matchesQuery;
    });
  }, [country, query]);

  return (
    <>
      <header className="pt-24 pb-10 px-6 md:px-10 max-w-7xl mx-auto text-center">
        <span className="text-primary font-headline font-bold text-xs tracking-widest uppercase">
          Destinations
        </span>
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-headline font-extrabold tracking-tight text-on-background mt-4 leading-[1.05]">
          Where will East Africa
          <br /> take you?
        </h1>
        <p className="text-on-surface-variant text-lg md:text-xl mt-5 max-w-2xl mx-auto">
          Browse iconic parks, coasts and highlands across four countries.
        </p>
      </header>

      <FilterBar
        country={country}
        setCountry={setCountry}
        query={query}
        setQuery={setQuery}
      />

      <section className="max-w-7xl mx-auto px-6 md:px-10 py-14">
        {filtered.length === 0 ? (
          <Card className="p-12 border border-outline-variant/15 text-center">
            <p className="text-on-surface font-bold">
              No destinations match that search.
            </p>
            <p className="text-on-surface-variant text-sm mt-2">
              Try clearing filters or picking a different country.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((d) => (
              <DestinationCard key={d.slug} destination={d} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

export default function DestinationsPage() {
  return (
    <div className="min-h-screen pb-24">
      <Suspense fallback={<div className="pt-28" />}>
        <DestinationsView />
      </Suspense>
    </div>
  );
}
