"use client";

import { useMemo, useRef, useState } from "react";
import { VEHICLES } from "@/lib/data/vehicles";
import { Card } from "@/components/ui/card";
import { VehicleCard } from "@/components/results/vehicle-card";
import {
  TransportForm,
  type TransportFormValues,
} from "@/components/transport/transport-form";

const INITIAL: TransportFormValues = {
  from: "",
  to: "",
  days: 3,
  people: 2,
  vehicleType: "Any",
};

export default function TransportPage() {
  const [values, setValues] = useState<TransportFormValues>(INITIAL);
  const resultsRef = useRef<HTMLDivElement>(null);

  const vehicleTypes = useMemo(
    () => Array.from(new Set(VEHICLES.map((v) => v.type))),
    []
  );

  const vehicles = useMemo(() => {
    const filtered = VEHICLES.filter((v) => v.capacity >= values.people);
    if (values.vehicleType === "Any") return filtered;
    return [...filtered].sort((a, b) => {
      if (a.type === values.vehicleType) return -1;
      if (b.type === values.vehicleType) return 1;
      return 0;
    });
  }, [values.people, values.vehicleType]);

  const scrollToResults = () => {
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen pb-24">
      <header className="relative pt-28 pb-16 px-6 md:px-10 max-w-6xl mx-auto text-center">
        <span className="text-primary font-headline font-bold text-xs tracking-widest uppercase">
          Transport
        </span>
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-headline font-extrabold tracking-tight text-on-background mt-4 leading-[1.05]">
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
            />
          </div>
        </div>

        <div ref={resultsRef} className="lg:col-span-3">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-headline font-extrabold tracking-tight">
              {vehicles.length} vehicle{vehicles.length === 1 ? "" : "s"}
            </h2>
            <span className="text-on-surface-variant text-sm">
              {values.days} day{values.days === 1 ? "" : "s"} ·{" "}
              {values.people} pax
            </span>
          </div>

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
              {vehicles.map((vehicle) => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  price={vehicle.pricePerDay * values.days}
                  priceLabel={`for ${values.days} day${values.days === 1 ? "" : "s"}`}
                  highlighted={
                    values.vehicleType !== "Any" &&
                    vehicle.type === values.vehicleType
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
