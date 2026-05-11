import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateRange(start?: string, end?: string) {
  if (!start || !end) return "—";
  const s = new Date(start);
  const e = new Date(end);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(s)} – ${fmt(e)}`;
}

export function nightsBetween(start?: string, end?: string) {
  if (!start || !end) return 0;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)));
}

type SerializedTimestamp = {
  _seconds: number;
  _nanoseconds: number;
} | { seconds: number; nanoseconds: number };

export function timestampToDate(ts: SerializedTimestamp | null | undefined): Date | null {
  if (!ts) return null;
  const seconds = "_seconds" in ts ? ts._seconds : ts.seconds;
  if (typeof seconds !== "number") return null;
  return new Date(seconds * 1000);
}

export function formatTimestamp(ts: SerializedTimestamp | null | undefined) {
  const d = timestampToDate(ts);
  if (!d) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
