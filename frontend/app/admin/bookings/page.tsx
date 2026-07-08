import { AdminHeader } from "@/components/admin/header";
import { BookingsTable } from "@/components/admin/bookings-table";

export default function BookingsPage() {
  return (
    <>
      <AdminHeader
        title="Bookings"
        description="Every trip submitted through the Plan Trip flow."
      />
      <main className="p-4 md:p-8">
        <BookingsTable />
      </main>
    </>
  );
}
