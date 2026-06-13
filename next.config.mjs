const repoName = "AuraCut";
const basePath = process.env.GITHUB_ACTIONS === "true" ? `/${repoName}` : "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  assetPrefix: basePath || undefined,
  basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath
  },
  images: {
    unoptimized: true
  },
  output: "export",
  trailingSlash: true
};

export default nextConfig;
