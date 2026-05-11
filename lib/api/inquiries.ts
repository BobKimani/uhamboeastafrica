import { auth } from "@/lib/auth";
import type {
    Inquiry,
    CreateInquiryInput,
    InquiryStatus,
} from "@/types/inquiry";

export async function submitInquiry(formData: CreateInquiryInput) {
    const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || "Failed to submit inquiry");
    }

    return result as { success: true; message: string; id: string };
}

export async function fetchAdminInquiries(): Promise<Inquiry[]> {
    const currentUser = auth.currentUser;

    if (!currentUser) {
        throw new Error("Admin is not logged in");
    }

    const token = await currentUser.getIdToken();

    const response = await fetch("/api/inquiries", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || "Failed to fetch inquiries");
    }

    return result.inquiries as Inquiry[];
}

export async function updateInquiryStatus(id: string, status: InquiryStatus) {
    const currentUser = auth.currentUser;

    if (!currentUser) {
        throw new Error("Admin is not logged in");
    }

    const token = await currentUser.getIdToken();

    const response = await fetch(`/api/inquiries/${id}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || "Failed to update inquiry status");
    }

    return result;
}
