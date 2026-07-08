"use client";

import { WizardShell } from "@/components/wizard/wizard-shell";
import { useWizard } from "@/lib/wizard/store";
import { Input, Label } from "@/components/ui/input";
import { nightsBetween } from "@/lib/utils";

export default function DatesStep() {
  const { state, update } = useWizard();
  const today = new Date().toISOString().split("T")[0];
  const nights = nightsBetween(state.startDate, state.endDate);
  const canContinue = !!(
    state.startDate &&
    state.endDate &&
    state.startDate < state.endDate
  );
  return (
    <WizardShell
      stepSlug="dates"
      title={
        <>
          When does the journey
          <br /> begin?
        </>
      }
      subtitle="Pick your travel window. We'll align every lodge, vehicle and guide around it."
      canContinue={canContinue}
    >
      <div className="max-w-2xl mx-auto bg-surface-container-low rounded-2xl p-8 md:p-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="start">Start Date</Label>
            <Input
              id="start"
              type="date"
              min={today}
              value={state.startDate ?? ""}
              onChange={(e) => update({ startDate: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end">End Date</Label>
            <Input
              id="end"
              type="date"
              min={state.startDate || today}
              value={state.endDate ?? ""}
              onChange={(e) => update({ endDate: e.target.value })}
            />
          </div>
        </div>
        {nights > 0 && (
          <div className="mt-8 text-center">
            <span className="inline-block bg-primary/10 text-primary font-headline font-bold px-5 py-2 rounded-full text-sm">
              {nights} night{nights === 1 ? "" : "s"} in East Africa
            </span>
          </div>
        )}
      </div>
    </WizardShell>
  );
}
