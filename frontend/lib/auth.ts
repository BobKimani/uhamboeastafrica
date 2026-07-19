"use client";

import { useEffect, useMemo, useState } from "react";
import { FirebaseError } from "firebase/app";
import {
    createUserWithEmailAndPassword,
    getAuth,
    onAuthStateChanged,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signOut,
    type User,
    type UserCredential,
} from "firebase/auth";
import { app } from "@/lib/firebase";

export const auth = getAuth(app);

type AuthChangeCallback = (user: User | null) => void;

export type AdminAuth = {
    user: User | null;
    session: null;
    loading: boolean;
    signUp: (email: string, password: string) => Promise<UserCredential>;
    signIn: (email: string, password: string) => Promise<UserCredential>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
};

export async function signUp(email: string, password: string) {
    return createUserWithEmailAndPassword(auth, email, password);
}

export async function signIn(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
}

export async function signOutUser() {
    await signOut(auth);
}

export async function sendResetEmail(email: string) {
    await sendPasswordResetEmail(auth, email);
}

export async function getCurrentSession() {
    return null;
}

export function onAuthChange(callback: AuthChangeCallback) {
    return onAuthStateChanged(auth, callback);
}

export function useAuth(): AdminAuth {
    const [user, setUser] = useState<User | null>(null);
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
            signUp,
            signIn,
            signOut: signOutUser,
            resetPassword: sendResetEmail,
        }),
        [user, loading]
    );
}

export function friendlySignInError(error: unknown): string {
    if (error instanceof FirebaseError) {
        switch (error.code) {
            case "auth/invalid-credential":
            case "auth/wrong-password":
            case "auth/user-not-found":
            case "auth/invalid-email":
                return "Invalid email or password.";
            case "auth/too-many-requests":
                return "Too many attempts. Try again in a moment.";
            case "auth/network-request-failed":
                return "Network error. Check your connection.";
        }
    }

    if (isNetworkError(error)) {
        return "Network error. Check your connection.";
    }

    return "Something went wrong. Please try again.";
}

export function friendlyResetError(error: unknown): string | null {
    if (error instanceof FirebaseError) {
        switch (error.code) {
            case "auth/user-not-found":
                return null;
            case "auth/invalid-email":
                return "Please enter a valid email address.";
            case "auth/too-many-requests":
                return "Too many attempts. Try again in a moment.";
            case "auth/network-request-failed":
                return "Network error. Check your connection.";
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
