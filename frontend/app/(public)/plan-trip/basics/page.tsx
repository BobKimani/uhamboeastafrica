"use client";

import { useEffect } from "react";
import { CalendarDays, Minus, Plus, User, Users, UsersRound, User2 } from "lucide-react";
import { WizardShell } from "@/components/wizard/wizard-shell";
import { useWizard } from "@/lib/wizard/store";
import { GroupType } from "@/lib/wizard/types";
import { Input, Label } from "@/components/ui/input";
import { cn, nightsBetween } from "@/lib/utils";

const GROUPS: { value: GroupType; icon: typeof User; description: string }[] = [
  { value: "Solo", icon: User, description: "Just me" },
  { value: "Couple", icon: Users, description: "Two of us" },
  { value: "Family", icon: UsersRound, description: "Family trip" },
  { value: "Group", icon: User2, description: "Friends & group" },
];

const MAX_PAX = 50;

export default function BasicsStep() {
  const { state, update } = useWizard();
  const today = new Date().toISOString().split("T")[0];
  const nights = nightsBetween(state.startDate, state.endDate);

  useEffect(() => {
    if (state.group === "Solo" && state.paxCount !== 1) {
      update({ paxCount: 1 });
      return;
    }

    if (state.group === "Couple" && state.paxCount !== 2) {
      update({ paxCount: 2 });
    }
  }, [state.group, state.paxCount, update]);

  const isFixedPax = state.group === "Solo" || state.group === "Couple";
  const datesValid = !!(
    state.startDate &&
    state.endDate &&
    state.startDate < state.endDate
  );
  const canContinue = datesValid && !!state.group && state.paxCount > 0;

  const stepPax = (delta: number) =>
    update({
      paxCount: Math.min(MAX_PAX, Math.max(1, state.paxCount + delta)),
    });

  return (
    <WizardShell
      stepSlug="basics"
      title={
        <>
          When, and who&apos;s
          <br /> coming along?
        </>
      }
      subtitle="Pick your travel window and your crew. We'll right-size every lodge, vehicle and guide around it."
      canContinue={canContinue}
    >
      <div className="space-y-8 max-w-3xl mx-auto">
        <section className="bg-surface-container-low rounded-2xl p-8 md:p-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 sunset-gradient rounded-full flex items-center justify-center text-white">
              <CalendarDays className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="font-headline font-bold text-xl text-on-surface">
              Travel Window
            </h3>
          </div>
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
            <div className="mt-6 text-center">
              <span className="inline-block bg-primary/10 text-primary font-headline font-bold px-5 py-2 rounded-full text-sm">
                {nights} night{nights === 1 ? "" : "s"} in East Africa
              </span>
            </div>
          )}
        </section>

        <section className="bg-surface-container-low rounded-2xl p-8 md:p-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 sunset-gradient rounded-full flex items-center justify-center text-white">
              <UsersRound className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="font-headline font-bold text-xl text-on-surface">
              Travel Group
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {GROUPS.map(({ value, icon: Icon, description }) => {
              const selected = state.group === value;
              return (
                <button
                  key={value}
                  onClick={() => update({ group: value })}
                  className={cn(
                    "p-5 rounded-2xl bg-surface-container-highest text-left transition-all hover:-translate-y-1",
                    selected &&
                      "bg-primary/10 ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}
                >
                  <Icon className="h-6 w-6 text-primary mb-3" />
                  <div className="font-headline font-bold text-on-surface">
                    {value}
                  </div>
                  <div className="text-xs text-secondary mt-1">{description}</div>
                </button>
              );
            })}
          </div>
          <div className="max-w-xs mx-auto">
            <Label className="block mb-3 text-center">Number of Travelers</Label>
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => stepPax(-1)}
                disabled={isFixedPax || state.paxCount <= 1}
                aria-label="Fewer travelers"
                className="w-12 h-12 rounded-full bg-surface-container-highest text-on-surface flex items-center justify-center transition-all hover:bg-primary/10 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
              >
                <Minus className="h-5 w-5" aria-hidden="true" />
              </button>
              <span className="w-16 text-center font-headline font-extrabold text-3xl text-on-surface tabular-nums">
                {state.paxCount}
              </span>
              <button
                type="button"
                onClick={() => stepPax(1)}
                disabled={isFixedPax || state.paxCount >= MAX_PAX}
                aria-label="More travelers"
                className="w-12 h-12 rounded-full bg-surface-container-highest text-on-surface flex items-center justify-center transition-all hover:bg-primary/10 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
              >
                <Plus className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            {isFixedPax && (
              <p className="mt-3 text-center text-xs text-on-surface-variant">
                {state.group === "Solo"
                  ? "Solo trips always use 1 traveler."
                  : "Couple trips always use 2 travelers."}
              </p>
            )}
          </div>
        </section>
      </div>
    </WizardShell>
  );
}
