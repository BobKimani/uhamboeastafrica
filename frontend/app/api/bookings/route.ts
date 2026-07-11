import { proxyToFastApi } from "@/app/api/_proxy";

// TODO: Remove this proxy after frontend calls FastAPI directly in all environments.
export async function GET(request: Request) {
  return proxyToFastApi(request, "/api/bookings");
}

// TODO: Remove this proxy after frontend calls FastAPI directly in all environments.
export async function POST(request: Request) {
  return proxyToFastApi(request, "/api/bookings");
}
