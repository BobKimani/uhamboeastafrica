const DEVELOPMENT_API_URL = "http://localhost:8000";
const PRODUCTION_API_URL_ERROR = "NEXT_PUBLIC_API_URL is required in production";

type ResolveApiBaseUrlOptions = {
  value?: string;
  errorMessage?: string;
};

export function resolveApiBaseUrl({
  value,
  errorMessage = PRODUCTION_API_URL_ERROR,
}: ResolveApiBaseUrlOptions = {}) {
  const apiUrl =
    value ?? (process.env.NODE_ENV === "development" ? DEVELOPMENT_API_URL : undefined);

  if (!apiUrl) {
    throw new Error(errorMessage);
  }

  return apiUrl.replace(/\/+$/, "");
}
