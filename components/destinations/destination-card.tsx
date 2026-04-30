import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEFAULT_CURRENCY, formatTravelPrice, type DisplayCurrency } from "@/lib/currency";
import type { Destination } from "@/lib/data/destinations";

export function DestinationCard({
  destination,
  currency = DEFAULT_CURRENCY,
}: {
  destination: Destination;
  currency?: DisplayCurrency;
}) {
  return (
    <Card className="border border-outline-variant/15 flex flex-col overflow-hidden group">
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={destination.image}
          alt={destination.name}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        <Badge tone="primary" className="absolute top-4 left-4 capitalize">
          {destination.country}
        </Badge>
        <div className="absolute bottom-5 left-5 right-5">
          <h3 className="text-white font-headline font-extrabold text-2xl md:text-3xl tracking-tight">
            {destination.name}
          </h3>
          <p className="text-white/70 text-xs font-bold uppercase tracking-widest mt-1">
            {destination.region}
          </p>
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1">
        <p className="text-on-surface-variant text-sm leading-relaxed line-clamp-3">
          {destination.description}
        </p>

        <div className="flex flex-wrap gap-2 mt-4">
          {destination.tags.map((tag) => (
            <Badge key={tag} tone="secondary">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="flex items-end justify-between mt-6 pt-6 border-t border-outline-variant/15">
          <div>
            <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">
              From
            </p>
            <p className="text-on-surface font-headline font-extrabold text-xl">
              {formatTravelPrice(destination.pricePerNight, currency)}
              <span className="text-on-surface-variant text-xs font-medium ml-1">
                / night
              </span>
            </p>
          </div>
          <Button size="sm">Explore</Button>
        </div>
      </div>
    </Card>
  );
}
