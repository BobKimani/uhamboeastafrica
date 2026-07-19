import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "source.unsplash.com" },
    ],
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/api/:path*",
          destination: `${
            process.env.BACKEND_API_URL ??
            process.env.NEXT_PUBLIC_API_URL ??
            "http://127.0.0.1:8000"
          }/api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
