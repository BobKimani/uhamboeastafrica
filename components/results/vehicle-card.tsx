import Image from "next/image";
import { Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_CURRENCY, formatTravelPrice } from "@/lib/currency";
import { formatCurrency } from "@/lib/utils";
import type { Vehicle } from "@/lib/data/vehicles";

export function VehicleCard({
  vehicle,
  price,
  priceLabel = "/ day",
  currency = DEFAULT_CURRENCY,
  ctaLabel = "Request",
  highlighted = false,
}: {
  vehicle: Vehicle;
  price: number;
  priceLabel?: string;
  currency?: string;
  ctaLabel?: string;
  highlighted?: boolean;
}) {
  return (
    <Card
      className={`border flex flex-col overflow-hidden group ${
        highlighted
          ? "border-primary/60 ring-2 ring-primary/20"
          : "border-outline-variant/15"
      }`}
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image
          src={vehicle.image}
          alt={vehicle.name}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {highlighted && (
          <Badge tone="primary" className="absolute top-4 left-4">
            Your Pick
          </Badge>
        )}
      </div>

      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-center justify-between">
          <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">
            {vehicle.region}
          </p>
          <div className="flex items-center gap-1 text-on-surface-variant">
            <Users className="h-3.5 w-3.5" />
            <span className="text-xs font-bold">{vehicle.capacity}</span>
          </div>
        </div>
        <h3 className="text-on-surface font-headline font-extrabold text-xl mt-1">
          {vehicle.name}
        </h3>
        <p className="text-primary text-xs font-bold mt-1">
          Best for: {vehicle.bestFor}
        </p>

        <div className="flex flex-wrap gap-2 mt-4">
          {vehicle.features.slice(0, 4).map((f) => (
            <Badge key={f} tone="secondary">
              {f}
            </Badge>
          ))}
        </div>

        <div className="flex items-end justify-between mt-6 pt-6 border-t border-outline-variant/15">
          <div>
            <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">
              From
            </p>
            <p className="text-on-surface font-headline font-extrabold text-2xl">
              {currency === "KES" || currency === "USD"
                ? formatTravelPrice(price, currency)
                : formatCurrency(price, currency)}
              <span className="text-on-surface-variant text-xs font-medium ml-1">
                {priceLabel}
              </span>
            </p>
          </div>
          <Button size="sm">{ctaLabel}</Button>
        </div>
      </div>
    </Card>
  );
}
