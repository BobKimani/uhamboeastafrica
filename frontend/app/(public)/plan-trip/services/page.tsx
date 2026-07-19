"use client";

import { useEffect, useMemo } from "react";
import Image from "next/image";
import { Hotel, Bus, Layers, Minus, Plus, Users } from "lucide-react";
import { WizardShell } from "@/components/wizard/wizard-shell";
import { useWizard } from "@/lib/wizard/store";
import { RoomType, ServiceType, totalRooms } from "@/lib/wizard/types";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useVehicles } from "@/lib/use-vehicles";
import { TransportMap } from "@/components/transport/transport-map";

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

const ROOMS: { type: RoomType; description: string }[] = [
  { type: "Single", description: "1 guest • one bed" },
  { type: "Twin", description: "2 guests • two beds" },
  { type: "Double", description: "2 guests • one bed" },
  { type: "Triple", description: "3 guests • extra bed" },
];

const MAX_ROOMS_PER_TYPE = 10;

export default function ServicesStep() {
  const { state, update } = useWizard();
  const { vehicles } = useVehicles();
  const showAcc =
    state.serviceType === "accommodation" || state.serviceType === "both";
  const showTrp =
    state.serviceType === "transport" || state.serviceType === "both";

  const availableVehicles = useMemo(
    () => vehicles.filter((vehicle) => vehicle.isAvailable),
    [vehicles]
  );

  const selectedVehicleIsAvailable = availableVehicles.some(
    (vehicle) => vehicle.type === state.transport?.vehicleType
  );

  useEffect(() => {
    if (!showTrp) return;
    if (!state.transport?.vehicleType) return;
    if (selectedVehicleIsAvailable) return;

    update({
      transport: {
        ...state.transport,
        vehicleType: undefined,
      },
    });
  }, [showTrp, selectedVehicleIsAvailable, state.transport, update]);

  const accReady = !showAcc || totalRooms(state.accommodation?.rooms) > 0;

  const setRoomCount = (type: RoomType, count: number) =>
    update({
      accommodation: {
        ...state.accommodation,
        rooms: {
          ...state.accommodation?.rooms,
          [type]: Math.min(MAX_ROOMS_PER_TYPE, Math.max(0, count)),
        },
      },
    });
  const trpReady =
    !showTrp ||
    (selectedVehicleIsAvailable &&
      !!state.transport?.from &&
      !!state.transport?.to);
  const canContinue = !!state.serviceType && accReady && trpReady;

  return (
    <WizardShell
      stepSlug="services"
      title="What should we handle?"
      subtitle="Pick what you need from us, then tailor the specifics right here."
      canContinue={canContinue}
    >
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {OPTIONS.map(({ value, icon: Icon, title, description }) => {
            const selected = state.serviceType === value;
            return (
              <button
                key={value}
                onClick={() => update({ serviceType: value })}
                className={cn(
                  "group p-6 rounded-2xl bg-surface-container-low text-left transition-all hover:-translate-y-1",
                  selected &&
                    "bg-primary/10 ring-2 ring-primary ring-offset-2 ring-offset-background"
                )}
              >
                <div className="w-12 h-12 sunset-gradient rounded-full flex items-center justify-center text-white mb-4">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-headline text-lg font-bold text-on-surface mb-2">
                  {title}
                </h3>
                <p className="text-secondary text-sm leading-relaxed">
                  {description}
                </p>
              </button>
            );
          })}
        </div>

        {!state.serviceType && (
          <p className="text-center text-sm text-on-surface-variant">
            Choose a service above to tailor the details.
          </p>
        )}

        {showAcc && (
          <section className="bg-surface-container-low rounded-2xl p-8 max-w-3xl mx-auto w-full">
            <h3 className="font-headline font-bold text-xl text-on-surface mb-6">
              Accommodation
            </h3>
            <div className="space-y-5">
              <div>
                <Label className="block mb-2">Region or City (optional)</Label>
                <Input
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
                <Label className="block mb-3">Rooms</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ROOMS.map(({ type, description }) => {
                    const count = state.accommodation?.rooms?.[type] ?? 0;
                    return (
                      <div
                        key={type}
                        className={cn(
                          "flex items-center justify-between gap-3 p-4 rounded-xl bg-surface-container-highest transition-all",
                          count > 0 && "ring-2 ring-primary bg-primary/5"
                        )}
                      >
                        <div>
                          <div className="font-headline font-bold text-sm text-on-surface">
                            {type}
                          </div>
                          <div className="text-xs text-secondary mt-0.5">
                            {description}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setRoomCount(type, count - 1)}
                            disabled={count <= 0}
                            aria-label={`Fewer ${type} rooms`}
                            className="w-9 h-9 rounded-full bg-surface-container-low text-on-surface flex items-center justify-center transition-all hover:bg-primary/10 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                          >
                            <Minus className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <span className="w-6 text-center font-headline font-extrabold text-lg text-on-surface tabular-nums">
                            {count}
                          </span>
                          <button
                            type="button"
                            onClick={() => setRoomCount(type, count + 1)}
                            disabled={count >= MAX_ROOMS_PER_TYPE}
                            aria-label={`More ${type} rooms`}
                            className="w-9 h-9 rounded-full bg-surface-container-low text-on-surface flex items-center justify-center transition-all hover:bg-primary/10 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                          >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-on-surface-variant mt-3">
                  Mix and match room types — add at least one room to continue.
                </p>
              </div>
            </div>
          </section>
        )}

        {showTrp && (
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
                            src={v.image}
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
