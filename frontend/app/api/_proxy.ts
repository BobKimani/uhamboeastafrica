const FASTAPI_BASE_URL =
  process.env.BACKEND_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://127.0.0.1:8000";

export async function proxyToFastApi(request: Request, path: string) {
  const incomingUrl = new URL(request.url);
  const targetUrl = new URL(path, FASTAPI_BASE_URL);
  targetUrl.search = incomingUrl.search;

  const headers = new Headers();
  const authorization = request.headers.get("authorization");
  const contentType = request.headers.get("content-type");

  if (authorization) headers.set("authorization", authorization);
  if (contentType) headers.set("content-type", contentType);

  const hasBody = !["GET", "HEAD"].includes(request.method);
  const body = hasBody ? await request.text() : undefined;

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: body || undefined,
    cache: "no-store",
  });

  return new Response(await response.arrayBuffer(), {
    status: response.status,
    headers: {
      "content-type":
        response.headers.get("content-type") ?? "application/json",
    },
  });
}
