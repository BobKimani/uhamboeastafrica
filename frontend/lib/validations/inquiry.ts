import { z } from "zod";

export const createInquirySchema = z.object({
    fullName: z.string().min(2, "Full name is required"),
    contact: z.string().min(7, "Contact is required"),
    email: z.string().email("Valid email is required"),
    message: z.string().min(10, "Message must be at least 10 characters"),
});

export const updateInquiryStatusSchema = z.object({
    status: z.enum(["new", "read", "replied", "archived"]),
});
