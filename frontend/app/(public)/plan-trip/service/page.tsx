"use client";

import { Hotel, Bus, Layers } from "lucide-react";
import { WizardShell } from "@/components/wizard/wizard-shell";
import { useWizard } from "@/lib/wizard/store";
import { ServiceType } from "@/lib/wizard/types";
import { cn } from "@/lib/utils";

const OPTIONS: {
  value: ServiceType;
  icon: typeof Hotel;
  title: string;
  description: string;
}[] = [
  {
    value: "accommodation",
    icon: Hotel,
    title: "Accommodation Only",
    description: "Curated lodges, camps and hotels — we handle the stay.",
  },
  {
    value: "transport",
    icon: Bus,
    title: "Transport Only",
    description: "Private vehicles and driver-guides across East Africa.",
  },
  {
    value: "both",
    icon: Layers,
    title: "Both",
    description: "The full orchestrated experience, stay plus transport.",
  },
];

export default function ServiceStep() {
  const { state, update } = useWizard();
  return (
    <WizardShell
      stepSlug="service"
      title="What should we handle?"
      subtitle="Pick what you need from us. You can always add more later."
      canContinue={!!state.serviceType}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {OPTIONS.map(({ value, icon: Icon, title, description }) => {
          const selected = state.serviceType === value;
          return (
            <button
              key={value}
              onClick={() => update({ serviceType: value })}
              className={cn(
                "group p-8 rounded-2xl bg-surface-container-low text-left transition-all hover:-translate-y-1",
                selected &&
                  "bg-primary/10 ring-2 ring-primary ring-offset-2 ring-offset-background"
              )}
            >
              <div className="w-14 h-14 sunset-gradient rounded-full flex items-center justify-center text-white mb-6">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="font-headline text-xl font-bold text-on-surface mb-3">
                {title}
              </h3>
              <p className="text-secondary text-sm leading-relaxed">
                {description}
              </p>
            </button>
          );
        })}
      </div>
    </WizardShell>
  );
}
