import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Enable server actions
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
  // Use standalone output for Docker
  output: process.env.NODE_ENV === "production" ? "standalone" : undefined,
};

export default nextConfig;
