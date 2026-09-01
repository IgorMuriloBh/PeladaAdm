import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera um build enxuto e autossuficiente para rodar em container Docker
  output: "standalone",
};

export default nextConfig;
