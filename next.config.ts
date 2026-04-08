import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Deploy under http://<host>/vcars
  basePath: "/vcars",
  assetPrefix: "/vcars/",
  trailingSlash: true,
};

export default nextConfig;
