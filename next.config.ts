import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // pdfjs-dist tries to import node 'canvas' which doesn't exist in browser
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
