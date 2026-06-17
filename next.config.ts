import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/parking-web",
  images: {
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
  },
};

export default nextConfig;
