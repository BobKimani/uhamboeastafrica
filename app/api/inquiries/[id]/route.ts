import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { updateInquiryStatusSchema } from "@/lib/validations/inquiry";

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
        const parsed = updateInquiryStatusSchema.safeParse(body);

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

        await getAdminDb().collection("inquiries").doc(id).update({
            status: parsed.data.status,
            updatedAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({
            success: true,
            message: "Inquiry status updated successfully",
        });
    } catch (error) {
        console.error("Update inquiry status error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to update inquiry status" },
            { status: 500 }
        );
    }
}
