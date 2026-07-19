import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { WizardProvider } from "@/lib/wizard/store";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WizardProvider>
      <Navbar />
      <main className="min-h-screen pt-20">{children}</main>
      <Footer />
    </WizardProvider>
  );
}
