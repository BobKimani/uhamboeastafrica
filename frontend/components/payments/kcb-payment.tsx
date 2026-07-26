"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  LoaderCircle,
  RefreshCw,
  Smartphone,
  TriangleAlert,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import {
  fetchKcbPaymentStatus,
  initiateKcbPayment,
  type PaymentStatus,
} from "@/lib/api/payments";

const PAYBILL = "522522";
const ACCOUNT = "7698390";

/** Accepts 07xx / 01xx / 2547xx / +2547xx (and 254/+2541x). */
function isValidKenyanPhone(value: string) {
  const compact = value.replace(/[\s-]/g, "");
  return /^(?:\+?254|0)(?:7|1)\d{8}$/.test(compact);
}

function formatKes(amount: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function KcbPayment({
  bookingId,
  initialPhone,
  amountKes,
  onPaid,
  onClose,
}: {
  bookingId: string;
  initialPhone: string;
  amountKes: number;
  onPaid: () => void;
  onClose?: () => void;
}) {
  const [phone, setPhone] = useState(initialPhone);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [status, setStatus] = useState<PaymentStatus>("unpaid");
  const [message, setMessage] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [paybillOpen, setPaybillOpen] = useState(false);

  const phoneValid = isValidKenyanPhone(phone);
  const showPhoneError = phoneTouched && phone.length > 0 && !phoneValid;
  const formattedAmount = formatKes(amountKes);

  useEffect(() => {
    if (status !== "pending") return;
    const interval = window.setInterval(async () => {
      try {
        const result = await fetchKcbPaymentStatus(bookingId);
        setStatus(result.status);
        setReceipt(result.receiptNumber);
        if (result.status === "paid") {
          setMessage(null);
          onPaid();
        } else if (result.status === "failed") {
          setMessage(
            "The M-PESA request was cancelled or timed out before completing."
          );
        }
      } catch {
        // A transient polling failure should not interrupt the prompt.
      }
    }, 3000);
    return () => window.clearInterval(interval);
  }, [bookingId, onPaid, status]);

  async function handlePay() {
    if (!phoneValid) {
      setPhoneTouched(true);
      return;
    }
    setMessage(null);
    setStatus("pending");
    try {
      const result = await initiateKcbPayment(bookingId, phone);
      setMessage(result.message);
    } catch (error) {
      setStatus("failed");
      setMessage(
        error instanceof Error ? error.message : "Payment request failed."
      );
    }
  }

  function handleCancelPayment() {
    setStatus("unpaid");
    setMessage("Payment cancelled. You can start a new request when ready.");
    onClose?.();
  }

  return (
    <section
      aria-label="KCB payment"
      className="overflow-hidden rounded-2xl border border-kcb/20 bg-surface-container-lowest"
    >
      {/* Brand header */}
      <header className="flex items-center gap-3 border-b border-kcb/15 bg-kcb/[0.06] px-5 py-4 md:px-6">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-kcb/12 text-kcb">
          <Smartphone className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-kcb">
            payment
          </p>
          <p className="text-sm text-on-surface-variant">
            {status === "paid"
              ? "Payment complete"
              : "Secure mobile payment to lock in your ride"}
          </p>
        </div>
      </header>

      <div className="p-5 md:p-6">
        {/* ---- PAID ---------------------------------------------------- */}
        {status === "paid" ? (
          <div
            role="status"
            aria-live="polite"
            className="flex flex-col items-center text-center"
          >
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-kcb/12 text-kcb animate-in zoom-in fade-in duration-300">
              <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-headline text-2xl font-extrabold text-on-surface">
              Payment received
            </h3>
            <p className="mt-1 text-on-surface-variant">
              <span className="font-bold text-kcb">{formattedAmount}</span> paid
              successfully
            </p>
            {receipt && (
              <p className="mt-4 rounded-xl bg-surface-container-low px-4 py-2 text-sm">
                <span className="text-on-surface-variant">Receipt</span>{" "}
                <span className="font-bold tracking-wide text-on-surface">
                  {receipt}
                </span>
              </p>
            )}
            <Button
              type="button"
              size="lg"
              variant="kcb"
              className="mt-6 w-full"
              onClick={onClose}
            >
              Done
            </Button>
          </div>
        ) : status === "pending" ? (
          /* ---- PENDING ----------------------------------------------- */
          <div role="status" aria-live="polite" className="flex flex-col items-center text-center">
            <span className="relative inline-flex h-16 w-16 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-kcb/15 animate-ping" />
              <span className="relative inline-flex h-16 w-16 items-center justify-center rounded-full bg-kcb/12 text-kcb">
                <Smartphone className="h-8 w-8" aria-hidden="true" />
              </span>
            </span>
            <h3 className="mt-4 font-headline text-2xl font-extrabold text-on-surface">
              Check your phone
            </h3>
            <p className="mt-1 max-w-xs text-on-surface-variant">
              Enter your M-PESA PIN to pay{" "}
              <span className="font-bold text-on-surface">{formattedAmount}</span>.
              The prompt was sent to {phone}.
            </p>
            <p className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-kcb">
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
              Waiting for confirmation…
            </p>
            <Button
              type="button"
              variant="outline"
              size="md"
              className="mt-6 w-full"
              onClick={handleCancelPayment}
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Cancel payment
            </Button>
          </div>
        ) : (
          /* ---- IDLE / UNPAID ----------------------------------------- */
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Amount due
            </p>
            <p className="mt-1 font-headline text-4xl font-extrabold tracking-tight text-on-surface">
              {formattedAmount}
            </p>

            <div className="mt-6">
              <Label htmlFor="kcbPhone">M-Pesa Phone Number</Label>
              <Input
                id="kcbPhone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                onBlur={() => setPhoneTouched(true)}
                placeholder="0712 345 678"
                aria-invalid={showPhoneError}
                aria-describedby={showPhoneError ? "kcbPhoneError" : undefined}
                className="mt-2"
              />
              {showPhoneError && (
                <p
                  id="kcbPhoneError"
                  role="alert"
                  className="mt-2 text-xs font-semibold text-error"
                >
                  Enter a valid Safaricom number, e.g. 0712 345 678.
                </p>
              )}
            </div>

            {message && (
              <div
                role={status === "failed" ? "alert" : "status"}
                className={`mt-4 flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${
                  status === "failed"
                    ? "bg-error-container text-on-error-container"
                    : "bg-surface-container-low text-on-surface-variant"
                }`}
              >
                {status === "failed" ? (
                  <TriangleAlert
                    className="mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                ) : (
                  <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                )}
                <span>{message}</span>
              </div>
            )}

            <Button
              type="button"
              size="lg"
              variant="kcb"
              onClick={handlePay}
              disabled={!phoneValid}
              className="mt-5 w-full"
            >
              {status === "failed" ? (
                <>
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Try again
                </>
              ) : (
                <>Pay {formattedAmount} </>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="md"
              className="mt-3 w-full"
              onClick={handleCancelPayment}
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Cancel payment
            </Button>
          </div>
        )}

        {/* ---- Manual Paybill fallback (collapsible, always available) -- */}
        {status !== "paid" && (
          <div className="mt-5 border-t border-outline-variant/15 pt-4">
            <button
              type="button"
              onClick={() => setPaybillOpen((open) => !open)}
              aria-expanded={paybillOpen}
              aria-controls="paybillDetails"
              className="flex w-full items-center justify-between gap-2 text-sm font-bold text-on-surface transition-colors hover:text-kcb"
            >
              Pay manually with Paybill
              <ChevronDown
                className={`h-4 w-4 text-on-surface-variant transition-transform duration-200 ${
                  paybillOpen ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              />
            </button>
            {paybillOpen && (
              <div
                id="paybillDetails"
                className="mt-3 space-y-2 text-sm text-on-surface-variant animate-in fade-in slide-in-from-top-1 duration-200"
              >
                <ol className="space-y-1">
                  <li>
                    1. Go to <strong className="text-on-surface">Lipa na M-PESA → Pay Bill</strong>
                  </li>
                  <li>
                    2. Business number{" "}
                    <strong className="text-on-surface">{PAYBILL}</strong>
                  </li>
                  <li>
                    3. Account number{" "}
                    <strong className="text-on-surface">{ACCOUNT}</strong>
                  </li>
                  <li>
                    4. Amount{" "}
                    <strong className="text-on-surface">{formattedAmount}</strong>
                  </li>
                </ol>
                <p className="text-xs">
                  Manual payments are confirmed by our team after reconciliation.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
