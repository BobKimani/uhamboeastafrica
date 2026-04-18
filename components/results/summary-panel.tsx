import Link from "next/link";
import { Pencil, MapPin, Calendar, Users, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { COUNTRIES } from "@/lib/data/countries";
import { DESTINATIONS } from "@/lib/data/destinations";
import { formatDateRange } from "@/lib/utils";
import type { WizardState } from "@/lib/wizard/types";

function prettyDestination(slug?: string) {
  if (!slug) return "—";
  const country = COUNTRIES.find((c) => c.slug === slug);
  if (country) return country.name;
  const destination = DESTINATIONS.find((d) => d.slug === slug);
  return destination?.name ?? slug;
}

const SERVICE_LABEL: Record<string, string> = {
  accommodation: "Accommodation only",
  transport: "Transport only",
  both: "Accommodation + Transport",
};

export function SummaryPanel({ state }: { state: WizardState }) {
  const items = [
    {
      icon: MapPin,
      label: "Destination",
      value: prettyDestination(state.destination),
    },
    {
      icon: Calendar,
      label: "Dates",
      value: formatDateRange(state.startDate, state.endDate),
    },
    {
      icon: Users,
      label: "Group",
      value: `${state.group ?? "—"} · ${state.paxCount} travelers`,
    },
    {
      icon: Sparkles,
      label: "Service",
      value: state.serviceType ? SERVICE_LABEL[state.serviceType] : "—",
    },
  ];

  return (
    <Card className="p-8 md:p-10 border border-outline-variant/15">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        <div>
          <span className="text-primary font-headline font-bold text-xs tracking-widest uppercase">
            Your Trip
          </span>
          <h2 className="text-3xl md:text-4xl font-headline font-extrabold tracking-tight text-on-background mt-2">
            Here's what we're building for you
          </h2>
        </div>
        <Link href="/plan-trip/destination">
          <Button variant="secondary" size="md">
            <Pencil className="h-4 w-4" />
            Edit trip
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
        {items.map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="rounded-xl bg-surface-container-low p-5 border border-outline-variant/10"
          >
            <div className="flex items-center gap-2 text-on-surface-variant">
              <Icon className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                {label}
              </span>
            </div>
            <p className="text-on-surface font-headline font-bold text-lg mt-2 capitalize">
              {value}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
