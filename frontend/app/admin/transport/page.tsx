import { AdminHeader } from "@/components/admin/header";
import { TransportManager } from "@/components/admin/transport-manager";
import { TransportPricingPanel } from "@/components/admin/transport-pricing-panel";
import { TransportRoutesPanel } from "@/components/admin/transport-routes-panel";

export default function AdminTransportPage() {
  return (
    <>
      <AdminHeader
        title="Transport"
        description="Manage fuel pricing, routes and the vehicle fleet."
      />
      <main className="min-w-0 p-4 md:p-8 flex flex-col gap-6">
        <TransportPricingPanel />
        <TransportRoutesPanel />
        <TransportManager />
      </main>
    </>
  );
}
