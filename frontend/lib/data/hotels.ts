export type RateCurrency = "KES" | "USD";
export type RoomRateKey = "sharing" | "single" | "triple";

/** One room-type rate: a value per calendar month (Jan..Dec) plus the 22 Dec – 2 Jan rate. */
export type RoomRate = {
  monthly: (number | null)[];
  festive: number | null;
};

/**
 * Contract rates from the HOTEL RATES workbook.
 * "sharing" is per person sharing, "single" is per single room,
 * "triple" is per person in a triple room.
 */
export type HotelRates = Partial<
  Record<RateCurrency, Partial<Record<RoomRateKey, RoomRate>>>
>;

export type Hotel = {
  id: string;
  name: string;
  country: string;
  region: string;
  destination: string;
  pricePerNight: number;
  rating: number;
  image: string;
  tags: string[];
  description: string;
  topRated?: boolean;
  isAvailable: boolean;
  rates?: HotelRates | null;
};

export function hasRates(hotel?: Pick<Hotel, "rates"> | null): boolean {
  return Object.values(hotel?.rates ?? {}).some(
    (byRoom) => byRoom && Object.keys(byRoom).length > 0
  );
}
