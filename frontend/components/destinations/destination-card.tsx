import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Hotel } from "@/lib/data/hotels";
import { formatTravelPrice, type DisplayCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

export function DestinationCard({
  hotel,
  currency,
}: {
  hotel: Hotel;
  currency: DisplayCurrency;
}) {
  return (
    <Card className="border border-outline-variant/15 flex flex-col overflow-hidden group">
      <div className="relative aspect-4/3 overflow-hidden">
        <Image
          src={hotel.image}
          alt={hotel.name}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-transparent" />
        <Badge tone="primary" className="absolute top-4 left-4 capitalize">
          {hotel.country}
        </Badge>
        <div className="absolute top-4 right-4 flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-sm px-3 py-1">
          <Star className="h-3.5 w-3.5 fill-primary-fixed text-primary-fixed" />
          <span className="text-white text-xs font-bold">
            {hotel.rating.toFixed(1)}
          </span>
        </div>
        <div className="absolute bottom-5 left-5 right-5">
          <h3 className="text-white font-headline font-extrabold text-2xl md:text-3xl tracking-tight">
            {hotel.name}
          </h3>
          <p className="text-white/70 text-xs font-bold uppercase tracking-widest mt-1">
            {hotel.destination} · {hotel.region}
          </p>
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1">
        <p className="text-on-surface-variant text-sm leading-relaxed line-clamp-3">
          {hotel.description}
        </p>

        <p className="text-xs text-on-surface-variant mt-3">
          From{" "}
          <span className="font-bold text-on-surface">
            {formatTravelPrice(hotel.pricePerNight, currency)}
          </span>{" "}
          / night
        </p>

        <div className="flex flex-wrap gap-2 mt-4">
          {hotel.tags.map((tag) => (
            <Badge key={tag} tone="secondary">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="flex justify-end mt-auto pt-6">
          <Link
            href={`/plan-trip?hotel=${encodeURIComponent(hotel.id)}`}
            className={cn(
              "inline-flex h-9 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold tracking-wide transition-all duration-300 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "sunset-gradient text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:opacity-95"
            )}
          >
            Request
          </Link>
        </div>
      </div>
    </Card>
  );
}
