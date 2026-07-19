"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FilterBar } from "@/components/destinations/filter-bar";
import { DestinationCard } from "@/components/destinations/destination-card";
import { CurrencyToggle } from "@/components/shared/currency-toggle";
import { Card } from "@/components/ui/card";
import { useCurrencyPreference } from "@/lib/use-currency-preference";
import { useHotels } from "@/lib/use-hotels";

function DestinationsContent({ initialCountry }: { initialCountry: string }) {
  const [country, setCountry] = useState<string>(initialCountry);
  const [query, setQuery] = useState("");
  const { currency, setCurrency } = useCurrencyPreference();
  const { hotels, hydrated } = useHotels();

  const filtered = useMemo(() => {
    if (!hydrated) return [];

    const term = query.trim().toLowerCase();
    return hotels.filter((hotel) => {
      const matchesAvailability = hotel.isAvailable;
      const matchesCountry = country === "all" || hotel.country === country;
      const matchesQuery =
        !term ||
        hotel.name.toLowerCase().includes(term) ||
        hotel.destination.toLowerCase().includes(term) ||
        hotel.region.toLowerCase().includes(term) ||
        hotel.tags.some((t) => t.toLowerCase().includes(term));
      return matchesAvailability && matchesCountry && matchesQuery;
    });
  }, [country, query, hotels, hydrated]);

  return (
    <>
      <header className="pt-24 pb-10 px-6 md:px-10 max-w-7xl mx-auto text-center">
        <span className="text-primary font-headline font-bold text-xs tracking-widest uppercase">
          Hotels
        </span>
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-headline font-extrabold tracking-tight text-on-background mt-4 leading-[1.05]">
          Real stays across
          <br /> East Africa
        </h1>
        <p className="text-on-surface-variant text-lg md:text-xl mt-5 max-w-2xl mx-auto">
          Browse available safari lodges, beach resorts and city hotels curated
          for Kenya, Tanzania, Uganda and Rwanda.
        </p>
      </header>

      <FilterBar
        country={country}
        setCountry={setCountry}
        query={query}
        setQuery={setQuery}
      />

      <section className="max-w-7xl mx-auto px-6 md:px-10 py-14">
        {hydrated && (
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl font-headline font-extrabold tracking-tight">
                {filtered.length} hotel{filtered.length === 1 ? "" : "s"}
              </h2>
              <span className="text-on-surface-variant text-sm">
                Prices shown per night
              </span>
            </div>
            <CurrencyToggle currency={currency} onChange={setCurrency} />
          </div>
        )}

        {!hydrated ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card
                key={index}
                className="h-[32rem] border border-outline-variant/15 bg-surface-container-low animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 border border-outline-variant/15 text-center">
            <p className="text-on-surface font-bold">
              No hotels match that search.
            </p>
            <p className="text-on-surface-variant text-sm mt-2">
              Try clearing filters or picking a different country.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((hotel) => (
              <DestinationCard
                key={hotel.id}
                hotel={hotel}
                currency={currency}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function DestinationsView() {
  const params = useSearchParams();
  const country = params.get("country") ?? "all";

  return <DestinationsContent key={country} initialCountry={country} />;
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
