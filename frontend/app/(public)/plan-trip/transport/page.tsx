"use client";

import { useEffect, useMemo } from "react";
import Image from "next/image";
import { Users } from "lucide-react";
import { WizardShell } from "@/components/wizard/wizard-shell";
import { NeedToggle } from "@/components/wizard/need-toggle";
import { Label } from "@/components/ui/input";
import { TransportMap } from "@/components/transport/transport-map";
import {
  RoutePicker,
  TripTypeToggle,
  isRouteComplete,
  type RouteSelection,
} from "@/components/transport/route-picker";
import { useWizard } from "@/lib/wizard/store";
import { useVehicles } from "@/lib/use-vehicles";
import { useTransportPlaces } from "@/lib/use-transport-places";
import { useTransportQuotes } from "@/lib/use-transport-quotes";
import { formatFromKes } from "@/lib/currency";
import { mediaUrl } from "@/lib/media";
import { serviceTypeFor, skipsAccommodation, skipsTransport } from "@/lib/wizard/types";
import { cn } from "@/lib/utils";

export default function TransportStep() {
  const { state, update } = useWizard();
  const { vehicles } = useVehicles();
  const { places, byId, loading: placesLoading } = useTransportPlaces();
  const accSkipped = skipsAccommodation(state);
  const skipped = skipsTransport(state) && !accSkipped;
  const transport = state.transport ?? {};
  const tripType = transport.tripType ?? "one_way";

  const route: RouteSelection = {
    fromId: transport.fromId ?? "",
    toId: transport.toId ?? "",
    quoteMode: Boolean(transport.quoteMode),
    fromText: transport.quoteMode ? transport.from ?? "" : "",
    toText: transport.quoteMode ? transport.to ?? "" : "",
  };

  const availableVehicles = useMemo(
    () => vehicles.filter((vehicle) => vehicle.isAvailable),
    [vehicles]
  );

  const selectedVehicleIsAvailable = availableVehicles.some(
    (vehicle) => vehicle.id === transport.vehicleId
  );

  const listedRoute = !route.quoteMode && Boolean(route.fromId && route.toId);
  const { quotes } = useTransportQuotes(
    listedRoute ? route.fromId : undefined,
    listedRoute ? route.toId : undefined,
    tripType,
    availableVehicles.map((v) => v.id)
  );

  useEffect(() => {
    if (skipped) return;
    if (!state.transport?.vehicleId) return;
    if (vehicles.length === 0 || selectedVehicleIsAvailable) return;
    update({
      transport: { ...state.transport, vehicleId: undefined, vehicleType: undefined },
    });
  }, [skipped, vehicles.length, selectedVehicleIsAvailable, state.transport, update]);

  const trpReady = selectedVehicleIsAvailable && isRouteComplete(route);
  const canContinue = skipped || trpReady;

  const setNeeded = (needed: boolean) =>
    update({
      skipTransport: !needed,
      serviceType: serviceTypeFor(accSkipped, !needed),
    });

  function updateRoute(patch: Partial<RouteSelection>) {
    const next = { ...route, ...patch };
    update({
      transport: {
        ...state.transport,
        quoteMode: next.quoteMode,
        fromId: next.quoteMode ? undefined : next.fromId || undefined,
        toId: next.quoteMode ? undefined : next.toId || undefined,
        from: next.quoteMode ? next.fromText : byId.get(next.fromId)?.name,
        to: next.quoteMode ? next.toText : byId.get(next.toId)?.name,
      },
    });
  }

  const mapFrom = route.quoteMode ? route.fromText : byId.get(route.fromId)?.name ?? "";
  const mapTo = route.quoteMode ? route.toText : byId.get(route.toId)?.name ?? "";

  return (
    <WizardShell
      stepSlug="transport"
      title="How will you get around?"
      subtitle="Choose your route and a private vehicle with a driver-guide."
      canContinue={canContinue}
    >
      <div className="space-y-8">
        <NeedToggle
          needed={!skipped}
          onChange={setNeeded}
          needLabel="I need transport"
          skipLabel="Skip, no transport needed"
          skipDisabled={accSkipped}
          skipDisabledHint="You skipped accommodation, so we need transport to plan your trip."
        />

        {skipped ? (
          <p className="text-center text-sm text-on-surface-variant">
            No problem — continue to review your trip.
          </p>
        ) : (
      <section className="bg-surface-container-low rounded-2xl p-8 max-w-3xl mx-auto w-full">
        <h3 className="font-headline font-bold text-xl text-on-surface mb-6">
          Transport
        </h3>
        <div className="space-y-5">
          <RoutePicker
            value={route}
            onChange={updateRoute}
            places={places}
            placesLoading={placesLoading}
            idPrefix="planner"
          />

          <TransportMap from={mapFrom} to={mapTo} />

          <TripTypeToggle
            value={tripType}
            onChange={(next) =>
              update({ transport: { ...state.transport, tripType: next } })
            }
          />

          <div>
            <Label className="block mb-3">Vehicle</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableVehicles.map((v) => {
                const selected = transport.vehicleId === v.id;
                const result = quotes[v.id];
                const priceText = route.quoteMode
                  ? "Price on request"
                  : !listedRoute
                    ? null
                    : result?.ok
                      ? formatFromKes(result.quote.totalKes, state.currency)
                      : result
                        ? "Price on request"
                        : "Pricing...";
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() =>
                      update({
                        transport: {
                          ...state.transport,
                          vehicleId: v.id,
                          vehicleType: v.type,
                        },
                      })
                    }
                    className={cn(
                      "group text-left rounded-xl bg-surface-container-highest overflow-hidden transition-all",
                      selected && "ring-2 ring-primary"
                    )}
                  >
                    <div className="relative aspect-16/9 overflow-hidden">
                      <Image
                        src={mediaUrl(v.image)}
                        alt={v.name}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-black/60 text-white px-2.5 py-1">
                        <Users className="h-3 w-3" aria-hidden="true" />
                        <span className="text-[11px] font-bold">
                          {v.capacity}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="font-headline font-bold text-on-surface">
                        {v.name}
                      </div>
                      <div className="text-xs text-secondary mt-1">
                        Best for: {v.bestFor}
                      </div>
                      {priceText && (
                        <div className="text-sm font-bold text-on-surface mt-2">
                          {priceText}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            {availableVehicles.length === 0 && (
              <p className="text-xs text-on-surface-variant mt-2">
                No vehicles are currently available. Please check back soon.
              </p>
            )}
          </div>
        </div>
      </section>
        )}
      </div>
    </WizardShell>
  );
}
