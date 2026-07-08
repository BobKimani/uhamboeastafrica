import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  delta,
  trend = "up",
  icon: Icon,
  hint,
}: {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down";
  icon: LucideIcon;
  hint?: string;
}) {
  const positive = trend === "up";
  return (
    <div className="group relative flex flex-col gap-5 p-5 md:p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/25 transition-colors hover:border-outline-variant/50">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
          {label}
        </span>
        <span
          aria-hidden
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-3xl md:text-4xl font-headline font-bold text-on-surface tracking-tight">
          {value}
        </p>
        {hint && (
          <p className="text-xs text-on-surface-variant">{hint}</p>
        )}
      </div>

      {delta && (
        <div className="flex items-center gap-2 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold",
              positive
                ? "bg-primary/10 text-primary"
                : "bg-error-container text-on-error-container"
            )}
          >
            {positive ? (
              <ArrowUpRight className="h-3 w-3" strokeWidth={2.5} />
            ) : (
              <ArrowDownRight className="h-3 w-3" strokeWidth={2.5} />
            )}
            {delta}
          </span>
          <span className="text-on-surface-variant">vs. last month</span>
        </div>
      )}
    </div>
  );
}
