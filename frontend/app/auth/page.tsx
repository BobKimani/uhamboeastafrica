import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AuthForm } from "./auth-form";

function AuthFallback() {
    return (
        <div className="min-h-screen w-full flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-on-surface-variant" />
        </div>
    );
}

export default function AuthPage() {
    return (
        <Suspense fallback={<AuthFallback />}>
            <AuthForm />
        </Suspense>
    );
}
