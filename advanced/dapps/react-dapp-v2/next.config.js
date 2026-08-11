/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: "build",
  // Stable styled-components class names across server/client so the themed
  // (ThemeProvider-driven) swap screen doesn't hydrate-mismatch and drop styles.
  compiler: {
    styledComponents: true,
  },
  transpilePackages: ["@mysten/sui"],
  webpack(config) {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };

    return config;
  },
};

export default nextConfig;
