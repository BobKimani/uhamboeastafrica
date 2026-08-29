import { proxyToFastApi } from "@/app/api/_proxy";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  return proxyToFastApi(request, `/api/hotels/${id}`);
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  return proxyToFastApi(request, `/api/hotels/${id}`);
}
