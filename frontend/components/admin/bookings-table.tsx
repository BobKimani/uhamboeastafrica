"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, AlertCircle, RefreshCw, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  TableCard,
  TableToolbar,
  Table,
  Th,
  Td,
  TableEmpty,
} from "@/components/admin/data-table";
import {
  fetchAdminBookings,
  updateBookingStatus,
  deleteBooking,
} from "@/lib/api/bookings";
import type { Booking, BookingStatus } from "@/types/booking";
import { TRIP_TYPE_LABELS } from "@/lib/api/transport";
import { formatFromKes } from "@/lib/currency";
import {
  cn,
  formatDateRange,
  formatTimestamp,
} from "@/lib/utils";

const ALL_STATUSES: BookingStatus[] = [
  "new",
  "contacted",
  "quoted",
  "confirmed",
  "cancelled",
  "completed",
];

const FILTERS: ("all" | BookingStatus)[] = ["all", ...ALL_STATUSES];

const formatKes = (amount: number) => formatFromKes(amount, "KES");

function TransportDetails({ booking }: { booking: Booking }) {
  if (booking.bookingType === "accommodation" || !booking.transportFrom) {
    return <span className="text-on-surface-variant">—</span>;
  }
  const quote = booking.transportQuote;
  return (
    <div className="flex min-w-48 flex-col gap-0.5">
      <span className="font-medium">
        {booking.transportFrom} → {booking.transportTo}
      </span>
      <span className="text-xs text-on-surface-variant">
        {booking.tripType ? TRIP_TYPE_LABELS[booking.tripType] : "Legacy booking"}
        {booking.vehicleType ? ` · ${booking.vehicleType}` : ""}
      </span>
      {booking.quoteRequested ? (
        <span className="mt-1 inline-flex w-fit items-center rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
          Quote requested
        </span>
      ) : quote ? (
        <span className="text-xs text-on-surface-variant">
          <span className="font-semibold text-on-surface">{formatKes(quote.totalKes)}</span>
          {" "}· fuel {formatKes(quote.fuelKes)} + driver {formatKes(quote.driverAllowanceKes)}
          {" "}· {quote.distanceKm} km
        </span>
      ) : booking.transportAmountKes ? (
        <span className="text-xs font-semibold">{formatKes(booking.transportAmountKes)}</span>
      ) : null}
    </div>
  );
}

function formatLabel(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function BookingsTable() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchAdminBookings();
      setBookings(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load bookings."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleStatusChange(id: string, status: BookingStatus) {
    setUpdatingId(id);
    const previous = bookings;
    setBookings((rows) =>
      rows.map((b) => (b.id === id ? { ...b, status } : b))
    );
    try {
      await updateBookingStatus(id, status);
    } catch (error) {
      setBookings(previous);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to update status."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(booking: Booking) {
    const confirmed = window.confirm(
      `Delete booking for ${booking.fullName}? This action cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(booking.id);
    const previous = bookings;
    setBookings((rows) => rows.filter((b) => b.id !== booking.id));

    try {
      await deleteBooking(booking.id);
    } catch (error) {
      setBookings(previous);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to delete booking."
      );
    } finally {
      setDeletingId(null);
    }
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bookings.filter((booking) => {
      if (filter !== "all" && booking.status !== filter) return false;
      if (!q) return true;
      return (
        booking.fullName.toLowerCase().includes(q) ||
        booking.email.toLowerCase().includes(q) ||
        booking.phone.toLowerCase().includes(q) ||
        booking.destination.toLowerCase().includes(q) ||
        booking.bookingType.toLowerCase().includes(q) ||
        booking.travellingWith.toLowerCase().includes(q)
      );
    });
  }, [bookings, query, filter]);

  return (
    <TableCard>
      <TableToolbar>
        <div className="flex h-10 w-full min-w-0 items-center gap-2 rounded-xl bg-surface-container-low px-3 text-on-surface-variant md:w-96">
          <Search className="h-4 w-4" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, phone, destination..."
            aria-label="Search bookings"
            className="min-w-0 flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none"
          />
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2 md:justify-end">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low disabled:opacity-50"
            aria-label="Refresh bookings"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </button>
          <div
            role="tablist"
            aria-label="Filter by status"
            className="flex max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-surface-container-low p-1"
          >
            {FILTERS.map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={filter === item}
                onClick={() => setFilter(item)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors",
                  filter === item
                    ? "bg-surface-container-lowest text-on-surface shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                )}
              >
                {formatLabel(item)}
              </button>
            ))}
          </div>
        </div>
      </TableToolbar>

      {errorMessage && (
        <div className="flex items-start gap-2 px-5 py-3 text-sm text-red-500 border-b border-outline-variant/25" role="alert">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {loading ? (
        <TableEmpty message="Loading bookings..." />
      ) : rows.length === 0 ? (
        <TableEmpty
          message={
            bookings.length === 0
              ? "No bookings yet."
              : "No bookings match your filters."
          }
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Customer</Th>
              <Th>Contact</Th>
              <Th>Destination</Th>
              <Th>Dates</Th>
              <Th>Travelling with</Th>
              <Th>Booking type</Th>
              <Th>Transport</Th>
              <Th>Travellers</Th>
              <Th>Rooms</Th>
              <Th>Submitted</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((booking) => (
              <tr
                key={booking.id}
                className="hover:bg-surface-container-low/60 transition-colors"
              >
                <Td>
                  <span className="font-medium">{booking.fullName}</span>
                </Td>
                <Td>
                  <span className="block text-on-surface">{booking.email}</span>
                  <span className="block text-xs text-on-surface-variant mt-0.5">
                    {booking.phone}
                  </span>
                </Td>
                <Td>{booking.destination}</Td>
                <Td className="text-on-surface-variant">
                  {formatDateRange(booking.travelStartDate, booking.travelEndDate)}
                </Td>
                <Td>{formatLabel(booking.travellingWith)}</Td>
                <Td>{formatLabel(booking.bookingType)}</Td>
                <Td>
                  <TransportDetails booking={booking} />
                </Td>
                <Td className="text-right">{booking.numberOfTravellers}</Td>
                <Td className="text-right">{booking.numberOfRooms}</Td>
                <Td className="text-on-surface-variant">
                  {formatTimestamp(booking.createdAt)}
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={booking.status} />
                    <select
                      aria-label={`Change status for ${booking.fullName}`}
                      value={booking.status}
                      disabled={updatingId === booking.id}
                      onChange={(e) =>
                        void handleStatusChange(
                          booking.id,
                          e.target.value as BookingStatus
                        )
                      }
                      className="h-8 px-2 rounded-lg text-xs font-semibold bg-surface-container-low text-on-surface border border-outline-variant/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50"
                    >
                      {ALL_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {formatLabel(s)}
                        </option>
                      ))}
                    </select>
                  </div>
                </Td>
                <Td className="text-right">
                  <button
                    type="button"
                    onClick={() => void handleDelete(booking)}
                    disabled={deletingId === booking.id}
                    aria-label={`Delete booking for ${booking.fullName}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-red-500 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <div className="px-5 py-3 border-t border-outline-variant/25 text-xs text-on-surface-variant">
        Showing <span className="font-semibold text-on-surface">{rows.length}</span>{" "}
        of {bookings.length} bookings
      </div>
    </TableCard>
  );
}
