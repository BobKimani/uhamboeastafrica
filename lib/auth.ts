"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthError, type AuthResponse, type Session, type User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

type AuthChangeCallback = (user: User | null, session: Session | null) => void;

export type AdminAuth = {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signUp: (email: string, password: string) => Promise<AuthResponse>;
    signIn: (email: string, password: string) => Promise<AuthResponse>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
};

export async function signUp(email: string, password: string) {
    const response = await supabase.auth.signUp({ email, password });
    if (response.error) throw response.error;
    return response;
}

export async function signIn(email: string, password: string) {
    const response = await supabase.auth.signInWithPassword({ email, password });
    if (response.error) throw response.error;
    return response;
}

export async function signOutUser() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

export async function sendResetEmail(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
    });
    if (error) throw error;
}

export async function getCurrentSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
}

export function onAuthChange(callback: AuthChangeCallback) {
    let active = true;

    supabase.auth.getSession().then(({ data, error }) => {
        if (!active) return;

        if (error) {
            callback(null, null);
            return;
        }

        callback(data.session?.user ?? null, data.session);
    });

    const {
        data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
        callback(session?.user ?? null, session);
    });

    return () => {
        active = false;
        subscription.unsubscribe();
    };
}

export function useAuth(): AdminAuth {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthChange((nextUser, nextSession) => {
            setUser(nextUser);
            setSession(nextSession);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    return useMemo(
        () => ({
            user,
            session,
            loading,
            signUp,
            signIn,
            signOut: signOutUser,
            resetPassword: sendResetEmail,
        }),
        [user, session, loading]
    );
}

export function friendlySignInError(error: unknown): string {
    if (error instanceof AuthError) {
        if (
            error.status === 400 ||
            error.message.toLowerCase().includes("invalid login credentials")
        ) {
            return "Invalid email or password.";
        }

        if (error.status === 429) {
            return "Too many attempts. Try again in a moment.";
        }
    }

    if (isNetworkError(error)) {
        return "Network error. Check your connection.";
    }

    return "Something went wrong. Please try again.";
}

export function friendlyResetError(error: unknown): string | null {
    if (error instanceof AuthError) {
        if (error.status === 400 || error.message.toLowerCase().includes("email")) {
            return "Please enter a valid email address.";
        }

        if (error.status === 429) {
            return "Too many attempts. Try again in a moment.";
        }
    }

    if (isNetworkError(error)) {
        return "Network error. Check your connection.";
    }

    return "Something went wrong. Please try again.";
}

function isNetworkError(error: unknown) {
    return error instanceof TypeError && error.message.toLowerCase().includes("fetch");
}
