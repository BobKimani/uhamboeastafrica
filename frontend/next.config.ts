import type { NextConfig } from "next";

type RemotePattern = NonNullable<
  NonNullable<NextConfig["images"]>["remotePatterns"]
>[number];

const DEFAULT_MEDIA_URL = "https://api.uhamboeastafrica.com/media";

// Server-side URL used for the /api rewrite. On the VPS this can point at the
// FastAPI container over the Docker network (e.g. http://backend:8000);
// otherwise it falls back to the public API URL. `||` so empty build args are ignored.
const backendApiUrl =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development" ? "http://localhost:8000" : undefined);

if (!backendApiUrl) {
  throw new Error("NEXT_PUBLIC_API_URL is required in production");
}

// Allow next/image to optimize media served from NEXT_PUBLIC_MEDIA_URL
// (locally hosted on the VPS), plus the production media host as a fallback.
function mediaRemotePattern(rawUrl: string): RemotePattern | null {
  try {
    const url = new URL(rawUrl);
    const basePath = url.pathname.replace(/\/+$/, "");
    return {
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
      ...(url.port ? { port: url.port } : {}),
      pathname: `${basePath}/**`,
    };
  } catch {
    return null;
  }
}

const mediaPatterns = [
  ...new Set([process.env.NEXT_PUBLIC_MEDIA_URL || DEFAULT_MEDIA_URL, DEFAULT_MEDIA_URL]),
]
  .map(mediaRemotePattern)
  .filter((pattern): pattern is RemotePattern => pattern !== null);

const nextConfig: NextConfig = {
  // Standalone output for self-hosting in Docker; Vercel builds still use its default.
  output: process.env.VERCEL ? undefined : "standalone",

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "source.unsplash.com" },
      ...mediaPatterns,
    ],
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/api/:path*",
          destination: `${backendApiUrl.replace(/\/+$/, "")}/api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
