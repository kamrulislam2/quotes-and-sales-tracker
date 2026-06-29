import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  async rewrites() {
    return [
      {
        source: '/api-proxy/ip2location/:path*',
        destination: 'https://api.ip2location.io/:path*',
      },
      {
        source: '/api-proxy/criminalip/:path*',
        destination: 'https://api.criminalip.io/:path*',
      }
    ];
  }
};

export default nextConfig;
