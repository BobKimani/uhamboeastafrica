import { apiUrl, readJson } from "@/lib/api/client";

export type PaymentStatus = "unpaid" | "pending" | "paid" | "failed";

export async function initiateKcbPayment(
  bookingId: string,
  phone: string
) {
  const response = await fetch(apiUrl("/api/payments/kcb/stk-push"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bookingId, phone }),
  });
  return readJson<{
    success: true;
    message: string;
    paymentId: string;
    paymentReference: string;
    invoiceNumber: string;
    status: "pending";
    checkoutRequestId: string;
  }>(response, "KCB payment request failed");
}

export async function fetchKcbPaymentStatus(bookingId: string) {
  const response = await fetch(apiUrl(`/api/payments/kcb/status/${bookingId}`), {
    cache: "no-store",
  });
  return readJson<{
    success: true;
    status: PaymentStatus;
    receiptNumber: string | null;
  }>(response, "Failed to fetch KCB payment status");
}
