"use client";

import Link from "next/link";
import { useWizard } from "@/lib/wizard/store";
import { estimateTrip } from "@/lib/pricing/estimate-trip";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SummaryPanel } from "@/components/results/summary-panel";
import { ContactDetailsCard } from "@/components/results/contact-details-card";
import { PricingSummary } from "@/components/results/pricing-summary";
import { useVehicles } from "@/lib/use-vehicles";

export default function ResultsPage() {
  const { state, hydrated } = useWizard();
  const { vehicles } = useVehicles();

  if (!hydrated) {
    return (
      <div className="min-h-screen pt-28 pb-16 px-6 md:px-10 max-w-6xl mx-auto">
        <div className="h-10 w-48 bg-surface-container-high rounded-lg animate-pulse" />
        <div className="h-80 w-full bg-surface-container-high rounded-2xl animate-pulse mt-8" />
      </div>
    );
  }

  if (!state.destination) {
    return (
      <div className="min-h-screen pt-28 pb-16 px-6 md:px-10 max-w-3xl mx-auto flex items-center">
        <Card className="p-10 md:p-14 w-full text-center border border-outline-variant/15">
          <span className="text-primary font-headline font-bold text-xs tracking-widest uppercase">
            Nothing to show yet
          </span>
          <h1 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tight mt-4">
            Start by telling us
            <br /> where you&apos;re going
          </h1>
          <p className="text-on-surface-variant mt-4 max-w-md mx-auto">
            We&apos;ll turn your answers into a tailored trip across East Africa in
            under two minutes.
          </p>
          <Link href="/plan-trip/destination">
            <Button size="lg" className="mt-8">
              Plan my trip
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const estimate = estimateTrip(state, vehicles);

  return (
    <div className="min-h-screen pt-28 pb-24 px-6 md:px-10 max-w-6xl mx-auto">
      <SummaryPanel state={state} />

      <section className="mt-12 md:mt-16" aria-labelledby="estimate-heading">
        <PricingSummary estimate={estimate} />
      </section>

      <section className="mt-12 md:mt-16" aria-labelledby="details-heading">
        <ContactDetailsCard />
      </section>
    </div>
  );
}
