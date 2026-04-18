import { HOTELS } from "@/lib/data/hotels";
import { VEHICLES } from "@/lib/data/vehicles";
import { nightsBetween } from "@/lib/utils";
import type { WizardState } from "@/lib/wizard/types";

export type TripLineItem = { label: string; amount: number };
export type TripEstimate = {
  lines: TripLineItem[];
  subtotal: number;
  service: number;
  total: number;
  currency: string;
};

export function estimateTrip(
  state: WizardState,
  hotelId?: string,
  vehicleId?: string
): TripEstimate {
  const lines: TripLineItem[] = [];
  const nights = nightsBetween(state.startDate, state.endDate);
  const days = state.transport?.days ?? Math.max(nights, 1);

  const hotel = hotelId
    ? HOTELS.find((h) => h.id === hotelId)
    : HOTELS.find((h) => h.destination === state.destination) ?? HOTELS[0];
  const vehicle = vehicleId
    ? VEHICLES.find((v) => v.id === vehicleId)
    : VEHICLES.find((v) => v.type === state.transport?.vehicleType) ??
      VEHICLES[0];

  if (state.serviceType !== "transport" && hotel) {
    lines.push({
      label: `${hotel.name} (${nights || 1} night${nights === 1 ? "" : "s"})`,
      amount: hotel.pricePerNight * Math.max(nights, 1),
    });
  }
  if (state.serviceType !== "accommodation" && vehicle) {
    lines.push({
      label: `${vehicle.name} (${days} day${days === 1 ? "" : "s"})`,
      amount: vehicle.pricePerDay * days,
    });
  }
  lines.push({ label: "Safari Permits & Fees", amount: 420 });

  const subtotal = lines.reduce((a, l) => a + l.amount, 0);
  const service = Math.round(subtotal * 0.1);
  lines.push({ label: "Service Charge (10%)", amount: service });

  return {
    lines,
    subtotal,
    service,
    total: subtotal + service,
    currency: state.budget.currency,
  };
}
