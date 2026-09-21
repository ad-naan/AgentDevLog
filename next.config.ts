import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 部署：输出独立运行时，镜像只打包 .next/standalone
  output: "standalone",
};

export default nextConfig;
