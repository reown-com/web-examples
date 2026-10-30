/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Same styled-components class names on the server and the client, so hydration keeps the styles
  compiler: { styledComponents: true },
  distDir: "build",
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
