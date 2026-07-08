"use client";

import { useCallback, useState } from "react";
import { AlertCircle, CheckCircle2, Send } from "lucide-react";
import { MpesaPayment } from "@/components/payments/mpesa-payment";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { submitBooking } from "@/lib/api/bookings";
import { formatTravelPrice } from "@/lib/currency";
import type { Vehicle } from "@/lib/data/vehicles";
import type { CreateBookingInput, TravellingWith } from "@/types/booking";

type DirectTransportBookingProps = {
  vehicle: Vehicle;
  from: string;
  to: string;
  days: number;
  people: number;
  onClose?: () => void;
};

type BookingPayment = {
  bookingId: string;
  amountKes: number;
  phone: string;
};

function endDateFrom(startDate: string, days: number) {
  const [year, month, day] = startDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + Math.max(days - 1, 0));
  return date.toISOString().slice(0, 10);
}

function travellingWith(people: number): TravellingWith {
  if (people === 1) return "solo";
  if (people === 2) return "couple";
  return "group";
}

export function DirectTransportBooking({
  vehicle,
  from,
  to,
  days,
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

  const transportPriceUsd = vehicle.pricePerDay * days;
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
      travelStartDate: form.pickupDate,
      travelEndDate: endDateFrom(form.pickupDate, days),
      travellingWith: travellingWith(people),
      bookingType: "transport",
      numberOfTravellers: people,
      numberOfRooms: 0,
      minimumBudget: transportPriceUsd,
      maximumBudget: transportPriceUsd,
      transportFrom: from.trim(),
      transportTo: to.trim(),
      transportDays: days,
      vehicleType: vehicle.type,
    };

    setSubmitting(true);
    setError(null);
    try {
      const result = await submitBooking(payload);
      if (!result.payment.required || !result.payment.amountKes) {
        throw new Error("Transport payment details were not returned.");
      }
      setPayment({
        bookingId: result.id,
        amountKes: result.payment.amountKes,
        phone: payload.phone,
      });
    } catch (reason) {
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
          <p className="text-xs text-on-surface-variant">Passengers</p>
          <p className="font-bold mt-1">{people}</p>
        </div>
        <div>
          <p className="text-xs text-on-surface-variant">Transport total</p>
          <p className="font-bold mt-1">
            {formatTravelPrice(transportPriceUsd, "KES")}
          </p>
        </div>
      </div>

      {!payment ? (
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
            {submitting ? "Booking..." : "Book transport"}
          </Button>
        </form>
      ) : (
        <div className="mt-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-mpesa">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {paymentComplete
                ? "Booking and payment confirmed"
                : "Booking confirmed — one step left: payment"}
            </span>
          </div>
          <MpesaPayment
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
