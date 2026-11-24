import { apiUrl, readJson } from "@/lib/api/client";
import { csrfHeaders } from "@/lib/api/csrf";

export type TripType = "one_way" | "return";

export const TRIP_TYPE_LABELS: Record<TripType, string> = {
  one_way: "One way (drop-off)",
  return: "Return (driver waits)",
};

export type TransportPlace = {
  id: string;
  name: string;
  /** Places this one has a bookable (priced, reviewed) route to. */
  destinations: string[];
};

export type TransportQuote = {
  fromPlaceId: string;
  fromPlace: string;
  toPlaceId: string;
  toPlace: string;
  vehicleId: string;
  vehicleType: string;
  tripType: TripType;
  distanceKm: number;
  kmPerLitre: number;
  fuelPriceKes: number;
  legs: number;
  fuelKes: number;
  driverAllowanceKes: number;
  marginKes: number;
  multiplier: number;
  totalKes: number;
};

export type QuoteErrorCode =
  | "route_not_found"
  | "route_needs_review"
  | "vehicle_not_quotable"
  | "invalid_trip_type"
  | "invalid_request"
  | "pricing_unavailable";

export type QuoteResult =
  | { ok: true; quote: TransportQuote }
  | { ok: false; code: QuoteErrorCode; error: string };

export async function fetchTransportPlaces(): Promise<TransportPlace[]> {
  const response = await fetch(apiUrl("/api/transport/places"), {
    method: "GET",
    cache: "no-store",
  });
  const result = await readJson<{ places: TransportPlace[] }>(
    response,
    "Failed to load places"
  );
  return result.places;
}

/** Server-calculated price for a listed route, vehicle and trip type. */
export async function fetchTransportQuote(params: {
  fromId: string;
  toId: string;
  vehicleId: string;
  tripType: TripType;
}): Promise<QuoteResult> {
  const search = new URLSearchParams({
    from: params.fromId,
    to: params.toId,
    vehicleId: params.vehicleId,
    tripType: params.tripType,
  });
  const response = await fetch(apiUrl(`/api/transport/quote?${search}`), {
    method: "GET",
    cache: "no-store",
  });
  const body = (await response.json().catch(() => null)) as
    | { success: true; quote: TransportQuote }
    | { success: false; code: QuoteErrorCode; error: string }
    | null;
  if (body && body.success) return { ok: true, quote: body.quote };
  return {
    ok: false,
    code: body && !body.success ? body.code : "pricing_unavailable",
    error: body && !body.success ? body.error : "Could not price this trip",
  };
}

// --------------------------------------------------------------- admin
export type TransportPricingSettings = {
  fuelPriceKes: number;
  marginKes: number;
  multiplier: number;
  updatedAt: string | null;
};

export type TransportRoute = {
  id: string;
  fromPlaceId: string;
  fromPlace: string;
  toPlaceId: string;
  toPlace: string;
  distanceKm: number;
  needsReview: boolean;
  updatedAt: string | null;
};

export async function fetchPricingSettings(): Promise<TransportPricingSettings> {
  const response = await fetch(apiUrl("/api/transport/settings"), {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  const result = await readJson<{ settings: TransportPricingSettings }>(
    response,
    "Failed to load pricing settings"
  );
  return result.settings;
}

export async function savePricingSettings(
  settings: Pick<TransportPricingSettings, "fuelPriceKes" | "marginKes" | "multiplier">
): Promise<TransportPricingSettings> {
  const response = await fetch(apiUrl("/api/transport/settings"), {
    method: "PUT",
    credentials: "include",
    headers: { ...(await csrfHeaders()), "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  const result = await readJson<{ settings: TransportPricingSettings }>(
    response,
    "Failed to save pricing settings"
  );
  return result.settings;
}

export async function fetchTransportRoutes(filters: {
  search?: string;
  needsReview?: boolean;
} = {}): Promise<TransportRoute[]> {
  const search = new URLSearchParams();
  if (filters.search) search.set("search", filters.search);
  if (filters.needsReview) search.set("needsReview", "true");
  const response = await fetch(apiUrl(`/api/transport/routes?${search}`), {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  const result = await readJson<{ routes: TransportRoute[] }>(
    response,
    "Failed to load routes"
  );
  return result.routes;
}

export async function createTransportRoute(route: {
  fromPlace: string;
  toPlace: string;
  distanceKm: number;
}): Promise<TransportRoute> {
  const response = await fetch(apiUrl("/api/transport/routes"), {
    method: "POST",
    credentials: "include",
    headers: { ...(await csrfHeaders()), "Content-Type": "application/json" },
    body: JSON.stringify(route),
  });
  const result = await readJson<{ route: TransportRoute }>(
    response,
    "Failed to add route"
  );
  return result.route;
}

export async function updateTransportRoute(
  id: string,
  patch: { distanceKm?: number; needsReview?: boolean }
): Promise<TransportRoute> {
  const response = await fetch(apiUrl(`/api/transport/routes/${id}`), {
    method: "PATCH",
    credentials: "include",
    headers: { ...(await csrfHeaders()), "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const result = await readJson<{ route: TransportRoute }>(
    response,
    "Failed to update route"
  );
  return result.route;
}

export async function deleteTransportRoute(id: string) {
  const response = await fetch(apiUrl(`/api/transport/routes/${id}`), {
    method: "DELETE",
    credentials: "include",
    headers: await csrfHeaders(),
  });
  return readJson<{ success: true; message: string }>(
    response,
    "Failed to delete route"
  );
}
