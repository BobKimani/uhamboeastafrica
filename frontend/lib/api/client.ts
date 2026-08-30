import { resolveApiBaseUrl } from "./base-url";

export const API_BASE_URL = resolveApiBaseUrl({
  value: process.env.NEXT_PUBLIC_API_URL,
});

if (process.env.NODE_ENV !== "production") {
  console.info("[auth] API base URL:", API_BASE_URL);
}

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function readJson<T>(
  response: Response,
  fallbackMessage: string
): Promise<T> {
  const text = await response.text();
  let result: { error?: string } = {};

  if (text) {
    try {
      result = JSON.parse(text);
    } catch {
      throw new Error(
        response.ok
          ? "Server returned an invalid response"
          : text.slice(0, 300)
      );
    }
  }

  if (!response.ok) {
    throw new Error(result.error || fallbackMessage);
  }

  return result as T;
}
