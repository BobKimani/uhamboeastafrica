import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { updateBookingStatusSchema } from "@/lib/validations/booking";

type Params = {
    params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
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

        const { id } = await params;
        const body = await request.json();
        const parsed = updateBookingStatusSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid status",
                    details: parsed.error.flatten(),
                },
                { status: 400 }
            );
        }

        await getAdminDb().collection("bookings").doc(id).update({
            status: parsed.data.status,
            updatedAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({
            success: true,
            message: "Booking status updated successfully",
        });
    } catch (error) {
        console.error("Update booking status error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to update booking status" },
            { status: 500 }
        );
    }
}
