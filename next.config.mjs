/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Use asset modules for GLSL files (newer approach that works better with Next.js)
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Add rule to handle shader files using asset/source type
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      type: 'asset/source',
    });
    return config;
  },
};

export default nextConfig;