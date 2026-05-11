"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserCircle, Send, CheckCircle2, AlertCircle, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useWizard } from "@/lib/wizard/store";
import { submitBooking } from "@/lib/api/bookings";
import type { CreateBookingInput, TravellingWith } from "@/types/booking";

const INITIAL_CONTACT = {
  firstName: "",
  lastName: "",
  contact: "",
  email: "",
};

type Status = "idle" | "submitting" | "success" | "error";

function toTravellingWith(group: string | undefined): TravellingWith {
  switch (group) {
    case "Couple":
      return "couple";
    case "Family":
      return "family";
    case "Group":
      return "group";
    default:
      return "solo";
  }
}

export function ContactDetailsCard() {
  const router = useRouter();
  const { state, reset } = useWizard();
  const [form, setForm] = useState(INITIAL_CONTACT);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const busy = status === "submitting";
  const done = status === "success";

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;

    if (!state.destination || !state.startDate || !state.endDate) {
      setStatus("error");
      setErrorMessage(
        "Trip details are missing. Please complete the planner first."
      );
      return;
    }

    const fullName = `${form.firstName} ${form.lastName}`.trim();
    const numberOfRooms =
      state.serviceType === "transport"
        ? 0
        : Math.max(1, Math.ceil(state.paxCount / 2));

    const payload: CreateBookingInput = {
      fullName,
      email: form.email.trim(),
      phone: form.contact.trim(),
      destination: state.destination,
      travelStartDate: state.startDate,
      travelEndDate: state.endDate,
      travellingWith: toTravellingWith(state.group),
      bookingType: state.serviceType ?? "both",
      numberOfTravellers: state.paxCount,
      numberOfRooms,
      minimumBudget: state.budget.min,
      maximumBudget: state.budget.max,
    };

    setStatus("submitting");
    setErrorMessage(null);

    try {
      await submitBooking(payload);
      setStatus("success");
      setForm(INITIAL_CONTACT);
      reset();
      setTimeout(() => router.push("/"), 2000);
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to submit booking."
      );
    }
  }

  function handleCancel() {
    if (busy || done) return;
    const confirmed = window.confirm(
      "Cancel this booking? Your trip details will be cleared."
    );
    if (!confirmed) return;
    reset();
    router.push("/");
  }

  return (
    <Card className="p-8 md:p-10 border border-outline-variant/15">
      <header className="flex items-start gap-3 mb-8">
        <span
          aria-hidden
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0"
        >
          <UserCircle className="h-5 w-5" />
        </span>
        <div>
          <span className="text-primary font-headline font-bold text-xs tracking-widest uppercase">
            Step 3
          </span>
          <h2
            id="details-heading"
            className="text-2xl md:text-3xl font-headline font-extrabold tracking-tight text-on-background mt-1"
          >
            Your details
          </h2>
          <p className="text-on-surface-variant text-sm mt-1.5 max-w-md">
            How we can reach you. We&apos;ll confirm your itinerary within 24
            hours.
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              name="firstName"
              placeholder="e.g. Amara"
              value={form.firstName}
              onChange={handleChange}
              autoComplete="given-name"
              disabled={busy || done}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              name="lastName"
              placeholder="e.g. Osei"
              value={form.lastName}
              onChange={handleChange}
              autoComplete="family-name"
              disabled={busy || done}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="contact">Phone / WhatsApp</Label>
            <Input
              id="contact"
              name="contact"
              type="tel"
              inputMode="tel"
              placeholder="+254 700 000 000"
              value={form.contact}
              onChange={handleChange}
              autoComplete="tel"
              disabled={busy || done}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              disabled={busy || done}
              required
            />
          </div>
        </div>

        {done && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary"
          >
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Booking received — our team will reach out shortly with a
              tailored plan. Redirecting you home…
            </span>
          </div>
        )}

        {status === "error" && errorMessage && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-500"
          >
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-6 border-t border-outline-variant/15">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={handleCancel}
            disabled={busy || done}
            aria-label="Cancel booking and clear trip"
          >
            <X className="h-4 w-4" />
            Cancel booking
          </Button>

          <Button
            type="submit"
            size="lg"
            disabled={busy || done}
            className="w-full sm:w-auto"
          >
            <Send className="h-4 w-4" />
            {busy ? "Submitting..." : done ? "Submitted" : "Submit booking"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
