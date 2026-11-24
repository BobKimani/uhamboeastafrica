import type {
    Booking,
    CreateBookingInput,
    CreateBookingResult,
    BookingStatus,
} from "@/types/booking";
import { apiUrl, readJson } from "@/lib/api/client";
import { csrfHeaders } from "@/lib/api/csrf";
import type { TransportQuote } from "@/lib/api/transport";

/** The trip price changed between quoting and booking (e.g. new fuel price). */
export class BookingPriceChangedError extends Error {
    constructor(message: string, readonly quote: TransportQuote) {
        super(message);
        this.name = "BookingPriceChangedError";
    }
}

/**
 * The route or vehicle can no longer be priced online (e.g. the route was
 * flagged for review meanwhile). The booking can still be sent as a quote request.
 */
export class BookingRouteUnavailableError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "BookingRouteUnavailableError";
    }
}

const ROUTE_UNAVAILABLE_CODES = new Set([
    "route_needs_review",
    "route_not_found",
    "vehicle_not_quotable",
]);

export async function submitBooking(formData: CreateBookingInput) {
    const response = await fetch(apiUrl("/api/bookings"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
    });

    if (!response.ok) {
        const body = (await response.clone().json().catch(() => null)) as
            | { code?: string; error?: string; quote?: TransportQuote }
            | null;
        if (response.status === 409 && body?.code === "price_changed" && body.quote) {
            throw new BookingPriceChangedError(
                body.error || "The price for this trip has changed.",
                body.quote
            );
        }
        if (body?.code && ROUTE_UNAVAILABLE_CODES.has(body.code)) {
            throw new BookingRouteUnavailableError(
                body.error || "This route can no longer be booked online."
            );
        }
    }

    const result = await readJson<CreateBookingResult>(
        response,
        "Failed to submit booking"
    );

    return result;
}

export async function fetchAdminBookings(): Promise<Booking[]> {
    const response = await fetch(apiUrl("/api/bookings"), {
        method: "GET",
        credentials: "include",
    });

    const result = await readJson<{ bookings: Booking[] }>(
        response,
        "Failed to fetch bookings"
    );

    return result.bookings;
}

export async function updateBookingStatus(id: string, status: BookingStatus) {
    const response = await fetch(apiUrl(`/api/bookings/${id}`), {
        method: "PATCH",
        credentials: "include",
        headers: {
            ...(await csrfHeaders()),
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
    });

    const result = await readJson(response, "Failed to update booking status");

    return result;
}

export async function deleteBooking(id: string) {
    const response = await fetch(apiUrl(`/api/bookings/${id}`), {
        method: "DELETE",
        credentials: "include",
        headers: await csrfHeaders(),
    });

    const result = await readJson<{ success: true; message: string }>(
        response,
        "Failed to delete booking"
    );

    return result;
}
