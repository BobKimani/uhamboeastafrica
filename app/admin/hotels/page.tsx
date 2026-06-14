import { AdminHeader } from "@/components/admin/header";
import { HotelManager } from "@/components/admin/hotel-manager";

export default function AdminHotelsPage() {
  return (
    <>
      <AdminHeader
        title="Hotels"
        description="Manage the hotel catalogue shown to travellers."
      />
      <main className="p-4 md:p-8">
        <HotelManager />
      </main>
    </>
  );
}
