"use client";

import Link from "next/link";
import { Hotel as HotelIcon, Car } from "lucide-react";
import { useWizard } from "@/lib/wizard/store";
import { HOTELS } from "@/lib/data/hotels";
import { VEHICLES } from "@/lib/data/vehicles";
import { estimateTrip } from "@/lib/pricing/estimate-trip";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SummaryPanel } from "@/components/results/summary-panel";
import { HotelCard } from "@/components/results/hotel-card";
import { VehicleCard } from "@/components/results/vehicle-card";
import { PricingSummary } from "@/components/results/pricing-summary";

export default function ResultsPage() {
  const { state, hydrated } = useWizard();

  if (!hydrated) {
    return (
      <div className="min-h-screen pt-28 pb-16 px-6 md:px-10 max-w-6xl mx-auto">
        <div className="h-10 w-48 bg-surface-container-high rounded-lg animate-pulse" />
        <div className="h-80 w-full bg-surface-container-high rounded-2xl animate-pulse mt-8" />
      </div>
    );
  }

  if (!state.destination) {
    return (
      <div className="min-h-screen pt-28 pb-16 px-6 md:px-10 max-w-3xl mx-auto flex items-center">
        <Card className="p-10 md:p-14 w-full text-center border border-outline-variant/15">
          <span className="text-primary font-headline font-bold text-xs tracking-widest uppercase">
            Nothing to show yet
          </span>
          <h1 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tight mt-4">
            Start by telling us
            <br /> where you're going
          </h1>
          <p className="text-on-surface-variant mt-4 max-w-md mx-auto">
            We'll turn your answers into a tailored trip across East Africa in
            under two minutes.
          </p>
          <Link href="/plan-trip/destination">
            <Button size="lg" className="mt-8">
              Plan my trip
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const serviceType = state.serviceType ?? "both";
  const showHotels = serviceType !== "transport";
  const showTransport = serviceType !== "accommodation";

  const matchedHotels = HOTELS.filter((h) => h.destination === state.destination);
  const hotels = matchedHotels.length > 0 ? matchedHotels : HOTELS;

  const selectedVehicleType = state.transport?.vehicleType;
  const vehicles = [...VEHICLES]
    .filter((v) => v.capacity >= state.paxCount)
    .sort((a, b) => {
      if (!selectedVehicleType) return 0;
      if (a.type === selectedVehicleType) return -1;
      if (b.type === selectedVehicleType) return 1;
      return 0;
    });

  const estimate = estimateTrip(state);

  return (
    <div className="min-h-screen pt-28 pb-24 px-6 md:px-10 max-w-6xl mx-auto">
      <SummaryPanel state={state} />

      {showHotels && (
        <section className="mt-16">
          <div className="flex items-center gap-3 mb-8">
            <HotelIcon className="h-5 w-5 text-primary" />
            <h2 className="text-2xl md:text-3xl font-headline font-extrabold tracking-tight">
              Where you'll stay
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hotels.map((hotel) => (
              <HotelCard
                key={hotel.id}
                hotel={hotel}
                currency={state.budget.currency}
              />
            ))}
          </div>
        </section>
      )}

      {showTransport && (
        <section className="mt-16">
          <div className="flex items-center gap-3 mb-8">
            <Car className="h-5 w-5 text-primary" />
            <h2 className="text-2xl md:text-3xl font-headline font-extrabold tracking-tight">
              How you'll move
            </h2>
          </div>
          {vehicles.length === 0 ? (
            <Card className="p-8 border border-outline-variant/15 text-center">
              <p className="text-on-surface-variant">
                No vehicles fit a group of {state.paxCount}. Try a larger type.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vehicles.map((vehicle) => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  price={vehicle.pricePerDay}
                  currency={state.budget.currency}
                  highlighted={vehicle.type === selectedVehicleType}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <section className="mt-16">
        <PricingSummary estimate={estimate} />
      </section>
    </div>
  );
}
