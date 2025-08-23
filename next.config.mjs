/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Enhanced development configuration for better hot reload
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Enable hot module replacement
      config.resolve.symlinks = false;
      
      // Configure webpack dev server for better file watching
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: /node_modules/,
      };
    }
    return config;
  },
  // Development server configuration
  experimental: {
    // Enable turbo mode for faster development
    turbo: {},
  },
}

export default nextConfig