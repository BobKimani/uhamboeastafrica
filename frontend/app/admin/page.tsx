"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  Plane,
  TrendingUp,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { AdminHeader } from "@/components/admin/header";
import { MetricCard } from "@/components/admin/metric-card";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  TableCard,
  Table,
  Th,
  Td,
  TableEmpty,
} from "@/components/admin/data-table";
import { fetchAdminBookings } from "@/lib/api/bookings";
import type { Booking } from "@/types/booking";
import {
  formatCurrency,
  formatDateRange,
} from "@/lib/utils";

function formatLabel(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function computeMetrics(bookings: Booking[]) {
  const totalBookings = bookings.length;

  const activeTrips = bookings.filter(
    (b) => b.status === "confirmed" || b.status === "quoted"
  ).length;

  const confirmedRate = totalBookings
    ? (bookings.filter((b) => b.status === "confirmed").length / totalBookings) *
      100
    : 0;

  return { totalBookings, activeTrips, confirmedRate };
}

export default function AdminHomePage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchAdminBookings();
        if (!cancelled) setBookings(data);
      } catch (error) {
        if (!cancelled)
          setErrorMessage(
            error instanceof Error ? error.message : "Failed to load bookings."
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const { totalBookings, activeTrips, confirmedRate } = computeMetrics(bookings);
  const recent = bookings.slice(0, 5);

  return (
    <>
      <AdminHeader
        title="Dashboard"
        description="Operations overview for Uhambo East Africa."
      />
      <main className="flex min-w-0 flex-col gap-8 p-4 md:p-8">
        {errorMessage && (
          <div
            className="flex items-start gap-2 p-4 rounded-xl text-sm text-red-500 bg-surface-container-low"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <section aria-labelledby="metrics-heading">
          <h2 id="metrics-heading" className="sr-only">
            Key metrics
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
            <MetricCard
              label="Total Bookings"
              value={loading ? "…" : String(totalBookings)}
              delta=""
              trend="up"
              icon={CalendarCheck}
              hint="All-time, across all services"
            />
            <MetricCard
              label="Active Trips"
              value={loading ? "…" : String(activeTrips)}
              delta=""
              trend="up"
              icon={Plane}
              hint="Confirmed or quoted"
            />
            <MetricCard
              label="Conversion Rate"
              value={loading ? "…" : `${confirmedRate.toFixed(1)}%`}
              delta=""
              trend="up"
              icon={TrendingUp}
              hint="Confirmed / total bookings"
            />
          </div>
        </section>

        <section aria-labelledby="recent-heading" className="flex flex-col gap-4">
          <div className="flex min-w-0 items-center justify-between gap-4">
            <div className="min-w-0">
              <h2
                id="recent-heading"
                className="text-lg font-headline font-bold text-on-surface"
              >
                Recent bookings
              </h2>
              <p className="text-sm text-on-surface-variant">
                Latest trips submitted through the Plan Trip flow.
              </p>
            </div>
            <Link
              href="/admin/bookings"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <TableCard>
            {loading ? (
              <TableEmpty message="Loading bookings..." />
            ) : recent.length === 0 ? (
              <TableEmpty message="No bookings yet." />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Booking</Th>
                    <Th>Guest</Th>
                    <Th>Destination</Th>
                    <Th>Dates</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((b) => (
                    <tr
                      key={b.id}
                      className="hover:bg-surface-container-low/60 transition-colors"
                    >
                      <Td>
                        <span className="font-medium">
                          {formatLabel(b.bookingType)}
                        </span>
                        <span className="block text-xs text-on-surface-variant/80 mt-0.5">
                          {formatCurrency(b.minimumBudget, "USD")} -{" "}
                          {formatCurrency(b.maximumBudget, "USD")}
                        </span>
                      </Td>
                      <Td>
                        <span className="font-medium">{b.fullName}</span>
                        <span className="block text-xs text-on-surface-variant">
                          {b.numberOfTravellers} pax
                        </span>
                      </Td>
                      <Td>{b.destination}</Td>
                      <Td className="text-on-surface-variant">
                        {formatDateRange(b.travelStartDate, b.travelEndDate)}
                      </Td>
                      <Td>
                        <StatusBadge status={b.status} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </TableCard>
        </section>
      </main>
    </>
  );
}
