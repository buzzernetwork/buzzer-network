/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@buzzer-network/contracts'],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    NEXT_PUBLIC_BASE_NETWORK: process.env.NEXT_PUBLIC_BASE_NETWORK || 'base-sepolia',
  },
};

module.exports = nextConfig;

