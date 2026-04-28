import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { TripEstimate } from "@/lib/pricing/estimate-trip";

export function PricingSummary({ estimate }: { estimate: TripEstimate }) {
  const { lines, total, currency } = estimate;

  return (
    <Card className="p-8 md:p-10 border border-outline-variant/15 sunset-gradient text-white">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-white/70 font-headline font-bold text-xs tracking-widest uppercase">
            Your Estimate
          </span>
          <h2 className="text-3xl md:text-4xl font-headline font-extrabold tracking-tight mt-2">
            All-in pricing
          </h2>
          <p className="text-white/80 text-sm mt-2 max-w-md">
            Review your trip and we&apos;ll take it from here.
          </p>
        </div>
      </div>

      <div className="mt-10 space-y-3">
        {lines.map((line) => (
          <div
            key={line.label}
            className="flex items-center justify-between text-white/90 border-b border-white/10 pb-3"
          >
            <span className="text-sm">{line.label}</span>
            <span className="font-bold">
              {formatCurrency(line.amount, currency)}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-end justify-between mt-8 pt-6 border-t border-white/20">
        <div>
          <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">
            Total
          </p>
          <p className="font-headline font-extrabold text-5xl mt-1">
            {formatCurrency(total, currency)}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mt-10">
        <Button
          size="lg"
          variant="secondary"
          className="flex-1 bg-white text-primary hover:bg-white/90"
        >
          Request Booking
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="flex-1 border-white/30 text-white hover:bg-white/10"
        >
          Contact Advisor
        </Button>
      </div>
    </Card>
  );
}
