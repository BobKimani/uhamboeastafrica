"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IMG } from "@/lib/images";
import { adminLoginUrl, onAuthChange } from "@/lib/auth";

function safeRedirect(target: string | null): string {
    if (target && target.startsWith("/admin")) return target;
    return "/admin";
}

export function AuthForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTarget = safeRedirect(searchParams.get("redirect"));
    const [pending, setPending] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthChange((user) => {
            if (user) router.replace(redirectTarget);
        });
        return unsubscribe;
    }, [router, redirectTarget]);

    function handleSignIn() {
        setPending(true);
        window.location.assign(adminLoginUrl(redirectTarget));
    }

    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            <div className="relative h-[220px] lg:h-auto">
                <Image
                    src={IMG.serengeti}
                    alt=""
                    fill
                    loading="eager"
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
                <div className="absolute top-6 left-6 lg:top-10 lg:left-10">
                    <span className="font-display text-2xl lg:text-3xl text-white tracking-tight">
                        Uhambo
                    </span>
                </div>
                <div className="hidden lg:block absolute bottom-10 left-10 right-10">
                    <p className="font-display italic text-white/80 text-lg">
                        The breath of the savanna.
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-center px-6 py-12 lg:py-0">
                <div className="w-full max-w-[400px]">
                    <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">
                        Admin
                    </p>
                    <h1 className="font-display text-3xl text-on-surface mb-2">
                        Welcome back.
                    </h1>
                    <p className="text-sm text-on-surface-variant mb-8">
                        Sign in with your Uhambo administrator account.
                    </p>

                    <Button
                        type="button"
                        variant="primary"
                        size="lg"
                        className="w-full"
                        disabled={pending}
                        onClick={handleSignIn}
                    >
                        {pending ? "Redirecting..." : "Continue with Cognito"}
                        <LogIn className="h-5 w-5" aria-hidden />
                    </Button>

                    <p className="mt-10 text-center text-xs text-on-surface-variant">
                        Authorised personnel only.
                    </p>
                </div>
            </div>
        </div>
    );
}
