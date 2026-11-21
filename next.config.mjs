/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typescript: {
    // Allows type checking via npm run typecheck with dedicated memory instead of stalling dev server
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
