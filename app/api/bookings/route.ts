import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { createBookingSchema } from "@/lib/validations/booking";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const parsed = createBookingSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid booking data",
                    details: parsed.error.flatten(),
                },
                { status: 400 }
            );
        }

        const bookingData = {
            ...parsed.data,
            status: "new" as const,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };

        const docRef = await getAdminDb().collection("bookings").add(bookingData);

        return NextResponse.json(
            {
                success: true,
                message: "Booking submitted successfully",
                id: docRef.id,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Create booking error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to submit booking" },
            { status: 500 }
        );
    }
}

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get("authorization");

        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const token = authHeader.split("Bearer ")[1];
        await getAdminAuth().verifyIdToken(token);

        const snapshot = await getAdminDb()
            .collection("bookings")
            .orderBy("createdAt", "desc")
            .get();

        const bookings = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        return NextResponse.json({ success: true, bookings });
    } catch (error) {
        console.error("Fetch bookings error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch bookings" },
            { status: 500 }
        );
    }
}
