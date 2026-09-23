import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Uhambo East Africa — The Breath of the Savanna",
  description:
    "Tailored safaris, transport and stays across Kenya, Tanzania and Uganda.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <body className="min-h-full bg-background text-on-background font-body">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
