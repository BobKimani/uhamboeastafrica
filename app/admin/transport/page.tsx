import { AdminHeader } from "@/components/admin/header";
import { TransportManager } from "@/components/admin/transport-manager";

export default function AdminTransportPage() {
  return (
    <>
      <AdminHeader
        title="Vehicles"
        description="Manage the vehicle fleet available for trips."
      />
      <main className="p-4 md:p-8">
        <TransportManager />
      </main>
    </>
  );
}
