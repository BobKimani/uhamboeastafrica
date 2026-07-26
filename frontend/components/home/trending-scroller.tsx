"use client";

import Image from "next/image";
import Link from "next/link";
import { mediaUrl } from "@/lib/media";
import { useHotels } from "@/lib/use-hotels";

export function TrendingScroller() {
  const { hotels } = useHotels();
  const featuredHotels = hotels.filter((hotel) => hotel.isAvailable).slice(0, 8);

  return (
    <section className="bg-surface-container-lowest py-24 md:py-28 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-10 mb-10 flex items-end justify-between gap-6">
        <div>
          <span className="text-primary font-bold tracking-widest uppercase text-xs">
            Popular Now
          </span>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold text-on-surface mt-3">
            Trending Stays
          </h2>
        </div>
      </div>
      <div className="flex gap-6 px-6 md:px-10 overflow-x-auto no-scrollbar pb-8">
        {featuredHotels.map((hotel) => (
          <Link
            key={hotel.id}
            href={`/destinations?country=${hotel.country}`}
            className="flex-none w-80 group"
          >
            <div className="bg-surface-container-low rounded-2xl p-4 hover:-translate-y-1 transition-transform duration-300">
              <div className="relative w-full h-52 rounded-xl overflow-hidden mb-4">
                <Image
                  src={mediaUrl(hotel.image)}
                  alt={hotel.name}
                  fill
                  sizes="320px"
                  className="object-cover group-hover:scale-110 transition-transform duration-700"
                />
              </div>
              <h5 className="font-headline font-bold text-lg text-on-surface">
                {hotel.name}
              </h5>
              <p className="text-sm text-secondary capitalize">
                {hotel.destination}, {hotel.country}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
