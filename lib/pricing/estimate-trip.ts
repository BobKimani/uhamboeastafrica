import { VEHICLES } from "@/lib/data/vehicles";
import { nightsBetween } from "@/lib/utils";
import type { WizardState, Currency } from "@/lib/wizard/types";

export type TripLineItem = { label: string; amount: number };
export type TripEstimate = {
  lines: TripLineItem[];
  subtotal: number;
  service: number;
  total: number;
  currency: Currency;
};

export function estimateTrip(state: WizardState): TripEstimate {
  const lines: TripLineItem[] = [];
  const nights = nightsBetween(state.startDate, state.endDate);
  const days = state.transport?.days ?? Math.max(nights, 1);

  const vehicle = VEHICLES.find((v) => v.type === state.transport?.vehicleType) ?? VEHICLES[0];

  if (state.serviceType !== "transport") {
    const accLabel = state.accommodation?.region ?? "Accommodation";
    lines.push({
      label: `${accLabel} (${nights || 1} night${nights === 1 ? "" : "s"})`,
      amount: state.budget.min,
    });
  }

  if (state.serviceType !== "accommodation" && vehicle) {
    lines.push({
      label: `${vehicle.name} (${days} day${days === 1 ? "" : "s"})`,
      amount: vehicle.pricePerDay * days,
    });
  }

  const subtotal = lines.reduce((a, l) => a + l.amount, 0);
  const service = Math.round(state.budget.min * 0.1);
  lines.push({ label: "Service Charge (10%)", amount: service });

  return {
    lines,
    subtotal,
    service,
    total: subtotal + service,
    currency: state.budget.currency,
  };
}
