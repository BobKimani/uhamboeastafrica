import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { createInquirySchema } from "@/lib/validations/inquiry";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const parsed = createInquirySchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid inquiry data",
                    details: parsed.error.flatten(),
                },
                { status: 400 }
            );
        }

        const inquiryData = {
            ...parsed.data,
            status: "new" as const,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };

        const docRef = await getAdminDb().collection("inquiries").add(inquiryData);

        return NextResponse.json(
            {
                success: true,
                message: "Inquiry submitted successfully",
                id: docRef.id,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Create inquiry error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to submit inquiry" },
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
            .collection("inquiries")
            .orderBy("createdAt", "desc")
            .get();

        const inquiries = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        return NextResponse.json({ success: true, inquiries });
    } catch (error) {
        console.error("Fetch inquiries error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch inquiries" },
            { status: 500 }
        );
    }
}
