import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  compress: true,

  // Deploy under http://<host>/vcars
  basePath: "/vcars",

  // Nginx normalizes /vcars -> /vcars/.
  // Keep trailingSlash enabled to avoid redirect loops.
  trailingSlash: true,

  env: {
    NEXT_PUBLIC_BASE_PATH: "/vcars",
    // Browser traffic uses the same-origin proxy first. Set the real backend
    // URL only through each deployment environment.
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "",
  },

  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
      ],
    }];
  },
};

export default nextConfig;
