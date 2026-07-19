import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Sign in — Uhambo Admin",
    description: "Authorised personnel only.",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return <div className="min-h-screen bg-background">{children}</div>;
}
