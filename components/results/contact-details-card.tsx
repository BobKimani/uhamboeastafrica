"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserCircle, Send, CheckCircle2, AlertCircle } from "lucide-react";
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

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;

    if (!state.destination || !state.startDate || !state.endDate) {
      setStatus("error");
      setErrorMessage(
        "Trip details are missing. Please complete the planner first."
      );
      return;
    }

    const fullName = `${form.firstName} ${form.lastName}`.trim();
    const numberOfRooms =
      state.serviceType === "transport" ? 0 : Math.max(1, Math.ceil(state.paxCount / 2));

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

  return (
    <Card className="p-8 md:p-10 border border-outline-variant/15">
      <div className="flex items-center gap-3 mb-8">
        <UserCircle className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-2xl md:text-3xl font-headline font-extrabold tracking-tight">
            Your details
          </h2>
          <p className="text-on-surface-variant text-sm mt-1">
            How we can reach you back.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="contact">Phone / WhatsApp</Label>
            <Input
              id="contact"
              name="contact"
              type="tel"
              placeholder="+254 700 000 000"
              value={form.contact}
              onChange={handleChange}
              autoComplete="tel"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </div>
        </div>

        {status === "success" && (
          <div className="flex items-start gap-2 text-sm text-primary" role="status">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Booking received — our team will reach out shortly with a tailored plan.
            </span>
          </div>
        )}

        {status === "error" && errorMessage && (
          <div className="flex items-start gap-2 text-sm text-red-500" role="alert">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          disabled={status === "submitting" || status === "success"}
          className="mt-2 w-full md:w-auto md:self-end"
        >
          <Send className="h-4 w-4" />
          {status === "submitting" ? "Sending..." : "Submit booking"}
        </Button>
      </form>
    </Card>
  );
}
