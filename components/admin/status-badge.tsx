import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/lib/data/bookings";

const STYLES: Record<BookingStatus, string> = {
  Confirmed:
    "bg-primary/10 text-primary ring-1 ring-inset ring-primary/20",
  Pending:
    "bg-tertiary-fixed/40 text-on-tertiary-fixed-variant ring-1 ring-inset ring-tertiary-fixed-dim/50",
  Processing:
    "bg-secondary-container text-on-secondary-container ring-1 ring-inset ring-outline-variant/60",
  Cancelled:
    "bg-error-container text-on-error-container ring-1 ring-inset ring-error/30",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold",
        STYLES[status]
      )}
    >
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "Confirmed" && "bg-primary",
          status === "Pending" && "bg-tertiary",
          status === "Processing" && "bg-on-secondary-container/70",
          status === "Cancelled" && "bg-error"
        )}
      />
      {status}
    </span>
  );
}
