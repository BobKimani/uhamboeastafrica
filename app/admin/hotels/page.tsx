import { AdminHeader } from "@/components/admin/header";
import { HotelsManager } from "@/components/admin/hotels-manager";

export default function HotelsPage() {
  return (
    <>
      <AdminHeader
        title="Hotels"
        description="Manage properties shown in trip recommendations."
      />
      <main className="p-4 md:p-8">
        <HotelsManager />
      </main>
    </>
  );
}
