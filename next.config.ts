import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Deploy under http://<host>/vcars
  basePath: "/vcars",

  // Nginx normalizes /vcars -> /vcars/.
  // Keep trailingSlash enabled to avoid redirect loops.
  trailingSlash: true,

  env: {
    NEXT_PUBLIC_BASE_PATH: "/vcars",
  },
};

export default nextConfig;
