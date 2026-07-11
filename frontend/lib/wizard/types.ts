export type GroupType = "Solo" | "Couple" | "Family" | "Group";
export type ServiceType = "accommodation" | "transport" | "both";
export type RoomType = "Single" | "Twin" | "Double" | "Triple";
export type Currency = "USD" | "KES";

export const STEPS = [
  { slug: "destination", title: "Destination", label: "Exploring Horizons" },
  { slug: "basics", title: "Trip Basics", label: "When & Who" },
  { slug: "services", title: "Services", label: "What You Need" },
  { slug: "review", title: "Budget & Review", label: "Almost There" },
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
  accommodation?: {
    region?: string;
    rooms?: Partial<Record<RoomType, number>>;
  };
  transport?: {
    from?: string;
    to?: string;
    days?: number;
    vehicleType?: string;
  };
  budget: {
    currency: Currency;
    min: number;
    max: number;
  };
};

export const INITIAL_STATE: WizardState = {
  paxCount: 2,
  accommodation: {},
  transport: { days: 3 },
  budget: { currency: "USD", min: 1000, max: 5000 },
};
