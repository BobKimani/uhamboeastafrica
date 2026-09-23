"use client";

import { useMemo, useState } from "react";
import { MapPin, Search, Star, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Hotel } from "@/lib/data/hotels";
import { cn } from "@/lib/utils";

function Stars({ rating }: { rating: number }) {
  const stars = Math.round(rating);
  if (!stars) return null;
  return (
    <span
      className="inline-flex items-center gap-0.5 text-primary"
      aria-label={`${stars} star`}
    >
      {Array.from({ length: stars }).map((_, i) => (
        <Star key={i} className="h-3 w-3 fill-current" aria-hidden="true" />
      ))}
    </span>
  );
}

export function HotelPicker({
  hotels,
  loading,
  country,
  selectedId,
  onSelect,
  stars,
  onStarsChange,
}: {
  hotels: Hotel[];
  loading: boolean;
  country?: string;
  selectedId?: string;
  onSelect: (hotel: Hotel) => void;
  /** Chosen star rating; 0 = unrated, undefined = not chosen yet. */
  stars?: number;
  onStarsChange: (stars: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<string>("all");

  const countryHotels = useMemo(
    () =>
      hotels
        .filter(
          (hotel) =>
            hotel.isAvailable &&
            hotel.country.toLowerCase() === (country ?? "").toLowerCase(),
        )
        .sort((a, b) =>
          a.region === b.region
            ? a.name.localeCompare(b.name)
            : a.region.localeCompare(b.region),
        ),
    [hotels, country],
  );

  // Star options offered for this country, highest first, with counts.
  const starOptions = useMemo(() => {
    const counts = new Map<number, number>();
    for (const hotel of countryHotels) {
      const s = Math.round(hotel.rating) || 0;
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => (a === 0 ? 1 : b === 0 ? -1 : b - a))
      .map(([value, count]) => ({ value, count }));
  }, [countryHotels]);

  const ratedHotels = useMemo(
    () =>
      stars === undefined
        ? []
        : countryHotels.filter((h) => (Math.round(h.rating) || 0) === stars),
    [countryHotels, stars],
  );

  const regions = useMemo(
    () => Array.from(new Set(ratedHotels.map((h) => h.region))).sort(),
    [ratedHotels],
  );

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return ratedHotels.filter((hotel) => {
      if (region !== "all" && hotel.region !== region) return false;
      if (!term) return true;
      return (
        hotel.name.toLowerCase().includes(term) ||
        hotel.region.toLowerCase().includes(term)
      );
    });
  }, [ratedHotels, query, region]);

  if (loading) {
    return (
      <div className="space-y-2" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-16 rounded-xl bg-surface-container-highest animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!country) {
    return (
      <p className="text-sm text-on-surface-variant">
        Pick a destination first and we&apos;ll show the properties we work with
        there.
      </p>
    );
  }

  if (countryHotels.length === 0) {
    return (
      <p className="text-sm text-on-surface-variant">
        We don&apos;t have properties loaded for this destination yet — continue
        and our team will propose options for you.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">
          1. Choose a star rating
        </p>
        <div
          role="radiogroup"
          aria-label="Hotel star rating"
          className="flex flex-wrap gap-2"
        >
          {starOptions.map(({ value, count }) => {
            const active = stars === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  setRegion("all");
                  setQuery("");
                  onStarsChange(value);
                }}
                className={cn(
                  "inline-flex items-center gap-2 h-11 px-4 rounded-xl text-sm font-headline font-bold bg-surface-container-highest text-on-surface transition-all hover:bg-primary/10",
                  active && "sunset-gradient text-white hover:bg-transparent",
                )}
              >
                {value > 0 ? (
                  <>
                    <span className="inline-flex items-center gap-0.5">
                      {Array.from({ length: value }).map((_, i) => (
                        <Star
                          key={i}
                          className="h-3.5 w-3.5 fill-current"
                          aria-hidden="true"
                        />
                      ))}
                    </span>
                    <span className="sr-only">{value} star</span>
                  </>
                ) : (
                  <span>Unrated</span>
                )}
                <span
                  className={cn(
                    "text-xs font-medium",
                    active ? "text-white/80" : "text-on-surface-variant",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {stars === undefined ? (
        <p className="text-sm text-on-surface-variant">
          Pick a star rating to see matching hotels.
        </p>
      ) : (
        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            2. Choose your hotel
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant/70"
                aria-hidden="true"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by hotel or area"
                aria-label="Search hotels"
                className="pl-11"
              />
            </div>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              aria-label="Filter by region"
              className="h-12 rounded-xl bg-surface-container-highest px-4 text-sm text-on-surface sm:w-56 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <option value="all">All regions ({ratedHotels.length})</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div
            role="listbox"
            aria-label="Available hotels"
            className="max-h-96 overflow-y-auto rounded-xl border border-outline-variant/15 divide-y divide-outline-variant/10"
          >
            {visible.length === 0 && (
              <p className="p-4 text-sm text-on-surface-variant">
                No properties match that search.
              </p>
            )}
            {visible.map((hotel) => {
              const selected = hotel.id === selectedId;
              return (
                <button
                  key={hotel.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => onSelect(hotel)}
                  className={cn(
                    "w-full text-left p-4 flex items-start justify-between gap-4 transition-colors hover:bg-primary/5",
                    selected && "bg-primary/10",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block font-headline font-bold text-sm text-on-surface truncate">
                      {hotel.name}
                    </span>
                    <span className="flex items-center gap-2 mt-1 text-xs text-secondary">
                      <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                      <span className="truncate">{hotel.region}</span>
                      <Stars rating={hotel.rating} />
                    </span>
                  </span>
                  {selected && (
                    <Check
                      className="h-5 w-5 text-primary shrink-0"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
