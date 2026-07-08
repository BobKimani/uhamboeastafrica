import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/lib/data/bookings";

const STYLES: Record<BookingStatus, string> = {
  new:
    "bg-tertiary-fixed/40 text-on-tertiary-fixed-variant ring-1 ring-inset ring-tertiary-fixed-dim/50",
  contacted:
    "bg-secondary-container text-on-secondary-container ring-1 ring-inset ring-outline-variant/60",
  quoted:
    "bg-primary/10 text-primary ring-1 ring-inset ring-primary/20",
  confirmed:
    "bg-primary/10 text-primary ring-1 ring-inset ring-primary/20",
  completed:
    "bg-secondary-container text-on-secondary-container ring-1 ring-inset ring-outline-variant/60",
  cancelled:
    "bg-error-container text-on-error-container ring-1 ring-inset ring-error/30",
};

const DOT_STYLES: Record<BookingStatus, string> = {
  new: "bg-tertiary",
  contacted: "bg-on-secondary-container/70",
  quoted: "bg-primary",
  confirmed: "bg-primary",
  cancelled: "bg-error",
  completed: "bg-on-secondary-container/70",
};

function formatStatus(status: BookingStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

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
        className={cn("h-1.5 w-1.5 rounded-full", DOT_STYLES[status])}
      />
      {formatStatus(status)}
    </span>
  );
}
