import { proxyToFastApi } from "@/app/api/_proxy";

type Params = {
  params: Promise<{ id: string }>;
};

// TODO: Remove this proxy after frontend calls FastAPI directly in all environments.
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  return proxyToFastApi(request, `/api/inquiries/${id}`);
}

// TODO: Remove this proxy after frontend calls FastAPI directly in all environments.
export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  return proxyToFastApi(request, `/api/inquiries/${id}`);
}
