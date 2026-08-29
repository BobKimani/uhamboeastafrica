import { proxyToFastApi } from "@/app/api/_proxy";

export async function POST(request: Request) {
  return proxyToFastApi(request, "/api/uploads/catalog-image");
}
