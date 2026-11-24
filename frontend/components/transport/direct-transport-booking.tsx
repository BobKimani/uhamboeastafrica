"use client";

import { useCallback, useState } from "react";
import { AlertCircle, CheckCircle2, Send } from "lucide-react";
import { KcbPayment } from "@/components/payments/kcb-payment";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import {
  BookingPriceChangedError,
  BookingRouteUnavailableError,
  submitBooking,
} from "@/lib/api/bookings";
import { TRIP_TYPE_LABELS, type TransportQuote, type TripType } from "@/lib/api/transport";
import { formatFromKes } from "@/lib/currency";
import type { Vehicle } from "@/lib/data/vehicles";
import type { CreateBookingInput, TravellingWith } from "@/types/booking";

/** A listed route priced by the backend, or an unlisted route sent for a quote. */
export type TransportBookingRoute =
  | { mode: "priced"; quote: TransportQuote }
  | { mode: "quote"; fromText: string; toText: string; tripType: TripType };

type DirectTransportBookingProps = {
  vehicle: Vehicle;
  route: TransportBookingRoute;
  people: number;
  onClose?: () => void;
};

type BookingPayment = {
  bookingId: string;
  amountKes: number;
  phone: string;
};

function travellingWith(people: number): TravellingWith {
  if (people === 1) return "solo";
  if (people === 2) return "couple";
  return "group";
}

const formatKes = (amount: number) => formatFromKes(amount, "KES");

export function DirectTransportBooking({
  vehicle,
  route,
  people,
  onClose,
}: DirectTransportBookingProps) {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    pickupDate: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<BookingPayment | null>(null);
  const [paymentComplete, setPaymentComplete] = useState(false);
  // Latest server quote; replaced if the price changed before booking.
  const [quote, setQuote] = useState<TransportQuote | null>(
    route.mode === "priced" ? route.quote : null
  );
  const [priceNotice, setPriceNotice] = useState<string | null>(null);
  const [requestSent, setRequestSent] = useState(false);

  // No server quote (unlisted route, or the route stopped being bookable
  // online) means the booking is sent as a quote request without payment.
  const isQuoteRequest = quote === null;
  const tripType = route.mode === "priced" ? route.quote.tripType : route.tripType;
  const from = route.mode === "priced" ? route.quote.fromPlace : route.fromText;
  const to = route.mode === "priced" ? route.quote.toPlace : route.toText;
  const today = new Date().toLocaleDateString("en-CA");

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || payment) return;

    if (!form.pickupDate) {
      setError("Choose a pickup date.");
      return;
    }

    const payload: CreateBookingInput = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      destination: to.trim(),
      // Single-day trip: a drop-off, or a return with the driver waiting.
      travelStartDate: form.pickupDate,
      travelEndDate: form.pickupDate,
      travellingWith: travellingWith(people),
      bookingType: "transport",
      numberOfTravellers: people,
      numberOfRooms: 0,
      tripType,
      vehicleType: vehicle.type,
      ...(quote
        ? {
            transportFromId: quote.fromPlaceId,
            transportToId: quote.toPlaceId,
            vehicleId: quote.vehicleId,
            quotedTotalKes: quote.totalKes,
          }
        : { quoteRequested: true, transportFrom: from.trim(), transportTo: to.trim() }),
    };

    setSubmitting(true);
    setError(null);
    setPriceNotice(null);
    try {
      const result = await submitBooking(payload);
      if (isQuoteRequest) {
        setRequestSent(true);
        return;
      }
      if (!result.payment.required || !result.payment.amountKes) {
        throw new Error("Transport payment details were not returned.");
      }
      setPayment({
        bookingId: result.id,
        amountKes: result.payment.amountKes,
        phone: payload.phone,
      });
    } catch (reason) {
      if (reason instanceof BookingPriceChangedError) {
        // Never charge an amount the customer has not seen: show the new
        // price and let them confirm by submitting again.
        setQuote(reason.quote);
        setPriceNotice(
          `The price for this trip has changed to ${formatKes(reason.quote.totalKes)}. Please review and confirm.`
        );
        return;
      }
      if (reason instanceof BookingRouteUnavailableError) {
        // Keep the customer's details and offer a quote request instead.
        setQuote(null);
        setPriceNotice(
          "This route can no longer be booked online. Submit again to send it as a quote request — our team will contact you. No payment is taken now."
        );
        return;
      }
      setError(
        reason instanceof Error ? reason.message : "Failed to submit booking."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const handlePaid = useCallback(() => setPaymentComplete(true), []);

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 rounded-xl bg-surface-container-low p-4 text-sm">
        <div>
          <p className="text-xs text-on-surface-variant">Route</p>
          <p className="font-bold mt-1">{from} → {to}</p>
        </div>
        <div>
          <p className="text-xs text-on-surface-variant">Vehicle</p>
          <p className="font-bold mt-1">{vehicle.name}</p>
        </div>
        <div>
          <p className="text-xs text-on-surface-variant">Trip</p>
          <p className="font-bold mt-1">{TRIP_TYPE_LABELS[tripType]}</p>
        </div>
        <div>
          <p className="text-xs text-on-surface-variant">Passengers</p>
          <p className="font-bold mt-1">{people}</p>
        </div>
        {quote ? (
          <>
            <div>
              <p className="text-xs text-on-surface-variant">Fuel ({quote.distanceKm} km)</p>
              <p className="font-bold mt-1">{formatKes(quote.fuelKes)}</p>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant">Driver&apos;s allowance</p>
              <p className="font-bold mt-1">{formatKes(quote.driverAllowanceKes)}</p>
            </div>
            <div className="col-span-2 border-t border-outline-variant/20 pt-3">
              <p className="text-xs text-on-surface-variant">Transport total</p>
              <p className="font-bold mt-1 text-base">{formatKes(quote.totalKes)}</p>
            </div>
          </>
        ) : (
          <div className="col-span-2 border-t border-outline-variant/20 pt-3">
            <p className="text-xs text-on-surface-variant">Price</p>
            <p className="font-bold mt-1">
              On request — our team will price this route and contact you. No payment now.
            </p>
          </div>
        )}
      </div>

      {priceNotice && (
        <div role="status" className="mt-4 flex items-start gap-2 rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{priceNotice}</span>
        </div>
      )}

      {requestSent ? (
        <div className="mt-6 flex items-start gap-2 rounded-xl bg-surface-container-low px-4 py-4 text-sm">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-kcb" aria-hidden="true" />
          <span>
            Quote request sent. Our team will contact you with a price for {from} → {to}.
          </span>
        </div>
      ) : !payment ? (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-6">
          <div className="sm:col-span-2">
            <Label htmlFor="directFullName">Full name</Label>
            <Input
              id="directFullName"
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              autoComplete="name"
              required
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="directEmail">Email</Label>
            <Input
              id="directEmail"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              required
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="directPhone">Phone / WhatsApp</Label>
            <Input
              id="directPhone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              autoComplete="tel"
              required
              className="mt-2"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="directPickupDate">Pickup date</Label>
            <Input
              id="directPickupDate"
              name="pickupDate"
              type="date"
              min={today}
              value={form.pickupDate}
              onChange={handleChange}
              required
              className="mt-2"
            />
          </div>

          {error && (
            <div role="alert" className="sm:col-span-2 flex items-start gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-500">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" size="lg" disabled={submitting} className="sm:col-span-2 w-full">
            <Send className="h-4 w-4" />
            {submitting
              ? "Sending..."
              : isQuoteRequest
                ? "Request quote"
                : priceNotice
                  ? "Confirm new price"
                  : "Book transport"}
          </Button>
        </form>
      ) : (
        <div className="mt-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-kcb">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {paymentComplete
                ? "Booking and payment confirmed"
                : "Booking confirmed — one step left: payment"}
            </span>
          </div>
          <KcbPayment
            bookingId={payment.bookingId}
            initialPhone={payment.phone}
            amountKes={payment.amountKes}
            onPaid={handlePaid}
            onClose={onClose}
          />
        </div>
      )}
    </div>
  );
}
