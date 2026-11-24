"use client";

import { useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/admin/modal";
import { VehicleCard } from "@/components/results/vehicle-card";
import { CurrencyToggle } from "@/components/shared/currency-toggle";
import {
  TransportForm,
  type TransportFormValues,
} from "@/components/transport/transport-form";
import { TransportMap } from "@/components/transport/transport-map";
import {
  DirectTransportBooking,
  type TransportBookingRoute,
} from "@/components/transport/direct-transport-booking";
import { TRIP_TYPE_LABELS } from "@/lib/api/transport";
import { formatFromKes } from "@/lib/currency";
import { useCurrencyPreference } from "@/lib/use-currency-preference";
import { useTransportPlaces } from "@/lib/use-transport-places";
import { useTransportQuotes } from "@/lib/use-transport-quotes";
import { useVehicles } from "@/lib/use-vehicles";
import type { Vehicle } from "@/lib/data/vehicles";

const INITIAL: TransportFormValues = {
  fromId: "",
  toId: "",
  quoteMode: false,
  fromText: "",
  toText: "",
  tripType: "one_way",
  people: 2,
  vehicleType: "Any",
};

export default function TransportPage() {
  const [values, setValues] = useState<TransportFormValues>(INITIAL);
  const [selected, setSelected] = useState<{
    vehicle: Vehicle;
    route: TransportBookingRoute;
  } | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const { currency, setCurrency } = useCurrencyPreference();
  const { vehicles: fleet } = useVehicles();
  const { places, byId, loading: placesLoading } = useTransportPlaces();
  const resultsRef = useRef<HTMLDivElement>(null);

  const availableFleet = useMemo(
    () => fleet.filter((v) => v.isAvailable),
    [fleet]
  );

  const vehicleTypes = useMemo(
    () => Array.from(new Set(availableFleet.map((v) => v.type))),
    [availableFleet]
  );

  const vehicles = useMemo(() => {
    const filtered = availableFleet.filter((v) => v.capacity >= values.people);
    if (values.vehicleType === "Any") return filtered;
    return [...filtered].sort((a, b) => {
      if (a.type === values.vehicleType) return -1;
      if (b.type === values.vehicleType) return 1;
      return 0;
    });
  }, [availableFleet, values.people, values.vehicleType]);

  const routeChosen = !values.quoteMode && Boolean(values.fromId && values.toId);
  const { quotes, loading: quotesLoading } = useTransportQuotes(
    routeChosen ? values.fromId : undefined,
    routeChosen ? values.toId : undefined,
    values.tripType,
    vehicles.map((v) => v.id)
  );

  const fromName = values.quoteMode ? values.fromText : byId.get(values.fromId)?.name ?? "";
  const toName = values.quoteMode ? values.toText : byId.get(values.toId)?.name ?? "";

  const scrollToResults = () => {
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  function priceFor(vehicle: Vehicle): { text: string; label?: string; quotable: boolean } {
    if (values.quoteMode) return { text: "On request", quotable: false };
    if (!routeChosen) return { text: "Choose a route", quotable: false };
    const result = quotes[vehicle.id];
    if (!result) return { text: quotesLoading ? "Pricing..." : "—", quotable: false };
    if (!result.ok) return { text: "On request", quotable: false };
    return {
      text: formatFromKes(result.quote.totalKes, currency),
      label: values.tripType === "return" ? "return" : "one way",
      quotable: true,
    };
  }

  const requestVehicle = (vehicle: Vehicle) => {
    if (values.quoteMode) {
      if (!values.fromText.trim() || !values.toText.trim()) {
        setSelectionError("Enter both pickup and destination to request a quote.");
        scrollToResults();
        return;
      }
      setSelectionError(null);
      setSelected({
        vehicle,
        route: {
          mode: "quote",
          fromText: values.fromText.trim(),
          toText: values.toText.trim(),
          tripType: values.tripType,
        },
      });
      return;
    }
    if (!routeChosen) {
      setSelectionError("Choose your pickup and destination first.");
      scrollToResults();
      return;
    }
    const result = quotes[vehicle.id];
    if (!result) {
      // Never fall back to a quote request just because prices are loading.
      setSelectionError("Prices are still loading — please try again in a moment.");
      return;
    }
    setSelectionError(null);
    setSelected({
      vehicle,
      route:
        result.ok
          ? { mode: "priced", quote: result.quote }
          : {
              // The server says this vehicle/route can't be priced online:
              // send it as a quote request.
              mode: "quote",
              fromText: fromName,
              toText: toName,
              tripType: values.tripType,
            },
    });
  };

  return (
    <div className="min-h-screen pb-24">
      <header className="relative pt-28 pb-16 px-6 md:px-10 max-w-6xl mx-auto text-center">
        <span className="text-primary font-headline font-bold text-xs tracking-widest uppercase">
          Transport
        </span>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-headline font-extrabold tracking-tight text-on-background mt-4 leading-[1.1]">
          Book your ride across
          <br /> East Africa
        </h1>
        <p className="text-on-surface-variant text-lg md:text-xl mt-5 max-w-2xl mx-auto">
          Pick a vehicle. Pick a window. We handle the road.
        </p>
      </header>

      <div className="max-w-6xl mx-auto px-6 md:px-10 grid grid-cols-1 lg:grid-cols-5 gap-10">
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-28">
            <TransportForm
              values={values}
              onChange={(patch) => setValues((v) => ({ ...v, ...patch }))}
              onSearch={scrollToResults}
              vehicleTypes={vehicleTypes}
              places={places}
              placesLoading={placesLoading}
            />
          </div>
        </div>

        <div ref={resultsRef} className="lg:col-span-3">
          <div className="mb-6">
            <TransportMap from={fromName} to={toName} />
          </div>

          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl font-headline font-extrabold tracking-tight">
                {vehicles.length} vehicle{vehicles.length === 1 ? "" : "s"}
              </h2>
              <span className="text-on-surface-variant text-sm">
                {TRIP_TYPE_LABELS[values.tripType]} · {values.people} pax
              </span>
            </div>
            <CurrencyToggle currency={currency} onChange={setCurrency} />
          </div>

          {selectionError && (
            <div role="alert" className="mb-6 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-500">
              {selectionError}
            </div>
          )}

          {vehicles.length === 0 ? (
            <Card className="p-10 border border-outline-variant/15 text-center">
              <p className="text-on-surface font-bold">
                No vehicles fit that group size.
              </p>
              <p className="text-on-surface-variant text-sm mt-2">
                Try a larger vehicle type or reduce the passenger count.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {vehicles.map((vehicle) => {
                const price = priceFor(vehicle);
                return (
                  <VehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    priceText={price.text}
                    priceLabel={price.label}
                    ctaLabel={price.quotable ? "Request" : "Request a quote"}
                    highlighted={
                      values.vehicleType !== "Any" &&
                      vehicle.type === values.vehicleType
                    }
                    onRequest={() => requestVehicle(vehicle)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.route.mode === "quote" ? "Request a transport quote" : "Book transport"}
        description="Confirm your ride without leaving the transport page."
        size="lg"
      >
        {selected && (
          <DirectTransportBooking
            vehicle={selected.vehicle}
            route={selected.route}
            people={values.people}
            onClose={() => setSelected(null)}
          />
        )}
      </Modal>
    </div>
  );
}
