import { auth } from "@/lib/auth";
import type {
    Booking,
    CreateBookingInput,
    CreateBookingResult,
    BookingStatus,
} from "@/types/booking";
import { apiUrl, readJson } from "@/lib/api/client";

export async function submitBooking(formData: CreateBookingInput) {
    const response = await fetch(apiUrl("/api/bookings"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
    });

    const result = await readJson<CreateBookingResult>(
        response,
        "Failed to submit booking"
    );

    return result;
}

export async function fetchAdminBookings(): Promise<Booking[]> {
    const currentUser = auth.currentUser;

    if (!currentUser) {
        throw new Error("Admin is not logged in");
    }

    const token = await currentUser.getIdToken();

    const response = await fetch(apiUrl("/api/bookings"), {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });

    const result = await readJson<{ bookings: Booking[] }>(
        response,
        "Failed to fetch bookings"
    );

    return result.bookings;
}

export async function updateBookingStatus(id: string, status: BookingStatus) {
    const currentUser = auth.currentUser;

    if (!currentUser) {
        throw new Error("Admin is not logged in");
    }

    const token = await currentUser.getIdToken();

    const response = await fetch(apiUrl(`/api/bookings/${id}`), {
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

    const response = await fetch(apiUrl(`/api/bookings/${id}`), {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    const result = await readJson<{ success: true; message: string }>(
        response,
        "Failed to delete booking"
    );

    return result;
}
