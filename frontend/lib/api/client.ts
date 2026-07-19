export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

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
