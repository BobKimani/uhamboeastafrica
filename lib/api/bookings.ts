import { auth } from "@/lib/auth";
import type { Booking, CreateBookingInput, BookingStatus } from "@/types/booking";

export async function submitBooking(formData: CreateBookingInput) {
    const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || "Failed to submit booking");
    }

    return result as { success: true; message: string; id: string };
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

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || "Failed to fetch bookings");
    }

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

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || "Failed to update booking status");
    }

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

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || "Failed to delete booking");
    }

    return result as { success: true; message: string };
}
