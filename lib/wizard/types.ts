export type GroupType = "Solo" | "Couple" | "Family" | "Group";
export type ServiceType = "accommodation" | "transport" | "both";
export type RoomType = "Single" | "Twin" | "Double" | "Triple";
export type Currency = "USD" | "KES" | "EUR";

export const STEPS = [
  { slug: "destination", title: "Destination", label: "Exploring Horizons" },
  { slug: "dates", title: "Dates", label: "Pick Your Window" },
  { slug: "travelers", title: "Travel Group", label: "Who's Coming" },
  { slug: "service", title: "Service Type", label: "What You Need" },
  { slug: "details", title: "Details", label: "Fine-tune" },
  { slug: "budget", title: "Budget", label: "Set the Tone" },
  { slug: "review", title: "Review", label: "Almost There" },
] as const;

export type StepSlug = (typeof STEPS)[number]["slug"];

export type WizardState = {
  destination?: string;
  startDate?: string;
  endDate?: string;
  group?: GroupType;
  paxCount: number;
  serviceType?: ServiceType;
  accommodation?: {
    region?: string;
    roomType?: RoomType;
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
