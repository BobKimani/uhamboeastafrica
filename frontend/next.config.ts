import type { NextConfig } from "next";

const backendApiUrl =
  process.env.BACKEND_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "development" ? "http://localhost:8000" : undefined);

if (!backendApiUrl) {
  throw new Error("NEXT_PUBLIC_API_URL is required in production");
}

const nextConfig: NextConfig = {
  output: process.env.VERCEL ? undefined : "standalone",
  
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "source.unsplash.com" },
      { protocol: "https", hostname: "d2fbz2lzk71lum.cloudfront.net", pathname: "/**" },
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
