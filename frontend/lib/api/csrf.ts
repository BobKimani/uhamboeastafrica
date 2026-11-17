import { apiUrl } from "@/lib/api/client";

// Per-session CSRF token for authenticated admin requests. Kept in memory only
// (never localStorage); the session itself lives in the HttpOnly cookie.
let csrfToken: string | null = null;

export function setCsrfToken(token: string | null | undefined) {
  csrfToken = token || null;
}

async function loadCsrfToken(): Promise<string | null> {
  const response = await fetch(apiUrl("/auth/me"), {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) return null;
  const result = (await response.json().catch(() => null)) as {
    csrfToken?: string;
  } | null;
  return result?.csrfToken ?? null;
}

/** Headers for state-changing admin requests (POST/PATCH/DELETE). */
export async function csrfHeaders(): Promise<Record<string, string>> {
  if (!csrfToken) {
    setCsrfToken(await loadCsrfToken());
  }
  return csrfToken ? { "X-CSRF-Token": csrfToken } : {};
}
