/** @type {import('next').NextConfig} */
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  poweredByHeader: false,
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
  experimental: {
    optimizePackageImports: ['@sentry/nextjs'],
    isrMemoryCacheSize: 0,
  },
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
  webpack: (config, { isServer }) => {
    return config;
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG ?? 'tradezen',
  project: process.env.SENTRY_PROJECT ?? 'web',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
});
