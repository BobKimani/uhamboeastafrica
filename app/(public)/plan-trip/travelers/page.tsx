"use client";

import { User, Users, UsersRound, User2 } from "lucide-react";
import { WizardShell } from "@/components/wizard/wizard-shell";
import { useWizard } from "@/lib/wizard/store";
import { GroupType } from "@/lib/wizard/types";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const GROUPS: { value: GroupType; icon: typeof User; description: string }[] = [
  { value: "Solo", icon: User, description: "Just me" },
  { value: "Couple", icon: Users, description: "Two of us" },
  { value: "Family", icon: UsersRound, description: "Family trip" },
  { value: "Group", icon: User2, description: "Friends & group" },
];

export default function TravelersStep() {
  const { state, update } = useWizard();
  const canContinue = !!state.group && state.paxCount > 0;
  return (
    <WizardShell
      stepSlug="travelers"
      title={
        <>
          Who's sharing the
          <br /> horizon with you?
        </>
      }
      subtitle="Tell us how many and we'll right-size the vehicles, rooms and guides."
      canContinue={canContinue}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {GROUPS.map(({ value, icon: Icon, description }) => {
          const selected = state.group === value;
          return (
            <button
              key={value}
              onClick={() => update({ group: value })}
              className={cn(
                "p-6 rounded-2xl bg-surface-container-low text-left transition-all hover:-translate-y-1",
                selected &&
                  "bg-primary/10 ring-2 ring-primary ring-offset-2 ring-offset-background"
              )}
            >
              <Icon className="h-7 w-7 text-primary mb-4" />
              <div className="font-headline font-bold text-lg text-on-surface">
                {value}
              </div>
              <div className="text-xs text-secondary mt-1">{description}</div>
            </button>
          );
        })}
      </div>
      <div className="max-w-sm mx-auto">
        <Label htmlFor="pax" className="block mb-2 text-center">
          Number of Travelers
        </Label>
        <Input
          id="pax"
          type="number"
          min={1}
          max={50}
          value={state.paxCount}
          onChange={(e) =>
            update({ paxCount: Math.max(1, Number(e.target.value) || 1) })
          }
          className="text-center font-headline font-bold text-xl"
        />
      </div>
    </WizardShell>
  );
}
