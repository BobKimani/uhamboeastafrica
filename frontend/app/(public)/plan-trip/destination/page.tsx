"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { COUNTRIES } from "@/lib/data/countries";
import { WizardShell } from "@/components/wizard/wizard-shell";
import { useWizard } from "@/lib/wizard/store";
import { cn } from "@/lib/utils";

export default function DestinationStep() {
  const { state, update } = useWizard();
  const router = useRouter();

  function handleCountryClick(slug: string) {
    if (state.destination === slug) {
      router.push("/plan-trip/dates");
      return;
    }

    update({ destination: slug });
  }

  return (
    <WizardShell
      stepSlug="destination"
      title={
        <>
          Do you know where
          <br /> you want to go?
        </>
      }
      subtitle="Select a territory to begin your curated East African odyssey. Each path offers a unique rhythm of the savanna."
      canContinue={!!state.destination}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {COUNTRIES.map((c) => {
          const selected = state.destination === c.slug;
          return (
            <button
              key={c.slug}
              type="button"
              onClick={() => handleCountryClick(c.slug)}
              aria-label={
                selected
                  ? `Continue with ${c.name}`
                  : `Select ${c.name}`
              }
              className={cn(
                "group relative aspect-[3/4] overflow-hidden rounded-2xl bg-surface-container-low transition-all duration-500 hover:scale-[1.02] active:scale-95 text-left",
                selected && "ring-4 ring-primary ring-offset-4 ring-offset-background"
              )}
            >
              <Image
                src={c.image}
                alt={c.name}
                fill
                sizes="(max-width: 768px) 100vw, 25vw"
                className="object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 p-6 w-full">
                <span className="text-primary-fixed font-headline font-bold text-[10px] tracking-widest uppercase mb-2 block">
                  Region
                </span>
                <h3 className="text-white text-2xl md:text-3xl font-headline font-extrabold tracking-tight">
                  {c.name}
                </h3>
                <p className="text-white/80 text-xs mt-1">{c.tagline}</p>
              </div>
              {selected && (
                <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white">
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </WizardShell>
  );
}
