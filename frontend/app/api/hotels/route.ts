import { proxyToFastApi } from "@/app/api/_proxy";

export async function GET(request: Request) {
  return proxyToFastApi(request, "/api/hotels");
}

export async function POST(request: Request) {
  return proxyToFastApi(request, "/api/hotels");
}
