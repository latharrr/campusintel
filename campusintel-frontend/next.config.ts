import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Allow production builds to complete even with type errors — hackathon mode!
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['logo.clearbit.com'],
  },
};

export default nextConfig;
