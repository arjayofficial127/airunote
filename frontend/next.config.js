/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The shared appearance contract lives outside the frontend install root.
  webpack: (config) => {
    config.resolve.alias.zod = require.resolve('zod');
    return config;
  },
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_UPLOADTHING_APP_ID: process.env.NEXT_PUBLIC_UPLOADTHING_APP_ID,
  },
  typescript: {
    // Treat type errors as build errors
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;

