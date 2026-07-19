"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import {
    signIn,
    sendResetEmail,
    onAuthChange,
    friendlySignInError,
    friendlyResetError,
} from "@/lib/auth";

type Mode = "signIn" | "reset";

const RESET_SUCCESS_MESSAGE = "If that email exists, a reset link is on its way.";

function safeRedirect(target: string | null): string {
    if (target && target.startsWith("/admin")) return target;
    return "/admin";
}

export function AuthForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTarget = safeRedirect(searchParams.get("redirect"));

    const [mode, setMode] = useState<Mode>("signIn");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resetSuccess, setResetSuccess] = useState(false);
    const [pending, setPending] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthChange((user) => {
            if (user) router.replace(redirectTarget);
        });
        return unsubscribe;
    }, [router, redirectTarget]);

    function switchMode(next: Mode) {
        setMode(next);
        setError(null);
        setResetSuccess(false);
    }

    async function handleSignIn(e: FormEvent) {
        e.preventDefault();
        setError(null);
        setPending(true);
        try {
            await signIn(email, password);
            router.replace(redirectTarget);
        } catch (err) {
            setError(friendlySignInError(err));
            setPending(false);
        }
    }

    async function handleReset(e: FormEvent) {
        e.preventDefault();
        setError(null);
        setResetSuccess(false);
        setPending(true);
        try {
            await sendResetEmail(email);
            setResetSuccess(true);
        } catch (err) {
            const friendly = friendlyResetError(err);
            if (friendly === null) {
                setResetSuccess(true);
            } else {
                setError(friendly);
            }
        }
        setTimeout(() => setPending(false), 3000);
    }

    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            <div className="relative h-[220px] lg:h-auto">
                <Image
                    src="/assets/serengeti.jpg"
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

                    {mode === "signIn" ? (
                        <SignInView
                            email={email}
                            setEmail={setEmail}
                            password={password}
                            setPassword={setPassword}
                            showPassword={showPassword}
                            setShowPassword={setShowPassword}
                            error={error}
                            pending={pending}
                            onSubmit={handleSignIn}
                            onForgot={() => switchMode("reset")}
                        />
                    ) : (
                        <ResetView
                            email={email}
                            setEmail={setEmail}
                            error={error}
                            success={resetSuccess}
                            pending={pending}
                            onSubmit={handleReset}
                            onBack={() => switchMode("signIn")}
                        />
                    )}

                    <p className="mt-10 text-center text-xs text-on-surface-variant">
                        Authorised personnel only.
                    </p>
                </div>
            </div>
        </div>
    );
}

function SignInView(props: {
    email: string;
    setEmail: (v: string) => void;
    password: string;
    setPassword: (v: string) => void;
    showPassword: boolean;
    setShowPassword: (v: boolean) => void;
    error: string | null;
    pending: boolean;
    onSubmit: (e: FormEvent) => void;
    onForgot: () => void;
}) {
    return (
        <>
            <h1 className="font-display text-3xl text-on-surface mb-2">Welcome back.</h1>
            <p className="text-sm text-on-surface-variant mb-8">
                Sign in to manage Uhambo.
            </p>

            <form onSubmit={props.onSubmit} className="space-y-5">
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        required
                        autoComplete="email"
                        value={props.email}
                        onChange={(e) => props.setEmail(e.target.value)}
                        disabled={props.pending}
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        <button
                            type="button"
                            onClick={props.onForgot}
                            className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors"
                        >
                            Forgot password?
                        </button>
                    </div>
                    <div className="relative">
                        <Input
                            id="password"
                            type={props.showPassword ? "text" : "password"}
                            required
                            autoComplete="current-password"
                            value={props.password}
                            onChange={(e) => props.setPassword(e.target.value)}
                            disabled={props.pending}
                            className="pr-12"
                        />
                        <button
                            type="button"
                            onClick={() => props.setShowPassword(!props.showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                            aria-label={props.showPassword ? "Hide password" : "Show password"}
                        >
                            {props.showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                <div className="min-h-[20px]">
                    {props.error && (
                        <p className="text-sm text-red-500" role="alert">
                            {props.error}
                        </p>
                    )}
                </div>

                <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    disabled={props.pending}
                >
                    {props.pending ? "Signing in…" : "Sign in"}
                </Button>
            </form>
        </>
    );
}

function ResetView(props: {
    email: string;
    setEmail: (v: string) => void;
    error: string | null;
    success: boolean;
    pending: boolean;
    onSubmit: (e: FormEvent) => void;
    onBack: () => void;
}) {
    return (
        <>
            <h1 className="font-display text-3xl text-on-surface mb-2">Reset your password.</h1>
            <p className="text-sm text-on-surface-variant mb-8">
                We&apos;ll email you a reset link.
            </p>

            <form onSubmit={props.onSubmit} className="space-y-5">
                <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                        id="reset-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={props.email}
                        onChange={(e) => props.setEmail(e.target.value)}
                        disabled={props.pending}
                    />
                </div>

                <div className="min-h-[20px]">
                    {props.error && (
                        <p className="text-sm text-red-500" role="alert">
                            {props.error}
                        </p>
                    )}
                    {props.success && (
                        <p className="text-sm text-on-surface-variant">{RESET_SUCCESS_MESSAGE}</p>
                    )}
                </div>

                <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    disabled={props.pending}
                >
                    {props.pending ? "Sending…" : "Send reset link"}
                </Button>

                <button
                    type="button"
                    onClick={props.onBack}
                    className="block w-full text-center text-sm text-on-surface-variant hover:text-primary transition-colors"
                >
                    Back to sign in
                </button>
            </form>
        </>
    );
}
