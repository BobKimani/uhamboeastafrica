"use client";

import { Card } from "@/components/ui/card";

type TransportMapProps = {
  from: string;
  to: string;
};

const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export function TransportMap({ from, to }: TransportMapProps) {
  const origin = from.trim();
  const destination = to.trim();
  const hasRoute = !!origin && !!destination;

  if (!mapsApiKey) {
    return (
      <Card className="p-6 border border-outline-variant/15">
        <h3 className="text-lg font-headline font-bold text-on-background">
          Route map preview
        </h3>
        <p className="text-sm text-on-surface-variant mt-2">
          Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env file to enable the
          Google Maps preview.
        </p>
      </Card>
    );
  }

  const directionsSrc =
    "https://www.google.com/maps/embed/v1/directions" +
    `?key=${mapsApiKey}` +
    `&origin=${encodeURIComponent(origin)}` +
    `&destination=${encodeURIComponent(destination)}` +
    "&mode=driving";

  const overviewSrc =
    "https://www.google.com/maps/embed/v1/view" +
    `?key=${mapsApiKey}` +
    "&center=-1.286389,36.817223" +
    "&zoom=5";

  const src = hasRoute ? directionsSrc : overviewSrc;

  return (
    <Card className="p-3 border border-outline-variant/15 overflow-hidden">
      <div className="rounded-xl overflow-hidden border border-outline-variant/15">
        <iframe
          title="Google Maps route preview"
          src={src}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="w-full h-[260px] md:h-[320px]"
        />
      </div>
      <p className="text-xs text-on-surface-variant px-1 pt-3 pb-1">
        {hasRoute
          ? `Showing driving route from ${origin} to ${destination}.`
          : "Add both From and To to preview your route on Google Maps."}
      </p>
    </Card>
  );
}