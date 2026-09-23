"use client";

import { useEffect, useMemo } from "react";
import Image from "next/image";
import { Users } from "lucide-react";
import { WizardShell } from "@/components/wizard/wizard-shell";
import { NeedToggle } from "@/components/wizard/need-toggle";
import { Input, Label } from "@/components/ui/input";
import { TransportMap } from "@/components/transport/transport-map";
import { useWizard } from "@/lib/wizard/store";
import { useVehicles } from "@/lib/use-vehicles";
import { mediaUrl } from "@/lib/media";
import { serviceTypeFor, skipsAccommodation, skipsTransport } from "@/lib/wizard/types";
import { cn } from "@/lib/utils";

export default function TransportStep() {
  const { state, update } = useWizard();
  const { vehicles } = useVehicles();
  const accSkipped = skipsAccommodation(state);
  const skipped = skipsTransport(state) && !accSkipped;

  const availableVehicles = useMemo(
    () => vehicles.filter((vehicle) => vehicle.isAvailable),
    [vehicles]
  );

  const selectedVehicleIsAvailable = availableVehicles.some(
    (vehicle) => vehicle.type === state.transport?.vehicleType
  );

  useEffect(() => {
    if (skipped) return;
    if (!state.transport?.vehicleType) return;
    if (vehicles.length === 0 || selectedVehicleIsAvailable) return;
    update({ transport: { ...state.transport, vehicleType: undefined } });
  }, [skipped, vehicles.length, selectedVehicleIsAvailable, state.transport, update]);

  const trpReady =
    selectedVehicleIsAvailable &&
    !!state.transport?.from &&
    !!state.transport?.to;
  const canContinue = skipped || trpReady;

  const setNeeded = (needed: boolean) =>
    update({
      skipTransport: !needed,
      serviceType: serviceTypeFor(accSkipped, !needed),
    });

  return (
    <WizardShell
      stepSlug="transport"
      title="How will you get around?"
      subtitle="Choose your route and a private vehicle with a driver-guide."
      canContinue={canContinue}
    >
      <div className="space-y-8">
        <NeedToggle
          needed={!skipped}
          onChange={setNeeded}
          needLabel="I need transport"
          skipLabel="Skip, no transport needed"
          skipDisabled={accSkipped}
          skipDisabledHint="You skipped accommodation, so we need transport to plan your trip."
        />

        {skipped ? (
          <p className="text-center text-sm text-on-surface-variant">
            No problem — continue to review your trip.
          </p>
        ) : (
      <section className="bg-surface-container-low rounded-2xl p-8 max-w-3xl mx-auto w-full">
        <h3 className="font-headline font-bold text-xl text-on-surface mb-6">
          Transport
        </h3>
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="block mb-2">From</Label>
              <Input
                placeholder="e.g. Nairobi"
                value={state.transport?.from ?? ""}
                onChange={(e) =>
                  update({
                    transport: { ...state.transport, from: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <Label className="block mb-2">To</Label>
              <Input
                placeholder="e.g. Maasai Mara"
                value={state.transport?.to ?? ""}
                onChange={(e) =>
                  update({
                    transport: { ...state.transport, to: e.target.value },
                  })
                }
              />
            </div>
          </div>

          <TransportMap
            from={state.transport?.from ?? ""}
            to={state.transport?.to ?? ""}
          />

          <div>
            <Label className="block mb-2">Number of Days</Label>
            <Input
              type="number"
              min={1}
              value={state.transport?.days ?? 3}
              onChange={(e) =>
                update({
                  transport: {
                    ...state.transport,
                    days: Math.max(1, Number(e.target.value) || 1),
                  },
                })
              }
            />
          </div>
          <div>
            <Label className="block mb-3">Vehicle</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableVehicles.map((v) => {
                const selected = state.transport?.vehicleType === v.type;
                return (
                  <button
                    key={v.id}
                    onClick={() =>
                      update({
                        transport: {
                          ...state.transport,
                          vehicleType: v.type,
                        },
                      })
                    }
                    className={cn(
                      "group text-left rounded-xl bg-surface-container-highest overflow-hidden transition-all",
                      selected && "ring-2 ring-primary"
                    )}
                  >
                    <div className="relative aspect-16/9 overflow-hidden">
                      <Image
                        src={mediaUrl(v.image)}
                        alt={v.name}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-black/60 text-white px-2.5 py-1">
                        <Users className="h-3 w-3" aria-hidden="true" />
                        <span className="text-[11px] font-bold">
                          {v.capacity}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="font-headline font-bold text-on-surface">
                        {v.name}
                      </div>
                      <div className="text-xs text-secondary mt-1">
                        Best for: {v.bestFor}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {availableVehicles.length === 0 && (
              <p className="text-xs text-on-surface-variant mt-2">
                No vehicles are currently available. Please check back soon.
              </p>
            )}
          </div>
        </div>
      </section>
        )}
      </div>
    </WizardShell>
  );
}
