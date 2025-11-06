/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@buzzer-network/contracts'],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    NEXT_PUBLIC_BASE_NETWORK: process.env.NEXT_PUBLIC_BASE_NETWORK || 'base-sepolia',
  },
  images: {
    domains: ['i.pinimg.com', 'media.licdn.com', 'pbs.twimg.com'],
    unoptimized: false,
    formats: ['image/avif', 'image/webp'],
  },
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  // Optimize chunk splitting
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-toast'],
  },
  webpack: (config, { isServer, webpack }) => {
    // Suppress optional dependency warnings (React Native and dev dependencies not needed for web)
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@react-native-async-storage/async-storage': false,
        'pino-pretty': false,
      };
    }
    
    // Ignore optional dependencies that cause warnings
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
    };
    
    // Suppress warnings for optional peer dependencies
    config.ignoreWarnings = [
      { module: /node_modules\/@metamask\/sdk/ },
      { module: /node_modules\/@walletconnect\/logger/ },
      { module: /node_modules\/pino/ },
    ];
    
    // Optimize chunk splitting - work with Next.js defaults, just add specific splits
    if (!isServer && config.optimization?.splitChunks) {
      const splitChunks = config.optimization.splitChunks;
      if (splitChunks.cacheGroups) {
        // Separate Three.js into its own chunk (loaded lazily)
        splitChunks.cacheGroups.three = {
          name: 'three',
          test: /[\\/]node_modules[\\/](three|@react-three)[\\/]/,
          priority: 30,
          reuseExistingChunk: true,
          chunks: 'async', // Only split async chunks (lazy loaded)
        };
      }
    }
    
    return config;
  },
};

module.exports = nextConfig;

