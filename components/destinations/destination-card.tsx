import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Destination } from "@/lib/data/destinations";
import { cn } from "@/lib/utils";

export function DestinationCard({ destination }: {
  destination: Destination;
}) {
  return (
    <Card className="border border-outline-variant/15 flex flex-col overflow-hidden group">
      <div className="relative aspect-4/3 overflow-hidden">
        <Image
          src={destination.image}
          alt={destination.name}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-transparent" />
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

        <div className="flex justify-end mt-auto pt-6">
          <Link
            href="/plan-trip"
            className={cn(
              "inline-flex h-9 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold tracking-wide transition-all duration-300 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "sunset-gradient text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:opacity-95"
            )}
          >
            Explore
          </Link>
        </div>
      </div>
    </Card>
  );
}
