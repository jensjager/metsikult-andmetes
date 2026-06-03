import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_ACTIONS === "true" || process.env.USE_GITHUB_PATH === "true";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isGithubPages ? "/metsikult-andmetes" : "",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
