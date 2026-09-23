"use client";

import Image from "next/image";
import { WizardShell } from "@/components/wizard/wizard-shell";
import { useWizard } from "@/lib/wizard/store";
import { Currency, formatRooms, totalRooms } from "@/lib/wizard/types";
import { COUNTRIES } from "@/lib/data/countries";
import { IMG } from "@/lib/images";
import { cn, formatDateRange } from "@/lib/utils";

const CURRENCIES: { code: Currency; label: string }[] = [
  { code: "KES", label: "KSh" },
  { code: "USD", label: "USD ($)" },
];

const SERVICE_LABEL: Record<string, string> = {
  accommodation: "Accommodation only",
  transport: "Transport only",
  both: "Accommodation + Transport",
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
  const country = COUNTRIES.find((c) => c.slug === state.destination);
  const reviewImage = country?.image ?? IMG.heroSavanna;
  const showAcc = state.serviceType !== "transport";

  return (
    <WizardShell
      stepSlug="review"
      title="Take one last look"
      subtitle="Confirm the details and pick the currency for your quote. Next, we'll price your trip from our partner rates."
    >
      <div className="max-w-2xl mx-auto bg-surface-container-low rounded-2xl overflow-hidden">
        <div className="relative aspect-16/9">
          <Image
            src={reviewImage}
            alt={country ? `${country.name} flag` : "East Africa"}
            fill
            sizes="(max-width: 768px) 100vw, 672px"
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
          <Row
            label="Service"
            value={state.serviceType ? SERVICE_LABEL[state.serviceType] : "—"}
          />
          {showAcc && state.accommodation?.hotelName && (
            <Row
              label="Stay"
              value={`${state.accommodation.hotelName}${
                state.accommodation.region ? ` • ${state.accommodation.region}` : ""
              }`}
            />
          )}
          {showAcc && totalRooms(state.accommodation?.rooms) > 0 && (
            <Row label="Rooms" value={formatRooms(state.accommodation?.rooms)} />
          )}
          {state.transport?.vehicleType && state.serviceType !== "accommodation" && (
            <Row
              label="Vehicle"
              value={`${state.transport.vehicleType} • ${state.transport.days}d`}
            />
          )}

          <div className="pt-6">
            <div className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">
              Quote currency
            </div>
            <div className="grid grid-cols-2 gap-3">
              {CURRENCIES.map(({ code, label }) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => update({ currency: code })}
                  aria-pressed={state.currency === code}
                  className={cn(
                    "h-12 rounded-xl font-headline font-bold text-sm bg-surface-container-highest text-on-surface transition-all",
                    state.currency === code && "sunset-gradient text-white"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </WizardShell>
  );
}
