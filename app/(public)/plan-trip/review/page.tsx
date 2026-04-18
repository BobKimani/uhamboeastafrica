"use client";

import { WizardShell } from "@/components/wizard/wizard-shell";
import { useWizard } from "@/lib/wizard/store";
import { formatCurrency, formatDateRange } from "@/lib/utils";

function Row({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="flex justify-between items-start gap-4 py-4 border-b border-outline-variant/15 last:border-0">
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
  const { state } = useWizard();
  return (
    <WizardShell
      stepSlug="review"
      title="One last look"
      subtitle="Everything aligned? Tap Find My Trip and we'll surface tailored matches."
    >
      <div className="max-w-2xl mx-auto bg-surface-container-low rounded-2xl p-8 md:p-10">
        <Row label="Destination" value={state.destination ?? "—"} />
        <Row
          label="Dates"
          value={formatDateRange(state.startDate, state.endDate)}
        />
        <Row
          label="Travelers"
          value={state.group ? `${state.group} • ${state.paxCount}` : "—"}
        />
        <Row label="Service" value={state.serviceType ?? "—"} />
        {state.accommodation?.roomType && (
          <Row label="Room" value={state.accommodation.roomType} />
        )}
        {state.transport?.vehicleType && (
          <Row
            label="Vehicle"
            value={`${state.transport.vehicleType} • ${state.transport.days}d`}
          />
        )}
        <Row
          label="Budget"
          value={`${formatCurrency(
            state.budget.min,
            state.budget.currency
          )} – ${formatCurrency(state.budget.max, state.budget.currency)}`}
        />
      </div>
    </WizardShell>
  );
}
