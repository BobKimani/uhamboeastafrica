import type { Metadata } from "next";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AuthGuard } from "@/components/auth/auth-guard";

export const metadata: Metadata = {
  title: "Uhambo Admin",
  description: "Operator dashboard for Uhambo East Africa.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <AdminSidebar />
        <div className="lg:pl-64 flex flex-col min-h-screen">{children}</div>
      </div>
    </AuthGuard>
  );
}
