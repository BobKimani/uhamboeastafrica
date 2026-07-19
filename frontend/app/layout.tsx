import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Manrope } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Uhambo East Africa — The Breath of the Savanna",
  description:
    "Tailored safaris, transport and stays across Kenya, Tanzania, Uganda and Rwanda.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${jakarta.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-on-background font-body">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
