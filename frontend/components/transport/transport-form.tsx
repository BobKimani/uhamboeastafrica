"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { TransportPlace, TripType } from "@/lib/api/transport";
import {
  RoutePicker,
  SELECT_CLASS,
  TripTypeToggle,
  type RouteSelection,
} from "@/components/transport/route-picker";

export type TransportFormValues = RouteSelection & {
  tripType: TripType;
  people: number;
  vehicleType: string;
};


export function TransportForm({
  values,
  onChange,
  onSearch,
  vehicleTypes,
  places,
  placesLoading = false,
}: {
  values: TransportFormValues;
  onChange: (patch: Partial<TransportFormValues>) => void;
  onSearch: () => void;
  vehicleTypes: string[];
  places: TransportPlace[];
  placesLoading?: boolean;
}) {
  const [peopleInput, setPeopleInput] = useState(String(values.people));

  function handlePeopleChange(rawValue: string) {
    const digits = rawValue.replace(/\D/g, "");
    setPeopleInput(digits);
    if (!digits) return;
    const parsed = Number.parseInt(digits, 10);
    if (Number.isFinite(parsed) && parsed >= 1) onChange({ people: parsed });
  }

  function handlePeopleBlur() {
    const parsed = Number.parseInt(peopleInput, 10);
    const normalized = Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
    setPeopleInput(String(normalized));
    onChange({ people: normalized });
  }

  return (
    <Card className="p-8 md:p-10 border border-outline-variant/15">
      <span className="text-primary font-headline font-bold text-xs tracking-widest uppercase">
        Book a ride
      </span>
      <h2 className="text-3xl md:text-4xl font-headline font-extrabold tracking-tight text-on-background mt-2">
        Where to?
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
        <div className="md:col-span-2">
          <RoutePicker
            value={values}
            onChange={onChange}
            places={places}
            placesLoading={placesLoading}
          />
        </div>

        <div className="md:col-span-2">
          <TripTypeToggle
            value={values.tripType}
            onChange={(tripType) => onChange({ tripType })}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="transport-people">People</Label>
          <Input
            id="transport-people"
            inputMode="numeric"
            pattern="[0-9]*"
            className="text-base"
            value={peopleInput}
            onChange={(e) => handlePeopleChange(e.target.value)}
            onBlur={handlePeopleBlur}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="transport-vehicle-type">Vehicle type</Label>
          <select
            id="transport-vehicle-type"
            value={values.vehicleType}
            onChange={(e) => onChange({ vehicleType: e.target.value })}
            className={SELECT_CLASS}
          >
            <option value="Any">Any vehicle</option>
            {vehicleTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Button size="lg" className="w-full mt-8" onClick={onSearch}>
        <Search className="h-4 w-4" />
        Search vehicles
      </Button>
    </Card>
  );
}
