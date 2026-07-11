"use client";

import { Search } from "lucide-react";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export type TransportFormValues = {
  from: string;
  to: string;
  days: number;
  people: number;
  vehicleType: string;
};

export function TransportForm({
  values,
  onChange,
  onSearch,
  vehicleTypes,
}: {
  values: TransportFormValues;
  onChange: (patch: Partial<TransportFormValues>) => void;
  onSearch: () => void;
  vehicleTypes: string[];
}) {
  return (
    <Card className="p-8 md:p-10 border border-outline-variant/15">
      <span className="text-primary font-headline font-bold text-xs tracking-widest uppercase">
        Book a ride
      </span>
      <h2 className="text-3xl md:text-4xl font-headline font-extrabold tracking-tight text-on-background mt-2">
        Where to?
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
        <div className="flex flex-col gap-2">
          <Label>From</Label>
          <Input
            placeholder="Nairobi"
            value={values.from}
            onChange={(e) => onChange({ from: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>To</Label>
          <Input
            placeholder="Maasai Mara"
            value={values.to}
            onChange={(e) => onChange({ to: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Days</Label>
          <Input
            type="number"
            min={1}
            value={values.days}
            onChange={(e) => {
              const parsed = Number(e.target.value);
              if (Number.isFinite(parsed)) {
                onChange({ days: Math.max(1, Math.round(parsed)) });
              }
            }}
            onBlur={() => {
              const normalized = Math.max(1, Number(values.days) || 1);
              onChange({ days: normalized });
            }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>People</Label>
          <Input
            type="number"
            min={1}
            value={values.people}
            onChange={(e) => {
              const parsed = Number(e.target.value);
              if (Number.isFinite(parsed)) {
                onChange({ people: Math.max(1, Math.round(parsed)) });
              }
            }}
            onBlur={() => {
              const normalized = Math.max(1, Number(values.people) || 1);
              onChange({ people: normalized });
            }}
          />
        </div>
        <div className="flex flex-col gap-2 md:col-span-2">
          <Label>Vehicle type</Label>
          <select
            value={values.vehicleType}
            onChange={(e) => onChange({ vehicleType: e.target.value })}
            className="flex h-12 w-full rounded-xl bg-surface-container-highest px-4 text-sm text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
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
