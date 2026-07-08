export type PaymentStatus = "unpaid" | "pending" | "paid" | "failed";

async function readJson(response: Response) {
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "M-PESA payment request failed");
  }
  return result;
}

export async function initiateMpesaPayment(bookingId: string, phone: string) {
  const response = await fetch("/api/payments/mpesa/stk-push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bookingId, phone }),
  });
  return readJson(response) as Promise<{
    success: true;
    message: string;
    checkoutRequestId: string;
  }>;
}

export async function fetchMpesaPaymentStatus(bookingId: string) {
  const response = await fetch(`/api/payments/mpesa/status/${bookingId}`, {
    cache: "no-store",
  });
  return readJson(response) as Promise<{
    success: true;
    status: PaymentStatus;
    receiptNumber: string | null;
  }>;
}
