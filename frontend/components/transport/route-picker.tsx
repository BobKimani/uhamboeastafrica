"use client";

import { Input, Label } from "@/components/ui/input";
import { TRIP_TYPE_LABELS, type TransportPlace, type TripType } from "@/lib/api/transport";
import { cn } from "@/lib/utils";

export type RouteSelection = {
  /** Listed route (priced by the backend). */
  fromId: string;
  toId: string;
  /** Unlisted route: free text, sent as a quote request. */
  quoteMode: boolean;
  fromText: string;
  toText: string;
};

export const SELECT_CLASS =
  "flex h-12 w-full rounded-xl bg-surface-container-highest px-4 text-base text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50";

export function isRouteComplete(route: RouteSelection) {
  return route.quoteMode
    ? Boolean(route.fromText.trim() && route.toText.trim())
    : Boolean(route.fromId && route.toId);
}

/** From/To pickers limited to listed routes, with a "request a quote" fallback. */
export function RoutePicker({
  value,
  onChange,
  places,
  placesLoading = false,
  idPrefix = "transport",
}: {
  value: RouteSelection;
  onChange: (patch: Partial<RouteSelection>) => void;
  places: TransportPlace[];
  placesLoading?: boolean;
  idPrefix?: string;
}) {
  const fromPlace = places.find((p) => p.id === value.fromId);
  const destinations = fromPlace
    ? places.filter((p) => fromPlace.destinations.includes(p.id))
    : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {value.quoteMode ? (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${idPrefix}-from-text`}>From</Label>
            <Input
              id={`${idPrefix}-from-text`}
              placeholder="Nairobi"
              className="text-base"
              value={value.fromText}
              onChange={(e) => onChange({ fromText: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${idPrefix}-to-text`}>To</Label>
            <Input
              id={`${idPrefix}-to-text`}
              placeholder="Maasai Mara"
              className="text-base"
              value={value.toText}
              onChange={(e) => onChange({ toText: e.target.value })}
            />
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${idPrefix}-from`}>From</Label>
            <select
              id={`${idPrefix}-from`}
              value={value.fromId}
              disabled={placesLoading}
              onChange={(e) => onChange({ fromId: e.target.value, toId: "" })}
              className={SELECT_CLASS}
            >
              <option value="">{placesLoading ? "Loading places..." : "Choose pickup"}</option>
              {places
                .filter((p) => p.destinations.length > 0)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${idPrefix}-to`}>To</Label>
            <select
              id={`${idPrefix}-to`}
              value={value.toId}
              disabled={!fromPlace}
              onChange={(e) => onChange({ toId: e.target.value })}
              className={SELECT_CLASS}
            >
              <option value="">{fromPlace ? "Choose destination" : "Choose pickup first"}</option>
              {destinations.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      <div className="flex flex-col gap-2 md:col-span-2">
        <button
          type="button"
          onClick={() => onChange({ quoteMode: !value.quoteMode })}
          className="self-start text-xs font-bold text-primary underline-offset-4 hover:underline"
        >
          {value.quoteMode
            ? "Choose from our listed routes instead"
            : "My route isn't listed — request a quote"}
        </button>
        {value.quoteMode && (
          <p className="text-xs text-on-surface-variant">
            We&apos;ll price this route and contact you. No payment is taken now.
          </p>
        )}
      </div>
    </div>
  );
}

export function TripTypeToggle({
  value,
  onChange,
}: {
  value: TripType;
  onChange: (trip: TripType) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>Trip</Label>
      <div role="radiogroup" aria-label="Trip type" className="grid grid-cols-2 gap-2">
        {(Object.keys(TRIP_TYPE_LABELS) as TripType[]).map((trip) => (
          <button
            key={trip}
            type="button"
            role="radio"
            aria-checked={value === trip}
            onClick={() => onChange(trip)}
            className={cn(
              "h-12 rounded-xl px-3 text-sm font-bold transition-colors",
              value === trip
                ? "bg-primary text-on-primary"
                : "bg-surface-container-highest text-on-surface hover:bg-surface-container-high"
            )}
          >
            {TRIP_TYPE_LABELS[trip]}
          </button>
        ))}
      </div>
    </div>
  );
}
