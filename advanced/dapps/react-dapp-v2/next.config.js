const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: "build",
  transpilePackages: ["@web-examples/shared"],
  webpack(config) {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };

    // Resolve @web-examples/shared to TypeScript source files for direct transpilation
    const sharedPath = path.resolve(__dirname, "../../../shared");
    config.resolve.alias = {
      ...config.resolve.alias,
      "@web-examples/shared": sharedPath,
    };

    // Enable WebAssembly support for packages like tiny-secp256k1
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    return config;
  },
};

module.exports = nextConfig;
