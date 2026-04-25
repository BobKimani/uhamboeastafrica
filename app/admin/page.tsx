import Link from "next/link";
import {
  Wallet,
  CalendarCheck,
  Plane,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { AdminHeader } from "@/components/admin/header";
import { MetricCard } from "@/components/admin/metric-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { BOOKINGS } from "@/lib/data/bookings";
import {
  TableCard,
  Table,
  Th,
  Td,
} from "@/components/admin/data-table";
import {
  formatCurrency,
  formatDateRange,
  nightsBetween,
} from "@/lib/utils";

const DAILY_RATE = 850;

function computeMetrics() {
  const totalBookings = BOOKINGS.length;

  const revenue = BOOKINGS.reduce((sum, b) => {
    const nights = Math.max(1, nightsBetween(b.startDate, b.endDate));
    return sum + nights * b.pax * DAILY_RATE;
  }, 0);

  const activeTrips = BOOKINGS.filter(
    (b) => b.status === "Confirmed" || b.status === "Processing"
  ).length;

  const confirmedRate = totalBookings
    ? (BOOKINGS.filter((b) => b.status === "Confirmed").length /
        totalBookings) *
      100
    : 0;

  return { totalBookings, revenue, activeTrips, confirmedRate };
}

export default function AdminHomePage() {
  const { totalBookings, revenue, activeTrips, confirmedRate } =
    computeMetrics();
  const recent = BOOKINGS.slice(0, 5);

  return (
    <>
      <AdminHeader
        title="Dashboard"
        description="Operations overview for Uhambo East Africa."
      />
      <main className="p-4 md:p-8 flex flex-col gap-8">
        <section aria-labelledby="metrics-heading">
          <h2 id="metrics-heading" className="sr-only">
            Key metrics
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5">
            <MetricCard
              label="Total Bookings"
              value={String(totalBookings)}
              delta="+12.4%"
              trend="up"
              icon={CalendarCheck}
              hint="All-time, across all services"
            />
            <MetricCard
              label="Revenue"
              value={formatCurrency(revenue, "USD")}
              delta="+8.1%"
              trend="up"
              icon={Wallet}
              hint="Gross, current pipeline"
            />
            <MetricCard
              label="Active Trips"
              value={String(activeTrips)}
              delta="+3"
              trend="up"
              icon={Plane}
              hint="Confirmed or in processing"
            />
            <MetricCard
              label="Conversion Rate"
              value={`${confirmedRate.toFixed(1)}%`}
              delta="-1.2%"
              trend="down"
              icon={TrendingUp}
              hint="Confirmed / total bookings"
            />
          </div>
        </section>

        <section
          aria-labelledby="recent-heading"
          className="flex flex-col gap-4"
        >
          <div className="flex items-center justify-between">
            <div>
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
                      <span className="font-mono text-xs text-on-surface-variant">
                        {b.id}
                      </span>
                      <span className="block text-xs text-on-surface-variant/80 mt-0.5">
                        {b.type}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-medium">{b.name}</span>
                      <span className="block text-xs text-on-surface-variant">
                        {b.pax} pax
                      </span>
                    </Td>
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
          </TableCard>
        </section>
      </main>
    </>
  );
}
