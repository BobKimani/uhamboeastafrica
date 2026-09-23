export type GroupType = "Solo" | "Couple" | "Family" | "Group";
export type ServiceType = "accommodation" | "transport" | "both";
export type RoomType = "Single" | "Twin" | "Double" | "Triple";
export type Currency = "USD" | "KES";

export const STEPS = [
  { slug: "destination", title: "Destination", label: "Exploring Horizons" },
  { slug: "basics", title: "Trip Basics", label: "When & Who" },
  { slug: "accommodation", title: "Accommodation", label: "Where You'll Stay" },
  { slug: "transport", title: "Transport", label: "Getting Around" },
  { slug: "review", title: "Review", label: "Almost There" },
] as const;

export type StepSlug = (typeof STEPS)[number]["slug"];

export function totalRooms(
  rooms?: Partial<Record<RoomType, number>>
): number {
  return Object.values(rooms ?? {}).reduce(
    (sum, count) => sum + (count ?? 0),
    0
  );
}

export function formatRooms(
  rooms?: Partial<Record<RoomType, number>>
): string {
  const parts = Object.entries(rooms ?? {})
    .filter(([, count]) => (count ?? 0) > 0)
    .map(([type, count]) => `${count} ${type}`);
  return parts.length ? parts.join(", ") : "—";
}

export type WizardState = {
  destination?: string;
  startDate?: string;
  endDate?: string;
  group?: GroupType;
  paxCount: number;
  serviceType?: ServiceType;
  /** Traveller opted out of accommodation (step 3) or transport (step 4). */
  skipAccommodation?: boolean;
  skipTransport?: boolean;
  currency: Currency;
  accommodation?: {
    /** Star rating chosen before picking a hotel; 0 means "unrated". */
    stars?: number;
    hotelId?: string;
    hotelName?: string;
    region?: string;
    rooms?: Partial<Record<RoomType, number>>;
  };
  transport?: {
    from?: string;
    to?: string;
    days?: number;
    vehicleType?: string;
  };
};

export const INITIAL_STATE: WizardState = {
  paxCount: 2,
  serviceType: "both",
  currency: "KES",
  accommodation: {},
  transport: { days: 3 },
};

/** Whether the traveller skipped each service; falls back to an older saved serviceType. */
export function skipsAccommodation(state: WizardState): boolean {
  return state.skipAccommodation ?? state.serviceType === "transport";
}
export function skipsTransport(state: WizardState): boolean {
  return state.skipTransport ?? state.serviceType === "accommodation";
}
export function serviceTypeFor(
  skipAccommodation: boolean,
  skipTransport: boolean
): ServiceType {
  if (skipAccommodation) return "transport";
  if (skipTransport) return "accommodation";
  return "both";
}
