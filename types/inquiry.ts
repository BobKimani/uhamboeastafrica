import type { FirestoreTimestamp } from "@/types/booking";

export type InquiryStatus = "new" | "read" | "replied" | "archived";

export type Inquiry = {
    id: string;

    fullName: string;
    contact: string;
    email: string;
    message: string;

    status: InquiryStatus;

    createdAt: FirestoreTimestamp;
    updatedAt: FirestoreTimestamp;
};

export type CreateInquiryInput = {
    fullName: string;
    contact: string;
    email: string;
    message: string;
};
