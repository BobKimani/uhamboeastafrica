import { AdminHeader } from "@/components/admin/header";
import { InquiriesTable } from "@/components/admin/inquiries-table";

export default function InquiriesPage() {
  return (
    <>
      <AdminHeader
        title="Inquiries"
        description="Messages submitted through the Contact form."
      />
      <main className="p-4 md:p-8">
        <InquiriesTable />
      </main>
    </>
  );
}
