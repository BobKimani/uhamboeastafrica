"use client";

import Image from "next/image";
import { WizardShell } from "@/components/wizard/wizard-shell";
import { useWizard } from "@/lib/wizard/store";
import { Currency, formatRooms, totalRooms } from "@/lib/wizard/types";
import { COUNTRIES } from "@/lib/data/countries";
import { IMG } from "@/lib/images";
import { cn, formatDateRange } from "@/lib/utils";
import { formatTravelPrice, USD_TO_KES } from "@/lib/currency";

const CURRENCIES: { code: Currency; label: string }[] = [
  { code: "KES", label: "KSh" },
  { code: "USD", label: "USD ($)" },
];

// KSh 200,000 and KSh 1,500,000 expressed in USD (internal unit), floored to step
const MIN_CAP = Math.floor(200_000 / USD_TO_KES / 100) * 100;   // 1500
const MAX_CAP = Math.floor(1_500_000 / USD_TO_KES / 100) * 100; // 11500

const SCENERY: Record<string, string> = {
  kenya: IMG.kenyaElephants,
  tanzania: IMG.tanzaniaZanzibar,
  uganda: IMG.ugandaGorilla,
  rwanda: IMG.rwandaHills,
};

function Row({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="flex justify-between items-start gap-4 py-3.5 border-b border-outline-variant/15 last:border-0">
      <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
        {label}
      </span>
      <span className="text-on-surface text-right font-medium">
        {value ?? "—"}
      </span>
    </div>
  );
}

export default function ReviewStep() {
  const { state, update } = useWizard();
  const { currency, min, max } = state.budget;
  const country = COUNTRIES.find((c) => c.slug === state.destination);
  const scenery = state.destination
    ? SCENERY[state.destination] ?? IMG.heroSavanna
    : IMG.heroSavanna;

  return (
    <WizardShell
      stepSlug="review"
      title="Set the tone, take one last look"
      subtitle="Dial in your budget and confirm the details. Then we'll surface tailored matches."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="bg-surface-container-low rounded-2xl p-8 md:p-10">
          <h3 className="font-headline font-bold text-xl text-on-surface mb-6">
            Budget
          </h3>
          <div className="mb-8">
            <div className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">
              Currency
            </div>
            <div className="grid grid-cols-2 gap-3">
              {CURRENCIES.map(({ code, label }) => {
                const selected = currency === code;
                return (
                  <button
                    key={code}
                    onClick={() =>
                      update({ budget: { ...state.budget, currency: code } })
                    }
                    className={cn(
                      "h-12 rounded-xl font-headline font-bold text-sm bg-surface-container-highest text-on-surface transition-all",
                      selected && "sunset-gradient text-white"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  Minimum
                </span>
                <span className="font-headline font-bold text-primary">
                  {formatTravelPrice(min, currency)}
                </span>
              </div>
              <input
                type="range"
                min={200}
                max={MIN_CAP}
                step={100}
                value={min}
                onChange={(e) =>
                  update({
                    budget: { ...state.budget, min: Number(e.target.value) },
                  })
                }
                className="w-full accent-primary"
              />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  Maximum
                </span>
                <span className="font-headline font-bold text-primary">
                  {formatTravelPrice(max, currency)}
                </span>
              </div>
              <input
                type="range"
                min={Math.max(min, 500)}
                max={MAX_CAP}
                step={100}
                value={max}
                onChange={(e) =>
                  update({
                    budget: { ...state.budget, max: Number(e.target.value) },
                  })
                }
                className="w-full accent-primary"
              />
            </div>
          </div>
        </div>

        <div className="bg-surface-container-low rounded-2xl overflow-hidden">
          <div className="relative aspect-16/9">
            <Image
              src={scenery}
              alt={country?.name ?? "East Africa"}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 p-6">
              <span className="text-primary-fixed font-headline font-bold text-[10px] tracking-widest uppercase block mb-1">
                Your Trip
              </span>
              <h3 className="text-white text-2xl font-headline font-extrabold tracking-tight">
                {country?.name ?? "East Africa"}
              </h3>
              {country?.tagline && (
                <p className="text-white/80 text-xs mt-1">{country.tagline}</p>
              )}
            </div>
          </div>
          <div className="p-8">
            <Row
              label="Dates"
              value={formatDateRange(state.startDate, state.endDate)}
            />
            <Row
              label="Travelers"
              value={state.group ? `${state.group} • ${state.paxCount}` : "—"}
            />
            <Row label="Service" value={state.serviceType ?? "—"} />
            {totalRooms(state.accommodation?.rooms) > 0 && (
              <Row
                label="Rooms"
                value={formatRooms(state.accommodation?.rooms)}
              />
            )}
            {state.transport?.vehicleType && (
              <Row
                label="Vehicle"
                value={`${state.transport.vehicleType} • ${state.transport.days}d`}
              />
            )}
            <Row
              label="Budget"
              value={`${formatTravelPrice(min, currency)} – ${formatTravelPrice(
                max,
                currency
              )}`}
            />
          </div>
        </div>
      </div>
    </WizardShell>
  );
}
