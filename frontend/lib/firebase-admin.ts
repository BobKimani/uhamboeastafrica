import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function formatPrivateKey(key: string | undefined) {
    if (!key) {
        throw new Error("Missing FIREBASE_PRIVATE_KEY");
    }

    let k = key.trim();

    // Strip a single trailing comma left over from a misformatted .env line.
    if (k.endsWith(",")) k = k.slice(0, -1).trim();

    // Strip wrapping quotes if a dotenv loader passed them through.
    if (
        (k.startsWith('"') && k.endsWith('"')) ||
        (k.startsWith("'") && k.endsWith("'"))
    ) {
        k = k.slice(1, -1);
    }

    // Convert literal "\n" escape sequences into real newlines (idempotent when
    // the loader has already expanded them).
    k = k.replace(/\\n/g, "\n");

    if (!k.includes("BEGIN PRIVATE KEY")) {
        throw new Error(
            "FIREBASE_PRIVATE_KEY does not look like a PEM key — check the .env value"
        );
    }

    return k;
}

let cachedApp: App | null = null;

function getAdminApp(): App {
    if (cachedApp) return cachedApp;

    const existing = getApps();
    if (existing.length > 0) {
        cachedApp = existing[0];
        return cachedApp;
    }

    cachedApp = initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY),
        }),
    });
    return cachedApp;
}

export function getAdminAuth(): Auth {
    return getAuth(getAdminApp());
}

export function getAdminDb(): Firestore {
    return getFirestore(getAdminApp());
}
