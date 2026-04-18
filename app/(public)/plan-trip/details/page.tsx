"use client";

import { WizardShell } from "@/components/wizard/wizard-shell";
import { useWizard } from "@/lib/wizard/store";
import { Input, Label } from "@/components/ui/input";
import { RoomType } from "@/lib/wizard/types";
import { VEHICLES } from "@/lib/data/vehicles";
import { cn } from "@/lib/utils";

const ROOMS: RoomType[] = ["Single", "Twin", "Double", "Triple"];

export default function DetailsStep() {
  const { state, update } = useWizard();
  const showAcc =
    state.serviceType === "accommodation" || state.serviceType === "both";
  const showTrp =
    state.serviceType === "transport" || state.serviceType === "both";

  const canContinue = showAcc
    ? !!state.accommodation?.roomType
    : showTrp
    ? !!state.transport?.vehicleType && !!state.transport?.from && !!state.transport?.to
    : true;

  return (
    <WizardShell
      stepSlug="details"
      title="The finer details"
      subtitle="A few last specifics so we can tailor everything to you."
      canContinue={canContinue}
    >
      <div className="space-y-10 max-w-3xl mx-auto">
        {showAcc && (
          <section className="bg-surface-container-low rounded-2xl p-8">
            <h3 className="font-headline font-bold text-xl text-on-surface mb-6">
              Accommodation
            </h3>
            <div className="space-y-5">
              <div>
                <Label className="block mb-2">Region or City (optional)</Label>
                <Input
                  placeholder="e.g. Maasai Mara, Zanzibar, Kigali"
                  value={state.accommodation?.region ?? ""}
                  onChange={(e) =>
                    update({
                      accommodation: {
                        ...state.accommodation,
                        region: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div>
                <Label className="block mb-3">Room Type</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {ROOMS.map((r) => {
                    const selected = state.accommodation?.roomType === r;
                    return (
                      <button
                        key={r}
                        onClick={() =>
                          update({
                            accommodation: {
                              ...state.accommodation,
                              roomType: r,
                            },
                          })
                        }
                        className={cn(
                          "py-3 rounded-xl bg-surface-container-highest text-sm font-bold text-on-surface transition-all",
                          selected && "bg-primary text-white"
                        )}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        {showTrp && (
          <section className="bg-surface-container-low rounded-2xl p-8">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {VEHICLES.map((v) => {
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
                          "text-left p-4 rounded-xl bg-surface-container-highest transition-all",
                          selected && "bg-primary/10 ring-2 ring-primary"
                        )}
                      >
                        <div className="font-headline font-bold text-on-surface">
                          {v.name}
                        </div>
                        <div className="text-xs text-secondary mt-1">
                          {v.capacity} seats • {v.bestFor}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        {!showAcc && !showTrp && (
          <div className="text-center text-secondary">
            Nothing to tailor here — press Continue.
          </div>
        )}
      </div>
    </WizardShell>
  );
}
