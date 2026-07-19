import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { AdminHeader } from "@/components/admin/header";
import { HotelManager } from "@/components/admin/hotel-manager";
import { Button } from "@/components/ui/button";

export default function AdminHotelsPage() {
  return (
    <>
      <AdminHeader
        title="Hotels"
        description="Manage the hotel catalogue shown to travellers."
      />
      <main className="p-4 md:p-8">
        <div className="mb-4 flex justify-end">
          <Link href="/destinations">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4" />
              View client page
            </Button>
          </Link>
        </div>
        <HotelManager />
      </main>
    </>
  );
}
