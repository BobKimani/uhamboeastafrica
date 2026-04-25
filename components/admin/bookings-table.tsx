"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  TableCard,
  TableToolbar,
  Table,
  Th,
  Td,
  TableEmpty,
} from "@/components/admin/data-table";
import { BOOKINGS, type Booking, type BookingStatus } from "@/lib/data/bookings";
import { formatDateRange } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STATUSES: (BookingStatus | "All")[] = [
  "All",
  "Confirmed",
  "Pending",
  "Processing",
  "Cancelled",
];

export function BookingsTable() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("All");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BOOKINGS.filter((b) => {
      if (status !== "All" && b.status !== status) return false;
      if (!q) return true;
      return (
        b.id.toLowerCase().includes(q) ||
        b.name.toLowerCase().includes(q) ||
        b.email.toLowerCase().includes(q) ||
        b.destination.toLowerCase().includes(q)
      );
    });
  }, [query, status]);

  return (
    <TableCard>
      <TableToolbar>
        <div className="flex items-center h-10 w-full md:w-80 gap-2 px-3 rounded-xl bg-surface-container-low text-on-surface-variant">
          <Search className="h-4 w-4" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by ID, name, email…"
            aria-label="Search bookings"
            className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none"
          />
        </div>

        <div
          role="tablist"
          aria-label="Filter by status"
          className="flex items-center gap-1 p-1 rounded-xl bg-surface-container-low overflow-x-auto"
        >
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={status === s}
              onClick={() => setStatus(s)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors",
                status === s
                  ? "bg-surface-container-lowest text-on-surface shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </TableToolbar>

      {rows.length === 0 ? (
        <TableEmpty message="No bookings match your filters." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Booking ID</Th>
              <Th>Name</Th>
              <Th>Phone</Th>
              <Th>Email</Th>
              <Th>Type</Th>
              <Th>Destination</Th>
              <Th>Dates</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b: Booking) => (
              <tr
                key={b.id}
                className="hover:bg-surface-container-low/60 transition-colors"
              >
                <Td>
                  <span className="font-mono text-xs">{b.id}</span>
                </Td>
                <Td>
                  <span className="font-medium">{b.name}</span>
                  <span className="block text-xs text-on-surface-variant">
                    {b.pax} {b.pax === 1 ? "guest" : "guests"}
                  </span>
                </Td>
                <Td className="text-on-surface-variant">{b.phone}</Td>
                <Td className="text-on-surface-variant">{b.email}</Td>
                <Td>{b.type}</Td>
                <Td>{b.destination}</Td>
                <Td className="text-on-surface-variant">
                  {formatDateRange(b.startDate, b.endDate)}
                </Td>
                <Td>
                  <StatusBadge status={b.status} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <div className="px-5 py-3 border-t border-outline-variant/25 text-xs text-on-surface-variant">
        Showing <span className="font-semibold text-on-surface">{rows.length}</span>{" "}
        of {BOOKINGS.length} bookings
      </div>
    </TableCard>
  );
}
