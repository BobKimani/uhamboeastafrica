"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { onAuthChange } from "@/lib/auth";

type Status = "loading" | "authed" | "unauthed";

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const [status, setStatus] = useState<Status>("loading");
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const unsubscribe = onAuthChange((user) => {
            setStatus(user ? "authed" : "unauthed");
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        if (status === "unauthed") {
            router.replace(`/auth?redirect=${encodeURIComponent(pathname)}`);
        }
    }, [status, router, pathname]);

    if (status === "loading") {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-background">
                <Loader2 className="h-6 w-6 animate-spin text-on-surface-variant" />
            </div>
        );
    }

    if (status === "unauthed") return null;

    return <>{children}</>;
}
