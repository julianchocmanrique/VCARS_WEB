import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Deploy under http://<host>/vcars
  basePath: "/vcars",

  // Avoid redirect loops / blank transitions on client navigation.
  // Nginx already normalizes /vcars -> /vcars/.
  trailingSlash: false,

  env: {
    NEXT_PUBLIC_BASE_PATH: "/vcars",
  },
};

export default nextConfig;
