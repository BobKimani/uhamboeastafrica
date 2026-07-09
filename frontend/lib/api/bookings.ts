import { auth } from "@/lib/auth";
import type {
    Booking,
    CreateBookingInput,
    CreateBookingResult,
    BookingStatus,
} from "@/types/booking";

async function readJson(response: Response, fallbackMessage: string): Promise<any> {
    const text = await response.text();
    let result: { error?: string } = {};

    if (text) {
        try {
            result = JSON.parse(text);
        } catch {
            throw new Error(
                response.ok
                    ? "Server returned an invalid response"
                    : text.slice(0, 300)
            );
        }
    }

    if (!response.ok) {
        throw new Error(result.error || fallbackMessage);
    }

    return result;
}

export async function submitBooking(formData: CreateBookingInput) {
    const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
    });

    const result = await readJson(response, "Failed to submit booking");

    return result as CreateBookingResult;
}

export async function fetchAdminBookings(): Promise<Booking[]> {
    const currentUser = auth.currentUser;

    if (!currentUser) {
        throw new Error("Admin is not logged in");
    }

    const token = await currentUser.getIdToken();

    const response = await fetch("/api/bookings", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });

    const result = await readJson(response, "Failed to fetch bookings");

    return result.bookings as Booking[];
}

export async function updateBookingStatus(id: string, status: BookingStatus) {
    const currentUser = auth.currentUser;

    if (!currentUser) {
        throw new Error("Admin is not logged in");
    }

    const token = await currentUser.getIdToken();

    const response = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
    });

    const result = await readJson(response, "Failed to update booking status");

    return result;
}

export async function deleteBooking(id: string) {
    const currentUser = auth.currentUser;

    if (!currentUser) {
        throw new Error("Admin is not logged in");
    }

    const token = await currentUser.getIdToken();

    const response = await fetch(`/api/bookings/${id}`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    const result = await readJson(response, "Failed to delete booking");

    return result as { success: true; message: string };
}
