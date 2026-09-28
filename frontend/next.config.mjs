/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // `next build` and `next dev` both own `.next`, and a running dev server holds
  // `.next/trace` open — so a build while the dev server is up dies with EPERM on
  // Windows. Setting NEXT_DIST_DIR lets the build write somewhere else instead of
  // fighting over the directory (or requiring the dev server to be stopped).
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  experimental: {
    cpus: 4,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
