"use client";

import { useEffect, useMemo, useState } from "react";
import { apiUrl, readJson } from "@/lib/api/client";

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

export function adminLoginUrl(redirect = "/admin") {
    const target = redirect.startsWith("/admin") ? redirect : "/admin";
    return `${apiUrl("/auth/login")}?redirect=${target}`;
}

export async function signOutUser() {
    window.location.assign(apiUrl("/auth/logout"));
}

export async function getCurrentAdminUser() {
    const url = apiUrl("/auth/me");
    const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
    });

    if (response.status === 401) {
        if (process.env.NODE_ENV !== "production") {
            console.info("[auth] No active admin session.");
        }
        return null;
    }

    const result = await readJson<{ authenticated: boolean; user: AdminUser }>(
        response,
        "Failed to load admin session"
    );
    if (!result.authenticated) {
        return null;
    }
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
