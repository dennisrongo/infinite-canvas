import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use src directory
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
