"use client";

import { useEffect, useMemo, useState } from "react";
import { apiUrl, readJson } from "@/lib/api/client";
import { csrfHeaders, setCsrfToken } from "@/lib/api/csrf";

export type AdminUser = {
    sub: string;
    email?: string;
    name?: string;
    groups: string[];
    isAdmin?: boolean;
    displayName?: string;
};

type AuthChangeCallback = (user: AdminUser | null) => void;

export type AdminAuth = {
    user: AdminUser | null;
    session: null;
    loading: boolean;
    signOut: () => Promise<void>;
};

function normalizeUser(user: AdminUser): AdminUser {
    return {
        ...user,
        displayName: user.displayName ?? user.name ?? user.email ?? "Admin",
    };
}

type AuthResponse = {
    authenticated: boolean;
    user: AdminUser | null;
    csrfToken?: string;
};

/** Email/password login against the backend; sets the HttpOnly session cookie. */
export async function signInWithPassword(email: string, password: string) {
    const response = await fetch(apiUrl("/auth/login"), {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });

    if (response.status === 422) {
        throw new Error("Enter your email and password.");
    }

    const result = await readJson<AuthResponse>(response, "Sign in failed");
    if (!result.authenticated || !result.user) {
        throw new Error("Sign in failed");
    }
    setCsrfToken(result.csrfToken);
    return normalizeUser({ ...result.user, isAdmin: true });
}

export async function signOutUser() {
    try {
        await fetch(apiUrl("/auth/logout"), {
            method: "POST",
            credentials: "include",
            cache: "no-store",
            headers: await csrfHeaders(),
        });
    } finally {
        setCsrfToken(null);
        window.location.assign("/auth");
    }
}

export async function getCurrentAdminUser() {
    const url = apiUrl("/auth/me");
    const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
    });

    if (response.status === 401) {
        setCsrfToken(null);
        if (process.env.NODE_ENV !== "production") {
            console.info("[auth] No active admin session.");
        }
        return null;
    }

    const result = await readJson<AuthResponse>(
        response,
        "Failed to load admin session"
    );
    if (!result.authenticated || !result.user) {
        setCsrfToken(null);
        return null;
    }
    setCsrfToken(result.csrfToken);
    return normalizeUser({ ...result.user, isAdmin: true });
}

export function onAuthChange(callback: AuthChangeCallback) {
    let active = true;
    void getCurrentAdminUser()
        .then((user) => {
            if (active) callback(user);
        })
        .catch(() => {
            if (active) callback(null);
        });
    return () => {
        active = false;
    };
}

export function useAuth(): AdminAuth {
    const [user, setUser] = useState<AdminUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthChange((nextUser) => {
            setUser(nextUser);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    return useMemo(
        () => ({
            user,
            session: null,
            loading,
            signOut: signOutUser,
        }),
        [user, loading]
    );
}
