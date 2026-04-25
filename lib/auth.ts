import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    onAuthStateChanged,
    type User,
    type Auth,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { app } from "@/lib/firebase";

export const auth: Auth = getAuth(app);

export function signIn(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
}

export function signOutUser() {
    return signOut(auth);
}

export function sendResetEmail(email: string) {
    return sendPasswordResetEmail(auth, email);
}

export function onAuthChange(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
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
    return "Something went wrong. Please try again.";
}
