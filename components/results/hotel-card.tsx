import Image from "next/image";
import { Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { Hotel } from "@/lib/data/hotels";

export function HotelCard({
  hotel,
  currency,
}: {
  hotel: Hotel;
  currency: string;
}) {
  return (
    <Card className="border border-outline-variant/15 flex flex-col overflow-hidden group">
      <div className="relative aspect-16/10 overflow-hidden">
        <Image
          src={hotel.image}
          alt={hotel.name}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {hotel.topRated && (
          <Badge
            tone="primary"
            className="absolute top-4 left-4"
          >
            Top Rated
          </Badge>
        )}
        <div className="absolute top-4 right-4 flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-sm px-3 py-1">
          <Star className="h-3.5 w-3.5 fill-primary-fixed text-primary-fixed" />
          <span className="text-white text-xs font-bold">{hotel.rating}</span>
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1">
        <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">
          {hotel.region}
        </p>
        <h3 className="text-on-surface font-headline font-extrabold text-xl mt-1">
          {hotel.name}
        </h3>
        <p className="text-on-surface-variant text-sm mt-3 leading-relaxed line-clamp-3">
          {hotel.description}
        </p>

        <div className="flex flex-wrap gap-2 mt-4">
          {hotel.tags.map((tag) => (
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
            <p className="text-on-surface font-headline font-extrabold text-2xl">
              {formatCurrency(hotel.pricePerNight, currency)}
              <span className="text-on-surface-variant text-xs font-medium ml-1">
                / night
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm">
              Select
            </Button>
            <Button size="sm">Request</Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
