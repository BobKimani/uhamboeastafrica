import { USD_TO_KES } from "@/lib/currency";
import { nightsBetween } from "@/lib/utils";
import {
  hasRates,
  type Hotel,
  type RateCurrency,
  type RoomRate,
  type RoomRateKey,
} from "@/lib/data/hotels";
import type { Vehicle } from "@/lib/data/vehicles";
import type { Currency, RoomType, WizardState } from "@/lib/wizard/types";

/**
 * Mirrors the Uhambo "SAFARI CALCULATION SHEET" (USD and KSHS versions):
 *   passenger cost = accommodation + MISC + Water + Flying Doctor
 *   price          = cost + 30% (row 38, factor 0.3), rounded up
 * Park fees and flights are quoted separately by the team.
 */
export const COSTING = {
  markup: 0.3,
  perGuestExtras: {
    USD: { misc: 20, water: 10, flyingDoctor: 10 },
    KES: { misc: 2000, water: 1000, flyingDoctor: 1000 },
  } satisfies Record<RateCurrency, Record<string, number>>,
};

// Guests per room and which contract rate prices it.
const ROOM_PRICING: Record<
  RoomType,
  { guests: number; rate: RoomRateKey; perPerson: boolean }
> = {
  Single: { guests: 1, rate: "single", perPerson: false },
  Twin: { guests: 2, rate: "sharing", perPerson: true },
  Double: { guests: 2, rate: "sharing", perPerson: true },
  Triple: { guests: 3, rate: "triple", perPerson: true },
};

export type TripLineItem = { label: string; amount: number; detail?: string };
export type TripEstimate = {
  lines: TripLineItem[];
  total: number;
  /** Amounts are in the app's base unit (USD); format with formatTravelPrice. */
  currency: Currency;
  notes: string[];
};

const toBase = (amount: number, source: RateCurrency) =>
  source === "KES" ? amount / USD_TO_KES : amount;

function isFestive(date: Date) {
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  return (m === 11 && d >= 22) || (m === 0 && d <= 2);
}

function nightlyRate(rate: RoomRate | undefined, date: Date): number | null {
  if (!rate) return null;
  if (isFestive(date) && rate.festive) return rate.festive;
  return rate.monthly[date.getUTCMonth()] ?? null;
}

/** Contract rates in the traveller's currency when available, otherwise the other one. */
function pickRateCurrency(hotel: Hotel, preferred: Currency): RateCurrency | null {
  const order: RateCurrency[] = preferred === "KES" ? ["KES", "USD"] : ["USD", "KES"];
  return order.find((c) => hotel.rates?.[c]?.sharing || hotel.rates?.[c]?.single) ?? null;
}

function stayDates(start: string | undefined, nights: number): Date[] {
  if (!start) return [];
  const [y, m, d] = start.split("-").map(Number);
  return Array.from({ length: nights }, (_, i) => new Date(Date.UTC(y, m - 1, d + i)));
}

export function estimateAccommodation(
  state: WizardState,
  hotel: Hotel | undefined
): { lines: TripLineItem[]; notes: string[] } {
  const nights = Math.max(nightsBetween(state.startDate, state.endDate), 1);
  const hotelLabel = hotel?.name ?? state.accommodation?.hotelName ?? "Accommodation";
  const nightsLabel = `${nights} night${nights === 1 ? "" : "s"}`;

  if (!hotel || !hasRates(hotel)) {
    return {
      lines: [],
      notes: [
        `${hotelLabel}: rates on request — your concierge will add the stay to your quote.`,
      ],
    };
  }

  const source = pickRateCurrency(hotel, state.currency)!;
  const rates = hotel.rates![source]!;
  const dates = stayDates(state.startDate, nights);
  const notes: string[] = [];

  let stayCost = 0;
  const roomParts: string[] = [];
  for (const [type, count] of Object.entries(state.accommodation?.rooms ?? {}) as [
    RoomType,
    number,
  ][]) {
    if (!count) continue;
    const pricing = ROOM_PRICING[type];
    // Fall back to the sharing rate when the hotel has no single/triple rate.
    const rate = rates[pricing.rate] ?? rates.sharing;
    const perPerson = rates[pricing.rate] ? pricing.perPerson : true;
    if (!rates[pricing.rate] && pricing.rate !== "sharing") {
      notes.push(`${type} rooms are estimated at the per-person sharing rate.`);
    }
    let roomNights = 0;
    for (const date of dates) {
      const nightly = nightlyRate(rate, date) ?? 0;
      roomNights += perPerson ? nightly * pricing.guests : nightly;
    }
    stayCost += roomNights * count;
    roomParts.push(`${count} ${type}`);
  }

  const extras = COSTING.perGuestExtras[source];
  const extrasPerGuest = extras.misc + extras.water + extras.flyingDoctor;
  const extrasCost = extrasPerGuest * state.paxCount;
  const withMarkup = (amount: number) => Math.ceil(amount * (1 + COSTING.markup));

  return {
    lines: [
      {
        label: `${hotelLabel} (${nightsLabel})`,
        detail: roomParts.join(", "),
        amount: toBase(withMarkup(stayCost), source),
      },
      {
        label: `Guest services (${state.paxCount} guest${state.paxCount === 1 ? "" : "s"})`,
        detail: "Water, Flying Doctors cover and incidentals",
        amount: toBase(withMarkup(extrasCost), source),
      },
    ],
    notes,
  };
}

export function estimateTrip(
  state: WizardState,
  vehicles: Vehicle[] = [],
  hotels: Hotel[] = []
): TripEstimate {
  const lines: TripLineItem[] = [];
  const notes: string[] = [];
  const nights = nightsBetween(state.startDate, state.endDate);
  const days = state.transport?.days ?? Math.max(nights, 1);

  if (state.serviceType !== "transport") {
    const hotel = hotels.find((h) => h.id === state.accommodation?.hotelId);
    const acc = estimateAccommodation(state, hotel);
    lines.push(...acc.lines);
    notes.push(...acc.notes);
  }

  if (state.serviceType !== "accommodation") {
    const vehicle = vehicles.find((v) => v.type === state.transport?.vehicleType);
    if (vehicle) {
      lines.push({
        label: `${vehicle.name} (${days} day${days === 1 ? "" : "s"})`,
        amount: vehicle.pricePerDay * days,
      });
    }
  }

  notes.push("Park fees and flights are quoted separately.");

  return {
    lines,
    total: lines.reduce((sum, line) => sum + line.amount, 0),
    currency: state.currency,
    notes,
  };
}
