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
        <div className="flex min-h-screen min-w-0 flex-col lg:pl-64">{children}</div>
      </div>
    </AuthGuard>
  );
}
