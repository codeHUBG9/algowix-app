/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 21-Deployment.md §2 — standalone output lets the Docker image copy just
  // .next/standalone + .next/static instead of the full node_modules tree.
  output: "standalone",
  // @algowix/shared-types is consumed straight from its .ts source (no build
  // step) and, per Node's NodeNext module resolution, re-exports its files
  // with explicit .js specifiers even though the files on disk are .ts.
  // webpack doesn't do that TS-specific extension swap by default — this
  // alias teaches it to, matching what tsx/node's ESM loader already do.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default nextConfig;
