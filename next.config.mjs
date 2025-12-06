/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {},
  webpack: (config, { isServer }) => {
    // Ignore certain CSS-in-JS related warnings
    if (!isServer) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: /node_modules/,
      }
    }
    return config
  },
}

export default nextConfig
