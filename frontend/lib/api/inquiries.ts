import { auth } from "@/lib/auth";
import type {
    Inquiry,
    CreateInquiryInput,
    InquiryStatus,
} from "@/types/inquiry";
import { apiUrl, readJson } from "@/lib/api/client";

export async function submitInquiry(formData: CreateInquiryInput) {
    const response = await fetch(apiUrl("/api/inquiries"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
    });

    const result = await readJson<{ success: true; message: string; id: string }>(
        response,
        "Failed to submit inquiry"
    );

    return result;
}

export async function fetchAdminInquiries(): Promise<Inquiry[]> {
    const currentUser = auth.currentUser;

    if (!currentUser) {
        throw new Error("Admin is not logged in");
    }

    const token = await currentUser.getIdToken();

    const response = await fetch(apiUrl("/api/inquiries"), {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });

    const result = await readJson<{ inquiries: Inquiry[] }>(
        response,
        "Failed to fetch inquiries"
    );

    return result.inquiries;
}

export async function updateInquiryStatus(id: string, status: InquiryStatus) {
    const currentUser = auth.currentUser;

    if (!currentUser) {
        throw new Error("Admin is not logged in");
    }

    const token = await currentUser.getIdToken();

    const response = await fetch(apiUrl(`/api/inquiries/${id}`), {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
    });

    const result = await readJson(response, "Failed to update inquiry status");

    return result;
}
