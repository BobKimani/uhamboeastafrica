import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "source.unsplash.com" },
      { protocol: "https", hostname: "d2fbz2lzk71lum.cloudfront.net", pathname: "/**" },
    ],
  },
  async rewrites() {
    const backendApiUrl =
      process.env.BACKEND_API_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://localhost:8000";

    return {
      beforeFiles: [
        {
          source: "/api/:path*",
          destination: `${backendApiUrl}/api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
