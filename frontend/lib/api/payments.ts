export type PaymentStatus = "unpaid" | "pending" | "paid" | "failed";

async function readJson(response: Response) {
  const text = await response.text();
  let result: { error?: string } = {};

  if (text) {
    try {
      result = JSON.parse(text);
    } catch {
      throw new Error(
        response.ok ? "KCB returned an invalid response" : text.slice(0, 300)
      );
    }
  }

  if (!response.ok) {
    throw new Error(result.error || "KCB payment request failed");
  }
  return result;
}

export async function initiateKcbPayment(bookingId: string, phone: string) {
  const response = await fetch("/api/payments/kcb/stk-push", {
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

export async function fetchKcbPaymentStatus(bookingId: string) {
  const response = await fetch(`/api/payments/kcb/status/${bookingId}`, {
    cache: "no-store",
  });
  return readJson(response) as Promise<{
    success: true;
    status: PaymentStatus;
    receiptNumber: string | null;
  }>;
}
